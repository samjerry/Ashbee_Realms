import { Eye, Crown, Shield, Gem, Star, Beaker, User } from 'lucide-react';

/**
 * Role configuration with icons and colors
 */
export const ROLE_CONFIG = {
  creator: { Icon: Eye, color: '#FFD700', name: 'Creator' },
  streamer: { Icon: Crown, color: '#9146FF', name: 'Streamer' },
  moderator: { Icon: Shield, color: '#00FF00', name: 'Moderator' },
  vip: { Icon: Gem, color: '#FF1493', name: 'VIP' },
  subscriber: { Icon: Star, color: '#6441A5', name: 'Subscriber' },
  tester: { Icon: Beaker, color: '#00FFFF', name: 'Tester' },
  viewer: { Icon: User, color: '#FFFFFF', name: 'Viewer' }
};

/**
 * Role hierarchy (highest to lowest priority)
 */
export const ROLE_HIERARCHY = ['creator', 'streamer', 'moderator', 'vip', 'subscriber', 'tester', 'viewer'];

/**
 * Get the primary (highest priority) role from a roles array
 * @param {Array<string>} roles - Array of role strings
 * @returns {string} The highest priority role
 */
export function getPrimaryRole(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return 'viewer';
  }
  
  return ROLE_HIERARCHY.find(role => roles.includes(role)) || 'viewer';
}

/**
 * Get role badges for a player (excludes 'viewer' if they have other roles)
 * If selectedRoleBadge is provided, returns only that badge
 * @param {Array<string>} roles - Array of role strings
 * @param {string} selectedRoleBadge - Optional selected role badge to display
 * @returns {Array<Object>} Array of role badge objects with Icon, color, and role name
 */
export function getRoleBadges(roles, selectedRoleBadge = null) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return [{ role: 'viewer', ...ROLE_CONFIG.viewer }];
  }
  
  // If a specific badge is selected, return only that one
  if (selectedRoleBadge && roles.includes(selectedRoleBadge)) {
    return [{ role: selectedRoleBadge, ...ROLE_CONFIG[selectedRoleBadge] }];
  }
  
  // If selectedRoleBadge is provided but not in roles, use primary role
  if (selectedRoleBadge) {
    const primaryRole = getPrimaryRole(roles);
    return [{ role: primaryRole, ...ROLE_CONFIG[primaryRole] }];
  }
  
  // Otherwise return all badges (legacy behavior for places that don't have selectedRoleBadge yet)
  const badges = [];
  const hasOtherRoles = roles.some(r => r !== 'viewer');
  
  for (const role of roles) {
    // Skip viewer if they have higher roles
    if (role === 'viewer' && hasOtherRoles) continue;
    
    if (ROLE_CONFIG[role]) {
      badges.push({ role, ...ROLE_CONFIG[role] });
    }
  }
  
  return badges.length > 0 ? badges : [{ role: 'viewer', ...ROLE_CONFIG.viewer }];
}

/**
 * Get the primary role icon component
 * @param {Array<string>} roles - Array of role strings
 * @returns {Component} Lucide icon component
 */
export function getPrimaryRoleIcon(roles) {
  const primaryRole = getPrimaryRole(roles);
  return ROLE_CONFIG[primaryRole]?.Icon || User;
}

/**
 * Get the primary role color
 * @param {Array<string>} roles - Array of role strings
 * @returns {string} Hex color code
 */
export function getPrimaryRoleColor(roles) {
  const primaryRole = getPrimaryRole(roles);
  return ROLE_CONFIG[primaryRole]?.color || '#FFFFFF';
}

/**
 * Get player name color (uses custom nameColor if set, otherwise primary role color)
 * @param {string} nameColor - Custom name color (optional)
 * @param {Array<string>} roles - Array of role strings
 * @returns {string} Hex color code
 */
export function getPlayerNameColor(nameColor, roles) {
  return nameColor || getPrimaryRoleColor(roles);
}
