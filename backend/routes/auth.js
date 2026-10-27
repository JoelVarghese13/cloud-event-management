const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { verifyToken, JWT_SECRET } = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, organizer_passcode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    let assignedRole = 'attendee';
    if (role === 'organizer') {
      if (organizer_passcode !== 'CAMPUS2026' && organizer_passcode !== 'FACULTY') {
        return res.status(403).json({
          error: 'Invalid Organizer Passcode. Students have Attendee access. Enter passcode CAMPUS2026 if you are authorized faculty or club head.',
          code: 'INVALID_ORGANIZER_PASSCODE'
        });
      }
      assignedRole = 'organizer';
    }

    // Check existing user
    const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({
        error: 'An account with this email already exists.',
        code: 'EMAIL_EXISTS',
        email
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, assignedRole]
    );

    const userId = result.insertId;
    const token = jwt.sign(
      { id: userId, name, email, role: assignedRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, name, email, role: assignedRole }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error while registering user.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [rows] = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // If user provided organizer passcode on login, upgrade their role
    let currentRole = user.role;
    if (req.body.organizer_passcode === 'CAMPUS2026' || req.body.organizer_passcode === 'FACULTY') {
      if (currentRole === 'attendee') {
        await query('UPDATE users SET role = "organizer" WHERE id = ?', [user.id]);
        currentRole = 'organizer';
      }
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: currentRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: currentRole }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/claim-organizer - Allows authenticated attendee to unlock organizer privileges
router.post('/claim-organizer', verifyToken, async (req, res) => {
  try {
    const { organizer_passcode } = req.body;
    if (organizer_passcode !== 'CAMPUS2026' && organizer_passcode !== 'FACULTY') {
      return res.status(403).json({
        error: 'Invalid passcode. Enter CAMPUS2026 to unlock organizer privileges.',
        code: 'INVALID_ORGANIZER_PASSCODE'
      });
    }

    await query('UPDATE users SET role = "organizer" WHERE id = ?', [req.user.id]);

    const updatedUser = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: 'organizer'
    };

    const token = jwt.sign(updatedUser, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Organizer privileges unlocked! You can now publish events, manage rosters, and verify tickets.',
      token,
      user: updatedUser
    });
  } catch (err) {
    console.error('Claim organizer error:', err);
    res.status(500).json({ error: 'Failed to upgrade role.' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

