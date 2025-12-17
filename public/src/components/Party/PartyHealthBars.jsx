import React from 'react';
import { Heart, Shield, Zap, Droplet, Activity } from 'lucide-react';
import { getRoleBadges, getPlayerNameColor } from '../../utils/roleHelpers';

const PartyMemberCard = ({ member, isLeader }) => {
  const getHealthPercentage = () => {
    return (member.hp / member.maxHp) * 100;
  };

  const getManaPercentage = () => {
    if (!member.maxMana) return 0;
    return (member.mana / member.maxMana) * 100;
  };

  const getHealthColor = () => {
    const percentage = getHealthPercentage();
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRoleIcon = () => {
    switch (member.role) {
      case 'tank':
        return <Shield className="text-blue-400" size={20} />;
      case 'healer':
        return <Heart className="text-green-400" size={20} />;
      case 'dps':
        return <Zap className="text-red-400" size={20} />;
      default:
        return <Activity className="text-gray-400" size={20} />;
    }
  };

  const getRoleBorderColor = () => {
    switch (member.role) {
      case 'tank':
        return 'border-blue-500';
      case 'healer':
        return 'border-green-500';
      case 'dps':
        return 'border-red-500';
      default:
        return 'border-gray-500';
    }
  };

  return (
    <div className={`
      bg-dark-800 rounded-lg p-3 border-2 ${getRoleBorderColor()}
      ${member.isDead ? 'opacity-50 grayscale' : ''}
      transition-all duration-300 hover:scale-105
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getRoleIcon()}
          <div>
            <h4 className="font-semibold flex items-center gap-1" style={{ color: getPlayerNameColor(member.nameColor, member.roles) }}>
              {member.roles && getRoleBadges(member.roles, member.selectedRoleBadge).map(({ Icon, color, role }) => (
                <Icon key={role} size={14} style={{ color }} />
              ))}
              <span>{member.name}</span>
              {isLeader && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded ml-1">
                  Leader
                </span>
              )}
            </h4>
            <p className="text-gray-400 text-xs capitalize">{member.role}</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-white font-bold">Lv {member.level}</p>
          {member.isDead && (
            <span className="text-red-400 text-xs font-semibold">💀 Dead</span>
          )}
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Heart size={12} />
            <span>HP</span>
          </div>
          <span className="text-xs text-white font-medium">
            {member.hp} / {member.maxHp}
          </span>
        </div>
        <div className="h-3 bg-dark-900 rounded-full overflow-hidden">
          <div
            className={`h-full ${getHealthColor()} transition-all duration-500 ease-out relative`}
            style={{ width: `${getHealthPercentage()}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mana Bar */}
      {member.maxMana > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Droplet size={12} />
              <span>Mana</span>
            </div>
            <span className="text-xs text-white font-medium">
              {member.mana} / {member.maxMana}
            </span>
          </div>
          <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${getManaPercentage()}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Effects */}
      {member.statusEffects && member.statusEffects.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {member.statusEffects.map((effect, index) => (
            <span
              key={index}
              className={`text-xs px-2 py-1 rounded ${
                effect.type === 'buff'
                  ? 'bg-green-900/50 text-green-400 border border-green-600'
                  : 'bg-red-900/50 text-red-400 border border-red-600'
              }`}
              title={effect.description}
            >
              {effect.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const PartyHealthBars = ({ partyMembers, leaderId }) => {
  if (!partyMembers || partyMembers.length === 0) {
    return null;
  }

  return (
    <div className="fixed left-4 top-20 z-40 w-64 space-y-2">
      <div className="bg-dark-900/90 backdrop-blur-sm rounded-lg p-3 border border-dark-700">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Activity size={20} className="text-primary-500" />
          Party Members ({partyMembers.length})
        </h3>
        
        <div className="space-y-2">
          {partyMembers.map((member) => (
            <PartyMemberCard
              key={member.id}
              member={member}
              isLeader={member.id === leaderId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PartyHealthBars;
