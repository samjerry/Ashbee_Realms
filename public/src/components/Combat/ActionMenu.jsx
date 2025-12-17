import React from 'react';
import { Sword, Package, ArrowLeft } from 'lucide-react';

const ActionMenu = ({ state, onAction, disabled }) => {
  const mainActions = [
    {
      id: 'fight',
      icon: Sword,
      label: 'FIGHT',
      color: 'bg-red-600 hover:bg-red-700',
      emoji: '🗡️'
    },
    {
      id: 'items',
      icon: Package,
      label: 'ITEMS',
      color: 'bg-green-600 hover:bg-green-700',
      emoji: '🎒'
    },
    {
      id: 'run',
      icon: ArrowLeft,
      label: 'RUN',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      emoji: '🏃'
    }
  ];

  if (state !== 'main') {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {mainActions.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            disabled={disabled}
            className={`${action.color} text-white p-4 sm:p-6 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[80px] sm:min-h-[100px]`}
          >
            <div className="text-3xl sm:text-4xl mb-2">{action.emoji}</div>
            <div className="font-bold text-sm sm:text-base">{action.label}</div>
          </button>
        );
      })}
    </div>
  );
};

export default ActionMenu;
