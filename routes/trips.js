const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Simple start endpoint (optional if using direct Chiron integration only)
router.post('/start', auth('driver'), async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const { vehicle_id, ritnummer, start_time, json_log, plate } = req.body || {};

    let vehicleId = vehicle_id || null;
    if (!vehicleId && plate) {
      const v = await db.query(
        `INSERT INTO vehicles (company_id, plate, active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (company_id, plate) DO UPDATE SET active = TRUE
         RETURNING id`,
        [companyId, plate]
      );
      vehicleId = v.rows[0].id;
    }

    const r = await db.query(
      `INSERT INTO trips (company_id, vehicle_id, driver_id, ritnummer, start_time, json_log, chiron_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [companyId, vehicleId, userId, ritnummer || null, start_time || new Date(), json_log || null]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error('Trips start error:', err);
    res.status(500).json({ error: 'Trip start failed' });
  }
});

// Stop endpoint (optional)
router.post('/stop', auth('driver'), async (req, res) => {
  try {
    const { companyId } = req.user;
    const { trip_id, end_time, price, json_log } = req.body || {};
    if (!trip_id) {
      return res.status(400).json({ error: 'trip_id required' });
    }
    const r = await db.query(
      `UPDATE trips
       SET end_time = COALESCE($1, end_time),
           price = COALESCE($2, price),
           json_log = COALESCE($3, json_log)
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [end_time || new Date(), price || null, json_log || null, trip_id, companyId]
    );
    if (!r.rows.length) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Trips stop error:', err);
    res.status(500).json({ error: 'Trip stop failed' });
  }
});

// List trips
router.get('/list', auth(), async (req, res) => {
  try {
    const { companyId } = req.user;
    const r = await db.query(
      `SELECT t.*, v.plate, u.name AS driver_name
       FROM trips t
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       LEFT JOIN users u ON t.driver_id = u.id
       WHERE t.company_id = $1
       ORDER BY t.created_at DESC
       LIMIT 200`,
      [companyId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Trips list error:', err);
    res.status(500).json({ error: 'Trips list failed' });
  }
});

module.exports = router;
