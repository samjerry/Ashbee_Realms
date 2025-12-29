/**
 * Session management middleware
 * Handles session activity tracking and automatic cleanup
 */

const db = require('../db');

/**
 * Update last_activity timestamp for authenticated sessions
 * This middleware should be applied to all authenticated routes
 */
async function updateSessionActivity(req, res, next) {
  // Only update if user is logged in and we have PostgreSQL
  if (req.session && req.session.user && process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    try {
      // Update last_activity asynchronously (don't block request)
      setImmediate(async () => {
        try {
          await db.query(
            'UPDATE session SET last_activity = NOW() WHERE sid = $1',
            [req.sessionID]
          );
        } catch (err) {
          // Log but don't throw - activity tracking failure shouldn't break the app
          console.error('⚠️ Failed to update session activity:', err.message);
        }
      });
    } catch (err) {
      // Ignore errors in activity tracking
    }
  }
  
  next();
}

/**
 * Ensure session metadata is set for authenticated users
 * Updates player_id, twitch_id, and channel if missing
 */
async function ensureSessionMetadata(req, res, next) {
  if (req.session && req.session.user && process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    try {
      // Check if session metadata needs updating
      const needsUpdate = !req.session.player_id || !req.session.twitch_id || !req.session.channel;
      
      if (needsUpdate) {
        const playerId = req.session.user.id;
        const twitchId = req.session.user.twitchId;
        const channel = req.session.channel || req.session.broadcasterChannel;
        
        if (playerId && twitchId && channel) {
          // Update session object
          req.session.player_id = playerId;
          req.session.twitch_id = twitchId;
          req.session.channel = channel;
          
          // Update database asynchronously
          setImmediate(async () => {
            try {
              await db.query(
                'UPDATE session SET player_id = $1, twitch_id = $2, channel = $3, last_activity = NOW() WHERE sid = $4',
                [playerId, twitchId, channel, req.sessionID]
              );
            } catch (err) {
              console.error('⚠️ Failed to update session metadata:', err.message);
            }
          });
        }
      }
    } catch (err) {
      // Ignore errors in metadata setup
    }
  }
  
  next();
}

module.exports = {
  updateSessionActivity,
  ensureSessionMetadata
};
