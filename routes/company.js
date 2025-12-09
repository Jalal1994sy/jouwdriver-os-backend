const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/profile', auth(), async (req, res) => {
  try {
    const { companyId } = req.user;
    const r = await db.query(
      `SELECT id, name, kbo, address, phone, email, vat
       FROM companies WHERE id = $1`,
      [companyId]
    );
    if (!r.rows.length) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Profile failed' });
  }
});

router.post('/update', auth('admin'), async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, address, phone, email, vat } = req.body || {};
    const r = await db.query(
      `UPDATE companies
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           vat = COALESCE($5, vat)
       WHERE id = $6
       RETURNING *`,
      [name, address, phone, email, vat, companyId]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Company update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.post('/chiron-credentials', auth('admin'), async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      chiron_client_id,
      chiron_secret,
      chiron_test_id,
      chiron_test_secret,
    } = req.body || {};

    const r = await db.query(
      `UPDATE companies
       SET chiron_client_id = COALESCE($1, chiron_client_id),
           chiron_secret = COALESCE($2, chiron_secret),
           chiron_test_id = COALESCE($3, chiron_test_id),
           chiron_test_secret = COALESCE($4, chiron_test_secret)
       WHERE id = $5
       RETURNING id, name, kbo, chiron_client_id, chiron_test_id`,
      [chiron_client_id, chiron_secret, chiron_test_id, chiron_test_secret, companyId]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error('Chiron credentials error:', err);
    res.status(500).json({ error: 'Chiron credentials update failed' });
  }
});

module.exports = router;
