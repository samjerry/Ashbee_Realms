const express = require('express');
const router = express.Router();
const sanitization = require('../middleware/sanitization');
const db = require('../db');

/**
 * GET /api/me
 * Get current user session info
 */
router.get('/me', (req, res) => {
  res.json(req.session.user || null);
});

/**
 * GET /api/csrf-token
 * Get CSRF token (for future use)
 */
router.get('/csrf-token', (req, res) => {
  res.json({ token: req.session.id });
});

module.exports = router;
