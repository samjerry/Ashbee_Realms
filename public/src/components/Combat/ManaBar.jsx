import React from 'react';

/**
 * ManaBar Component - Display character's mana in combat
 * @param {Object} props
 * @param {number} props.current - Current mana
 * @param {number} props.max - Maximum mana
 * @param {string} props.size - Size variant ('sm' or 'md')
 */
const ManaBar = ({ current = 0, max = 0, size = 'md' }) => {
  if (max === 0) {
    return null; // Don't show mana bar if character has no mana
  }

  const manaPercent = Math.max(0, Math.min(100, (current / max) * 100));
  
  const heightClass = size === 'sm' ? 'h-4' : 'h-6 sm:h-8';
  const textSizeClass = size === 'sm' ? 'text-xs' : 'text-xs sm:text-sm';

  return (
    <div className="bg-dark-800 rounded-lg p-3 sm:p-4 border border-dark-700">
      <div className={`flex justify-between ${textSizeClass} text-gray-400 mb-2`}>
        <span>MP</span>
        <span>{current} / {max}</span>
      </div>
      <div className={`${heightClass} bg-dark-900 rounded-full overflow-hidden border border-dark-700`}>
        <div 
          className="h-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-400"
          style={{ width: `${manaPercent}%` }}
        />
      </div>
    </div>
  );
};

export default ManaBar;
