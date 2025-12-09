const express = require('express');

const router = express.Router();

// Stub endpoints for future ITSme integration

router.get('/login', (req, res) => {
  // In a real implementation, redirect to ITSme OAuth
  res.json({
    message: 'ITSme login stub. Implement real redirect here.',
  });
});

router.get('/callback', (req, res) => {
  // In a real implementation, exchange code for token and fetch company info
  res.json({
    kbo: 'BE0123456789',
    companyName: 'Demo Company BV',
    owner: 'Demo Owner',
  });
});

module.exports = router;
