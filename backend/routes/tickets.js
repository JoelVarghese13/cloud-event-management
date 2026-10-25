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

// POST /api/tickets/book - Book tickets for an event
router.post('/book', verifyToken, async (req, res) => {
  try {
    const { event_id, quantity = 1 } = req.body;
    const qty = parseInt(quantity, 10) || 1;

    if (!event_id || qty <= 0) {
      return res.status(400).json({ error: 'Valid event_id and positive quantity are required.' });
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
        error: `Insufficient tickets. Only ${event.available_tickets} ticket(s) remaining.`
      });
    }

    // 2. Generate unique Ticket Code
    const ticketCode = `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

    // 3. Insert Ticket with PENDING status
    const [insertResult] = await query(
      `INSERT INTO tickets 
       (ticket_code, event_id, user_id, attendee_name, attendee_email, quantity, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [ticketCode, event.id, req.user.id, req.user.name, req.user.email, qty]
    );

    const ticketId = insertResult.insertId;

    // 4. Atomically decrement available tickets in database
    await query(
      'UPDATE events SET available_tickets = available_tickets - ? WHERE id = ?',
      [qty, event.id]
    );

    // 5. Send message to Amazon SQS for serverless asynchronous processing by Lambda & SNS
    const sqsPayload = {
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
      created_at: new Date().toISOString()
    };

    try {
      await sendToSQS(sqsPayload);
      console.log(`[SQS] Dispatched registration message for ticket ${ticketCode} to queue.`);
    } catch (sqsErr) {
      console.error(`[SQS] Error publishing message to SQS: ${sqsErr.message}`);
      // Don't fail the request completely; the ticket is recorded in MySQL
    }

    res.status(201).json({
      message: 'Ticket reservation placed! Processing via serverless queue for instant confirmation.',
      ticket: {
        id: ticketId,
        ticket_code: ticketCode,
        event_title: event.title,
        quantity: qty,
        status: 'PENDING'
      }
    });
  } catch (err) {
    console.error('Ticket booking error:', err);
    res.status(500).json({ error: 'Failed to complete ticket reservation.' });
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
