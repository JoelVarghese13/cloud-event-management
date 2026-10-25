const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { query } = require('../db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const region = process.env.AWS_REGION || 'ap-south-1';
const s3 = new S3Client({ region });
const FLYERS_BUCKET = process.env.FLYERS_BUCKET || 'event-mgmt-flyers-default';

// Multer in-memory storage for handling flyer image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET /api/events - List all events
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT e.*, u.name as organizer_name, u.email as organizer_email 
      FROM events e 
      JOIN users u ON e.organizer_id = u.id 
    `;
    const params = [];

    if (search) {
      sql += ` WHERE e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY e.date ASC`;

    const [rows] = await query(sql, params);
    res.json({ events: rows });
  } catch (err) {
    console.error('Fetch events error:', err);
    res.status(500).json({ error: 'Failed to retrieve events.' });
  }
});

// GET /api/events/:id - Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT e.*, u.name as organizer_name, u.email as organizer_email 
       FROM events e 
       JOIN users u ON e.organizer_id = u.id 
       WHERE e.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    res.json({ event: rows[0] });
  } catch (err) {
    console.error('Fetch single event error:', err);
    res.status(500).json({ error: 'Failed to retrieve event.' });
  }
});

// POST /api/events - Create new event (organizer or admin only)
router.post('/', verifyToken, requireRole(['organizer', 'admin']), upload.single('flyer'), async (req, res) => {
  try {
    const { title, description, date, time, location, capacity, ticket_price } = req.body;

    if (!title || !description || !date || !time || !location || !capacity) {
      return res.status(400).json({ error: 'Please provide all required event details.' });
    }

    let flyerUrl = null;

    // Upload to Amazon S3 if file provided
    if (req.file) {
      const fileKey = `flyers/${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: FLYERS_BUCKET,
            Key: fileKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
          })
        );
        flyerUrl = `https://${FLYERS_BUCKET}.s3.${region}.amazonaws.com/${fileKey}`;
        console.log(`[S3] Uploaded flyer successfully: ${flyerUrl}`);
      } catch (s3Err) {
        console.warn(`[S3] Warning: Flyer upload to S3 failed: ${s3Err.message}. Storing placeholder.`);
        flyerUrl = `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800`;
      }
    } else if (req.body.flyer_url) {
      flyerUrl = req.body.flyer_url;
    } else {
      flyerUrl = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
    }

    const availableTickets = parseInt(capacity, 10);
    const price = parseFloat(ticket_price) || 0.00;

    const [result] = await query(
      `INSERT INTO events 
       (title, description, date, time, location, capacity, available_tickets, ticket_price, flyer_url, organizer_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, date, time, location, capacity, availableTickets, price, flyerUrl, req.user.id]
    );

    res.status(201).json({
      message: 'Event created successfully',
      eventId: result.insertId,
      flyerUrl
    });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event.' });
  }
});

// DELETE /api/events/:id - Delete event
router.delete('/:id', verifyToken, requireRole(['organizer', 'admin']), async (req, res) => {
  try {
    const eventId = req.params.id;

    // Check ownership
    const [events] = await query('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to delete this event.' });
    }

    await query('DELETE FROM events WHERE id = ?', [eventId]);
    res.json({ message: 'Event deleted successfully.' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
});

module.exports = router;
