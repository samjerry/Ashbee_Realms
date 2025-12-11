/**
 * rateLimiter.js
 * Rate limiting middleware for API endpoints
 */

class RateLimiter {
  constructor() {
    this.requests = new Map(); // Map of IP -> [timestamps]
    this.limits = {
      default: { windowMs: 60000, max: 60 }, // 60 requests per minute
      strict: { windowMs: 60000, max: 30 },  // 30 requests per minute
      relaxed: { windowMs: 60000, max: 120 } // 120 requests per minute
    };
    
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Create middleware for rate limiting
   * @param {string} limitType - 'default', 'strict', or 'relaxed'
   * @returns {Function} Express middleware
   */
  middleware(limitType = 'default') {
    const limit = this.limits[limitType] || this.limits.default;
    
    return (req, res, next) => {
      const key = this.getKey(req);
      const now = Date.now();
      
      // Get request timestamps for this key
      if (!this.requests.has(key)) {
        this.requests.set(key, []);
      }
      
      const timestamps = this.requests.get(key);
      
      // Remove old timestamps outside the window
      const validTimestamps = timestamps.filter(time => now - time < limit.windowMs);
      
      // Check if limit exceeded
      if (validTimestamps.length >= limit.max) {
        const oldestTimestamp = Math.min(...validTimestamps);
        const retryAfter = Math.ceil((limit.windowMs - (now - oldestTimestamp)) / 1000);
        
        res.setHeader('X-RateLimit-Limit', limit.max);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(oldestTimestamp + limit.windowMs).toISOString());
        res.setHeader('Retry-After', retryAfter);
        
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          limit: limit.max,
          windowMs: limit.windowMs
        });
      }
      
      // Add current request
      validTimestamps.push(now);
      this.requests.set(key, validTimestamps);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit.max);
      res.setHeader('X-RateLimit-Remaining', limit.max - validTimestamps.length);
      res.setHeader('X-RateLimit-Reset', new Date(now + limit.windowMs).toISOString());
      
      next();
    };
  }

  /**
   * Get key for rate limiting (IP address or user ID)
   * @param {Object} req - Express request object
   * @returns {string} Unique key
   */
  getKey(req) {
    // Prefer user ID if authenticated, otherwise use IP
    if (req.session && req.session.user) {
      return `user:${req.session.user.id}`;
    }
    
    // Get IP from various headers (for proxies/load balancers)
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress;
    
    return `ip:${ip}`;
  }

  /**
   * Cleanup old entries
   */
  cleanup() {
    const now = Date.now();
    const maxWindow = Math.max(...Object.values(this.limits).map(l => l.windowMs));
    
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(time => now - time < maxWindow);
      
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }

  /**
   * Get stats
   * @returns {Object} Rate limiter stats
   */
  getStats() {
    return {
      totalKeys: this.requests.size,
      limits: this.limits
    };
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

module.exports = rateLimiter;
