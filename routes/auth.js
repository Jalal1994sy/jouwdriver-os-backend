const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Register new company + admin user
router.post('/register', async (req, res) => {
  const client = await db.query('SELECT 1').catch(() => null); // simple connectivity check ignored
  try {
    const { companyName, kbo, email, password, name } = req.body || {};

    if (!companyName || !kbo || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Use simple transaction with BEGIN/COMMIT
    await db.query('BEGIN');

    const cRes = await db.query(
      `INSERT INTO companies (name, kbo, email)
       VALUES ($1, $2, $3)
       RETURNING id, name, kbo`,
      [companyName, kbo, email]
    );
    const company = cRes.rows[0];

    const uRes = await db.query(
      `INSERT INTO users (company_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, name, email, role`,
      [company.id, name || companyName, email, hashed]
    );
    const user = uRes.rows[0];

    await db.query('COMMIT');

    const token = jwt.sign(
      { userId: user.id, companyId: company.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user, company });
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch (e) {}
    console.error('Register error:', err);
    res.status(500).json({ error: 'Register failed' });
  }
});

// Login for admin or driver
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const r = await db.query(
      `SELECT u.id, u.company_id, u.name, u.email, u.role, u.password_hash,
              c.name AS company_name
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1`,
      [email]
    );

    if (!r.rows.length) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, companyId: user.company_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete user.password_hash;

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      company: {
        id: user.company_id,
        name: user.company_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
