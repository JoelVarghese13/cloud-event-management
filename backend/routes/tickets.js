const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { query } = require('../db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const region = process.env.AWS_REGION || 'ap-south-1';
const sqs = new SQSClient({ region });
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

// Helper function to send message to AWS SQS
async function sendToSQS(payload) {
  if (!SQS_QUEUE_URL) {
    console.warn('[SQS] Notice: SQS_QUEUE_URL is not set in environment. Skipping AWS SQS push (mocking async queue).');
    return { mock: true };
  }

  const params = {
    QueueUrl: SQS_QUEUE_URL,
    MessageBody: JSON.stringify(payload),
    MessageAttributes: {
      EventType: {
        DataType: 'String',
        StringValue: 'TicketRegistration'
      }
    }
  };

  return sqs.send(new SendMessageCommand(params));
}

// POST /api/tickets/book - Book tickets with interactive seat selection
router.post('/book', verifyToken, async (req, res) => {
  try {
    const { event_id, quantity = 1, seats } = req.body;

    // Normalize selected seats if provided (BookMyShow style)
    let selectedSeats = [];
    if (Array.isArray(seats)) {
      selectedSeats = seats.map(s => String(s).trim().toUpperCase()).filter(Boolean);
    } else if (typeof seats === 'string' && seats.trim().length > 0) {
      selectedSeats = seats.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }

    const qty = selectedSeats.length > 0 ? selectedSeats.length : (parseInt(quantity, 10) || 1);

    if (!event_id || qty <= 0) {
      return res.status(400).json({ error: 'Valid event_id and positive seat quantity are required.' });
    }

    // 1. Check event existence and availability
    const [events] = await query(
      'SELECT id, title, date, time, location, available_tickets FROM events WHERE id = ?',
      [event_id]
    );

    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const event = events[0];
    if (event.available_tickets < qty) {
      return res.status(400).json({
        error: `Insufficient tickets. Only ${event.available_tickets} seat(s) remaining.`
      });
    }

    // 2. If specific seats are selected, ensure none are already booked (BookMyShow collision protection)
    const seatsString = selectedSeats.length > 0 ? selectedSeats.join(', ') : null;
    if (selectedSeats.length > 0) {
      const [existingTickets] = await query(
        `SELECT seats FROM tickets WHERE event_id = ? AND status != 'CANCELLED' AND seats IS NOT NULL AND seats != ''`,
        [event.id]
      );

      const alreadyBooked = new Set();
      for (const t of existingTickets) {
        if (t.seats) {
          t.seats.split(',').map(s => s.trim().toUpperCase()).forEach(s => alreadyBooked.add(s));
        }
      }

      const conflicts = selectedSeats.filter(s => alreadyBooked.has(s));
      if (conflicts.length > 0) {
        return res.status(409).json({
          error: `The following seat(s) were just booked by another attendee: ${conflicts.join(', ')}. Please select available seats.`
        });
      }
    }

    // 3. Generate unique Ticket Code
    const ticketCode = `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

    // 4. Insert Ticket with PENDING status and assigned seats
    const [insertResult] = await query(
      `INSERT INTO tickets 
       (ticket_code, event_id, user_id, attendee_name, attendee_email, quantity, seats, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [ticketCode, event.id, req.user.id, req.user.name, req.user.email, qty, seatsString]
    );

    const ticketId = insertResult.insertId;

    // 5. Atomically decrement available tickets in database
    await query(
      'UPDATE events SET available_tickets = available_tickets - ? WHERE id = ?',
      [qty, event.id]
    );

    // 6. Send message to Amazon SQS for serverless asynchronous processing by Lambda & SNS
    const sqsPayload = {
      event_type: 'TicketRegistration',
      ticket_id: ticketId,
      ticket_code: ticketCode,
      event_id: event.id,
      event_title: event.title,
      event_date: event.date,
      event_location: event.location,
      user_id: req.user.id,
      attendee_name: req.user.name,
      attendee_email: req.user.email,
      quantity: qty,
      seats: seatsString,
      created_at: new Date().toISOString()
    };

    try {
      await sendToSQS(sqsPayload);
      console.log(`[SQS] Dispatched registration message for ticket ${ticketCode} to queue.`);
    } catch (sqsErr) {
      console.error(`[SQS] Error publishing message to SQS: ${sqsErr.message}`);
    }

    res.status(201).json({
      message: 'Ticket reservation placed! Processing via serverless queue for instant confirmation.',
      ticket: {
        id: ticketId,
        ticket_code: ticketCode,
        event_title: event.title,
        quantity: qty,
        seats: seatsString,
        status: 'PENDING'
      }
    });
  } catch (err) {
    console.error('Ticket booking error:', err);
    res.status(500).json({ error: 'Failed to complete ticket reservation.' });
  }
});

// POST /api/tickets/:id/cancel - Cancel booked ticket and release seats
router.post('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const ticketId = req.params.id;

    // 1. Fetch ticket and verify ownership
    const [tickets] = await query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const ticket = tickets[0];
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to cancel this ticket.' });
    }

    if (ticket.status === 'CANCELLED') {
      return res.status(400).json({ error: 'This ticket has already been cancelled.' });
    }

    // 2. Fetch event title for notification
    const [events] = await query('SELECT title, date, location FROM events WHERE id = ?', [ticket.event_id]);
    const event = events[0] || {};

    // 3. Mark ticket as CANCELLED in database
    await query('UPDATE tickets SET status = "CANCELLED" WHERE id = ?', [ticketId]);

    // 4. Return seats back to the event pool
    await query(
      'UPDATE events SET available_tickets = available_tickets + ? WHERE id = ?',
      [ticket.quantity, ticket.event_id]
    );

    // 5. Notify SQS and SNS of ticket cancellation
    try {
      await sendToSQS({
        event_type: 'TicketCancellation',
        ticket_id: ticket.id,
        ticket_code: ticket.ticket_code,
        event_id: ticket.event_id,
        event_title: event.title || 'Campus Event',
        user_id: ticket.user_id,
        attendee_name: ticket.attendee_name,
        attendee_email: ticket.attendee_email,
        quantity: ticket.quantity,
        seats: ticket.seats,
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString()
      });
      console.log(`[SQS] Dispatched cancellation notice for ticket ${ticket.ticket_code}.`);
    } catch (sqsErr) {
      console.warn(`[SQS] Cancellation message notice warning: ${sqsErr.message}`);
    }

    res.json({
      message: 'Ticket reservation cancelled successfully. Your seats have been released back to the event pool.',
      ticket_id: ticketId,
      status: 'CANCELLED'
    });
  } catch (err) {
    console.error('Cancel ticket error:', err);
    res.status(500).json({ error: 'Failed to cancel ticket reservation.' });
  }
});

