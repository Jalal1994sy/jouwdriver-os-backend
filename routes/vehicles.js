const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/create', auth('admin'), async (req, res) => {
  try {
    const { companyId } = req.user;
    const { plate, driver_pass } = req.body || {};
    if (!plate) {
      return res.status(400).json({ error: 'plate required' });
    }
    const r = await db.query(
      `INSERT INTO vehicles (company_id, plate, driver_pass)
       VALUES ($1, $2, $3)
       ON CONFLICT (company_id, plate) DO UPDATE
         SET driver_pass = EXCLUDED.driver_pass,
             active = TRUE
       RETURNING *`,
      [companyId, plate, driver_pass || null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Vehicle create error:', err);
    res.status(500).json({ error: 'Vehicle create failed' });
  }
});

router.get('/list', auth(), async (req, res) => {
  try {
    const { companyId } = req.user;
    const r = await db.query(
      `SELECT * FROM vehicles
       WHERE company_id = $1
       ORDER BY id`,
      [companyId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Vehicle list error:', err);
    res.status(500).json({ error: 'Vehicle list failed' });
  }
});

module.exports = router;
