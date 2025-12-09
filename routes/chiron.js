const express = require('express');
const fetch = require('node-fetch');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

function getOAuthBase(env) {
  return env === 'PROD'
    ? 'https://mow.api.vlaanderen.be/oauth'
    : 'https://mow-acc.api.vlaanderen.be/oauth';
}

function getApiBase(env) {
  return env === 'PROD'
    ? 'https://mow.api.vlaanderen.be/mobiliteit/chiron'
    : 'https://mow-acc.api.vlaanderen.be/mobiliteit/chiron';
}

// Build body based on previous implementation
function buildChironBody(status, trip, cfg) {
  const nowIso = new Date().toISOString();
  const {
    ritnummer,
    startTimeIso,
    endTimeIso,
    startLat,
    startLng,
    endLat,
    endLng,
    distanceKm,
    price,
  } = trip;

  const base = {
    ritnummer: ritnummer || '',
    voertuig: {
      nummerplaat: cfg.defaultPlate || '',
    },
    uitvoerder: {
      bestuurderspasnummer: cfg.driverCardId || '',
    },
    vertrektijdstip: startTimeIso,
    vertrekpunt: {
      lengtegraad: startLng || 0,
      breedtegraad: startLat || 0,
    },
    aankomsttijdstip: endTimeIso || startTimeIso,
    aankomstpunt: {
      lengtegraad: endLng || startLng || 0,
      breedtegraad: endLat || startLat || 0,
    },
    afstand: {
      waarde: Number(distanceKm || 0).toFixed(2),
    },
    kostprijs: {
      waarde: Number(price || 0).toFixed(2),
    },
    broncreatiedatum: nowIso,
  };

  return { status, body: base };
}

// Legacy-compatible endpoint used by the React taximeter
router.post('/send', auth(), async (req, res) => {
  try {
    const { status, trip, cfg } = req.body || {};
    if (!status || !trip || !cfg) {
      return res.status(400).json({ error: 'status, trip and cfg are required' });
    }

    const { companyId, userId } = req.user;

    // Load company credentials
    const cRes = await db.query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );
    if (!cRes.rows.length) {
      return res.status(400).json({ error: 'Company not found' });
    }
    const company = cRes.rows[0];

    const env = cfg.env === 'PROD' ? 'PROD' : 'TEST';

    const clientId =
      env === 'PROD' ? company.chiron_client_id || cfg.clientId : company.chiron_test_id || cfg.clientId;
    const clientSecret =
      env === 'PROD' ? company.chiron_secret || cfg.clientSecret : company.chiron_test_secret || cfg.clientSecret;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Chiron credentials missing for this company' });
    }

    // Get OAuth token
    const tokenRes = await fetch(getOAuthBase(env) + '/token', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('OAuth error:', tokenJson);
      return res.status(400).json({ error: 'OAuth failed', details: tokenJson });
    }

    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: 'No access_token from OAuth' });
    }

    const payload = buildChironBody(status, trip, cfg);

    const apiRes = await fetch(getApiBase(env) + '/ritten', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload.body),
    });

    const apiText = await apiRes.text();
    let apiJson;
    try {
      apiJson = JSON.parse(apiText);
    } catch {
      apiJson = { raw: apiText };
    }

    // Store trip in DB (simple insert using ritnummer and price)
    try {
      await db.query(
        `INSERT INTO trips (company_id, driver_id, ritnummer, start_time, end_time, price, json_log, chiron_status, chiron_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          companyId,
          userId || null,
          trip.ritnummer || null,
          trip.startTimeIso ? new Date(trip.startTimeIso) : new Date(),
          trip.endTimeIso ? new Date(trip.endTimeIso) : new Date(),
          trip.price != null ? Number(trip.price) : null,
          JSON.stringify(trip),
          apiRes.ok ? 'success' : 'failed',
          apiJson,
        ]
      );
    } catch (dbErr) {
      console.error('Error storing trip in DB (chiron/send):', dbErr.message);
    }

    if (!apiRes.ok) {
      return res.status(400).json({ error: 'Chiron API error', details: apiJson });
    }

    return res.json(apiJson);
  } catch (err) {
    console.error('Chiron proxy error:', err);
    res.status(500).json({ error: 'Chiron proxy error', message: err.message });
  }
});

module.exports = router;