// POST /api/tickets/:id/cancel-seat - Cancel an individual seat from a ticket pass
router.post('/:id/cancel-seat', verifyToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { seat } = req.body;

    if (!seat) {
      return res.status(400).json({ error: 'Seat identifier is required (e.g. A1).' });
    }

    const targetSeat = String(seat).trim().toUpperCase();

    // 1. Fetch ticket
    const [tickets] = await query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket pass not found.' });
    }

    const ticket = tickets[0];
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to modify this ticket pass.' });
    }

    if (ticket.status === 'CANCELLED') {
      return res.status(400).json({ error: 'This ticket has already been completely cancelled.' });
    }

    // 2. Parse current seats
    let currentSeats = [];
    if (ticket.seats) {
      currentSeats = ticket.seats.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }

    if (!currentSeats.includes(targetSeat)) {
      return res.status(400).json({ error: `Seat ${targetSeat} is not assigned to this ticket pass.` });
    }

    // 3. Remove target seat
    const remainingSeats = currentSeats.filter(s => s !== targetSeat);
    const newQty = remainingSeats.length;
    const newStatus = newQty === 0 ? 'CANCELLED' : ticket.status;
    const newSeatsStr = remainingSeats.length > 0 ? remainingSeats.join(', ') : null;

    // 4. Update ticket in DB
    await query(
      'UPDATE tickets SET seats = ?, quantity = ?, status = ? WHERE id = ?',
      [newSeatsStr, newQty, newStatus, ticketId]
    );

    // 5. Restore 1 seat to the event available tickets count
    await query('UPDATE events SET available_tickets = available_tickets + 1 WHERE id = ?', [ticket.event_id]);

    // 6. Send SQS cancellation notice for this specific seat
    try {
      await sendToSQS({
        event_type: 'SeatCancellation',
        ticket_id: ticket.id,
        ticket_code: ticket.ticket_code,
        event_id: ticket.event_id,
        attendee_name: ticket.attendee_name,
        attendee_email: ticket.attendee_email,
        cancelled_seat: targetSeat,
        remaining_seats: newSeatsStr,
        quantity: newQty,
        status: newStatus,
        timestamp: new Date().toISOString()
      });
      console.log(`[SQS] Dispatched seat cancellation notice for seat ${targetSeat} on ticket ${ticket.ticket_code}.`);
    } catch (sqsErr) {
      console.warn('[SQS] Seat cancellation notice warning:', sqsErr.message);
    }

    res.json({
      message: `Seat ${targetSeat} has been cancelled and released back to the event pool.`,
      cancelledSeat: targetSeat,
      remainingSeats,
      quantity: newQty,
      status: newStatus,
      ticket_id: ticketId
    });
  } catch (err) {
    console.error('Cancel seat error:', err);
    res.status(500).json({ error: 'Failed to cancel individual seat.' });
  }
});

