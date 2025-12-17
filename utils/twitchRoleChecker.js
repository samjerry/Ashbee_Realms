/**
 * Twitch Role Checker
 * Fetches user roles (VIP, subscriber, moderator) from Twitch API using broadcaster credentials
 */

const axios = require('axios');

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;

/**
 * Fetch user's roles in a channel from Twitch API
 * @param {string} broadcasterToken - Broadcaster's access token with required scopes
 * @param {string} broadcasterId - Broadcaster's Twitch ID
 * @param {string} userId - User's Twitch ID
 * @param {string} userName - User's display name
 * @param {string} channelName - Channel name
 * @returns {Promise<Array<string>>} Array of roles
 */
async function fetchUserRolesFromTwitch(broadcasterToken, broadcasterId, userId, userName, channelName) {
  const roles = [];
  
  try {
    // Check if user is the broadcaster
    if (userId === broadcasterId || userName.toLowerCase() === channelName.toLowerCase()) {
      roles.push('streamer');
      return roles;
    }
    
    // Check if user is a moderator
    try {
      const modResponse = await axios.get('https://api.twitch.tv/helix/moderation/moderators', {
        headers: {
          'Authorization': `Bearer ${broadcasterToken}`,
          'Client-Id': TWITCH_CLIENT_ID
        },
        params: {
          broadcaster_id: broadcasterId,
          user_id: userId
        }
      });
      
      if (modResponse.data.data && modResponse.data.data.length > 0) {
        roles.push('moderator');
      }
    } catch (error) {
      // Moderator check failed - might not have required scope
      const statusCode = error.response?.status;
      const endpoint = 'GET /helix/moderation/moderators';
      const requiredScope = 'moderation:read';
      
      if (statusCode === 401 || statusCode === 403) {
        console.warn(`Failed to check moderator status: ${endpoint} requires scope: ${requiredScope} (Status: ${statusCode})`);
      } else {
        console.warn(`Failed to check moderator status: ${error.message} (Endpoint: ${endpoint})`);
      }
    }
    
    // Check if user is a VIP
    try {
      const vipResponse = await axios.get('https://api.twitch.tv/helix/channels/vips', {
        headers: {
          'Authorization': `Bearer ${broadcasterToken}`,
          'Client-Id': TWITCH_CLIENT_ID
        },
        params: {
          broadcaster_id: broadcasterId,
          user_id: userId
        }
      });
      
      if (vipResponse.data.data && vipResponse.data.data.length > 0) {
        roles.push('vip');
      }
    } catch (error) {
      // VIP check failed - might not have required scope
      const statusCode = error.response?.status;
      const endpoint = 'GET /helix/channels/vips';
      const requiredScope = 'channel:read:vips';
      
      if (statusCode === 401 || statusCode === 403) {
        console.warn(`Failed to check VIP status: ${endpoint} requires scope: ${requiredScope} (Status: ${statusCode})`);
      } else {
        console.warn(`Failed to check VIP status: ${error.message} (Endpoint: ${endpoint})`);
      }
    }
    
    // Check if user is a subscriber
    try {
      const subResponse = await axios.get('https://api.twitch.tv/helix/subscriptions/user', {
        headers: {
          'Authorization': `Bearer ${broadcasterToken}`,
          'Client-Id': TWITCH_CLIENT_ID
        },
        params: {
          broadcaster_id: broadcasterId,
          user_id: userId
        }
      });
      
      if (subResponse.data.data && subResponse.data.data.length > 0) {
        roles.push('subscriber');
      }
    } catch (error) {
      // Subscriber check failed - might not have required scope
      const statusCode = error.response?.status;
      const endpoint = 'GET /helix/subscriptions/user';
      const requiredScope = 'channel:read:subscriptions';
      
      if (statusCode === 401 || statusCode === 403) {
        console.warn(`Failed to check subscriber status: ${endpoint} requires scope: ${requiredScope} (Status: ${statusCode})`);
      } else {
        console.warn(`Failed to check subscriber status: ${error.message} (Endpoint: ${endpoint})`);
      }
    }
    
    // If no roles found, default to viewer
    if (roles.length === 0) {
      roles.push('viewer');
    }
    
    return roles;
  } catch (error) {
    console.error('Error fetching user roles from Twitch:', error);
    // On error, return viewer role as fallback
    return ['viewer'];
  }
}

module.exports = {
  fetchUserRolesFromTwitch
};
