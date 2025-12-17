/**
 * security.js
 * Security middleware and utilities
 */

const crypto = require('crypto');

/**
 * Generate CSRF token
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF protection middleware
 * Uses double-submit cookie pattern
 */
function csrfProtection(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ 
      error: 'Invalid CSRF token',
      message: 'CSRF validation failed' 
    });
  }

  next();
}

/**
 * Generate and attach CSRF token to session
 */
function attachCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  
  // Make token available to the response
  res.locals.csrfToken = req.session.csrfToken;
  
  next();
}

/**
 * Authentication middleware - require logged in user
 */
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Character ownership validation middleware
 * Ensures the authenticated user owns the character they're modifying
 */
function validateCharacterOwnership(req, res, next) {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Get playerId from params, body, or query
  const targetPlayerId = req.params.playerId || req.body.playerId || req.query.playerId;
  
  // If no playerId specified, assume they're acting on their own character
  if (!targetPlayerId) {
    return next();
  }

  // Verify user owns this character
  if (targetPlayerId !== user.id) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'You can only modify your own character' 
    });
  }

  next();
}

/**
 * Audit logging middleware
 * Logs all state-changing operations
 */
function auditLog(action) {
  return (req, res, next) => {
    const user = req.session?.user;
    const timestamp = new Date().toISOString();
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] ||
               req.connection.remoteAddress;

    console.log(`[AUDIT] ${timestamp} - ${action}`, {
      user: user?.id || 'anonymous',
      username: user?.displayName || 'anonymous',
      ip,
      method: req.method,
      path: req.path,
      body: sanitizeForLog(req.body),
      query: req.query
    });

    next();
  };
}

/**
 * Sanitize data for logging (remove sensitive fields)
 */
function sanitizeForLog(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'access_token', 'refresh_token', '_csrf'];
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Suspicious activity detection
 * NOTE: Uses in-memory Map which will reset on server restart
 * For production with multiple instances, consider Redis or database-backed solution
 */
const suspiciousActivity = new Map(); // userId -> { count, lastReset }
const SUSPICIOUS_THRESHOLD = 10; // 10 suspicious actions in window
const SUSPICIOUS_WINDOW = 300000; // 5 minutes

function detectSuspiciousActivity(req, res, next) {
  const user = req.session?.user;
  if (!user) return next();

  const now = Date.now();
  const userId = user.id;

  if (!suspiciousActivity.has(userId)) {
    suspiciousActivity.set(userId, { count: 0, lastReset: now });
  }

  const activity = suspiciousActivity.get(userId);

  // Reset counter if window expired
  if (now - activity.lastReset > SUSPICIOUS_WINDOW) {
    activity.count = 0;
    activity.lastReset = now;
  }

  // Check for suspicious patterns in request
  let isSuspicious = false;
  
  // Check for invalid/extreme values in common fields
  if (req.body) {
    const { level, gold, xp, hp, max_hp } = req.body;
    
    if (level && (level < 1 || level > 100)) isSuspicious = true;
    if (gold && gold > 100000000) isSuspicious = true;
    if (xp && xp > 100000000) isSuspicious = true;
    if (hp && (hp < 0 || hp > 1000000)) isSuspicious = true;
    if (max_hp && (max_hp < 1 || max_hp > 1000000)) isSuspicious = true;
  }

  if (isSuspicious) {
    activity.count++;
    
    console.warn(`[SECURITY] Suspicious activity detected for user ${user.displayName} (${userId})`, {
      count: activity.count,
      threshold: SUSPICIOUS_THRESHOLD,
      path: req.path,
      body: sanitizeForLog(req.body)
    });

    if (activity.count >= SUSPICIOUS_THRESHOLD) {
      console.error(`[SECURITY] User ${user.displayName} (${userId}) exceeded suspicious activity threshold - blocking`);
      return res.status(429).json({
        error: 'Too many suspicious requests',
        message: 'Your account has been temporarily restricted due to suspicious activity. Please contact support.'
      });
    }
  }

  next();
}

module.exports = {
  generateCsrfToken,
  csrfProtection,
  attachCsrfToken,
  requireAuth,
  validateCharacterOwnership,
  auditLog,
  sanitizeForLog,
  detectSuspiciousActivity
};