// POST /api/tickets/check-in - Verify and check in attendee at gate (Organizer perk)
router.post('/check-in', verifyToken, requireRole(['organizer', 'admin']), async (req, res) => {
  try {
    const { ticket_code, admit = false } = req.body;
    if (!ticket_code) {
      return res.status(400).json({ error: 'Ticket code is required.' });
    }

    const [rows] = await query(
      `SELECT t.*, e.title as event_title, e.date as event_date, e.time as event_time, e.location as event_location, e.organizer_id 
       FROM tickets t 
       JOIN events e ON t.event_id = e.id 
       WHERE t.ticket_code = ? LIMIT 1`,
      [ticket_code.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invalid Ticket Code. No reservation found in database.' });
    }

    const ticket = rows[0];
    if (ticket.status === 'CANCELLED') {
      return res.status(400).json({
        valid: false,
        error: 'Entry Denied: This ticket was CANCELLED and seats were released.',
        ticket: {
          ticket_code: ticket.ticket_code,
          attendee_name: ticket.attendee_name,
          event_title: ticket.event_title,
          status: 'CANCELLED'
        }
      });
    }

    const alreadyCheckedIn = ticket.status === 'CHECKED_IN';

    // If organizer requested to admit attendee
    if (admit && !alreadyCheckedIn) {
      await query('UPDATE tickets SET status = "CHECKED_IN" WHERE id = ?', [ticket.id]);
      ticket.status = 'CHECKED_IN';
    }

    res.json({
      valid: true,
      alreadyCheckedIn,
      message: alreadyCheckedIn 
        ? `⚠️ Warning: ${ticket.attendee_name} has already been admitted.`
        : `Entry Approved for ${ticket.attendee_name}!`,
      ticket: {
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        attendee_name: ticket.attendee_name,
        attendee_email: ticket.attendee_email,
        event_title: ticket.event_title,
        event_date: ticket.event_date,
        event_location: ticket.event_location,
        seats: ticket.seats,
        quantity: ticket.quantity,
        status: ticket.status
      }
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Failed to verify ticket.' });
  }
});


// GET /api/tickets/my-tickets - List tickets of logged-in attendee
router.get('/my-tickets', verifyToken, async (req, res) => {
  try {
    const [tickets] = await query(
      `SELECT t.*, e.title as event_title, e.date as event_date, e.time as event_time, 
              e.location as event_location, e.flyer_url as event_flyer
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );

    res.json({ tickets });
  } catch (err) {
    console.error('Fetch my-tickets error:', err);
    res.status(500).json({ error: 'Failed to retrieve your tickets.' });
  }
});

// GET /api/tickets/event/:eventId - List attendees for an event (organizer only)
router.get('/event/:eventId', verifyToken, requireRole(['organizer', 'admin']), async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Verify ownership
    const [events] = await query('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const [tickets] = await query(
      `SELECT t.id, t.ticket_code, t.attendee_name, t.attendee_email, t.quantity, t.status, t.created_at 
       FROM tickets t 
       WHERE t.event_id = ? 
       ORDER BY t.created_at DESC`,
      [eventId]
    );

    res.json({ tickets });
  } catch (err) {
    console.error('Fetch event tickets error:', err);
    res.status(500).json({ error: 'Failed to retrieve attendees list.' });
  }
});

// PATCH /api/tickets/:id/confirm - Update ticket status (used by worker or admin)
router.patch('/:id/confirm', async (req, res) => {
  try {
    const ticketId = req.params.id;
    await query('UPDATE tickets SET status = "CONFIRMED" WHERE id = ?', [ticketId]);
    res.json({ message: 'Ticket confirmed successfully.' });
  } catch (err) {
    console.error('Confirm ticket error:', err);
    res.status(500).json({ error: 'Failed to update ticket status.' });
  }
});

module.exports = router;
