import React from 'react';
import { Shield, Flame, Droplet, Zap, Heart, Skull, Wind } from 'lucide-react';

/**
 * StatusEffectDisplay Component - Show active status effects
 * @param {Object} props
 * @param {Array} props.effects - Array of status effects
 * @param {string} props.target - 'player' or 'monster'
 */
const StatusEffectDisplay = ({ effects = [], target = 'player' }) => {
  if (!effects || effects.length === 0) {
    return null;
  }

  const getEffectIcon = (effect) => {
    const name = (effect.name || '').toLowerCase();
    const type = (effect.type || '').toLowerCase();
    
    if (name.includes('burn') || name.includes('fire')) return <Flame size={14} className="text-orange-500" />;
    if (name.includes('poison')) return <Droplet size={14} className="text-green-500" />;
    if (name.includes('stun')) return <Zap size={14} className="text-yellow-500" />;
    if (name.includes('shield') || name.includes('protect')) return <Shield size={14} className="text-blue-500" />;
    if (name.includes('regen') || name.includes('heal')) return <Heart size={14} className="text-pink-500" />;
    if (name.includes('bleed') || name.includes('curse')) return <Skull size={14} className="text-red-500" />;
    if (name.includes('haste') || name.includes('speed')) return <Wind size={14} className="text-cyan-500" />;
    
    if (type === 'buff') return <Shield size={14} className="text-green-400" />;
    if (type === 'debuff') return <Skull size={14} className="text-red-400" />;
    
    return '✨';
  };

  const getEffectColor = (effect) => {
    const type = (effect.type || '').toLowerCase();
    if (type === 'buff') return 'bg-green-900/50 border-green-700 text-green-300';
    if (type === 'debuff') return 'bg-red-900/50 border-red-700 text-red-300';
    return 'bg-purple-900/50 border-purple-700 text-purple-300';
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {effects.map((effect, index) => (
        <div
          key={`${effect.name}-${index}`}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${getEffectColor(effect)}`}
        >
          <span className="flex items-center">{getEffectIcon(effect)}</span>
          <span className="font-medium">{effect.name}</span>
          {effect.duration > 0 && (
            <span className="bg-dark-900/50 px-1.5 py-0.5 rounded text-xs font-bold">
              {effect.duration}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatusEffectDisplay;
