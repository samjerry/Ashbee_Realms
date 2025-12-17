import React, { useState } from 'react';
import { X } from 'lucide-react';
import useGameStore from '../../store/gameStore';
import MonsterDisplay from './MonsterDisplay';
import ActionMenu from './ActionMenu';
import FightSubmenu from './FightSubmenu';
import ItemsMenu from './ItemsMenu';
import { getRoleBadges, getPlayerNameColor } from '../../utils/roleHelpers';

const CombatView = () => {
  const { combat, combatLog, player, performCombatAction, endCombat, combatMenuState, setCombatMenuState } = useGameStore();
  const [isProcessing, setIsProcessing] = useState(false);
  
  if (!combat || !player) return null;
  
  const { monster, playerHp } = combat;
  const safeCombatLog = combatLog || [];
  const playerHpPercent = (playerHp / (player.maxHp || 100)) * 100;

  // Get HP bar color based on percentage
  const getHpBarColor = (percent) => {
    if (percent > 60) return 'bg-green-500';
    if (percent > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleMenuAction = async (actionId) => {
    if (actionId === 'fight') {
      setCombatMenuState('fight');
    } else if (actionId === 'items') {
      setCombatMenuState('items');
    } else if (actionId === 'run') {
      setIsProcessing(true);
      await performCombatAction('run');
      setIsProcessing(false);
    }
  };

  const handleFightAction = async (actionId) => {
    setIsProcessing(true);
    await performCombatAction(actionId);
    setCombatMenuState('main');
    setIsProcessing(false);
  };

  const handleUseItem = async (itemId) => {
    setIsProcessing(true);
    await performCombatAction({ type: 'item', itemId });
    setCombatMenuState('main');
    setIsProcessing(false);
  };

  const handleBack = () => {
    setCombatMenuState('main');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-6xl my-auto">
        {/* Close button */}
        <button
          onClick={endCombat}
          className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors z-10"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>
        
        <div className="bg-dark-900 rounded-lg border border-dark-700 p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          {/* Combat Title */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Combat</h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400">vs {monster.name}</p>
          </div>
          
          {/* Top Section: Monster and Player */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            {/* Player */}
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center text-white font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
                  {player.level}
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center justify-center gap-1 sm:gap-2" style={{ color: getPlayerNameColor(player.nameColor, player.roles) }}>
                  {getRoleBadges(player.roles, player.selectedRoleBadge).map(({ Icon, color, role }) => (
                    <Icon key={role} size={20} className="sm:w-6 sm:h-6" style={{ color }} />
                  ))}
                  <span>{player.username}</span>
                </h3>
                <p className="text-sm sm:text-base text-gray-400">{player.class} • Level {player.level}</p>
              </div>
              
              <div className="bg-dark-800 rounded-lg p-3 sm:p-4 border border-dark-700">
                <div className="flex justify-between text-xs sm:text-sm text-gray-400 mb-2">
                  <span>HP</span>
                  <span>{playerHp} / {player.maxHp}</span>
                </div>
                <div className="h-6 sm:h-8 bg-dark-900 rounded-full overflow-hidden border border-dark-700">
                  <div 
                    className={`h-full transition-all duration-500 ${getHpBarColor(playerHpPercent)}`}
                    style={{ width: `${playerHpPercent}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="bg-dark-800 rounded p-2 border border-dark-700">
                  <p className="text-gray-400">Attack</p>
                  <p className="text-white font-bold">{player.stats?.attack || 10}</p>
                </div>
                <div className="bg-dark-800 rounded p-2 border border-dark-700">
                  <p className="text-gray-400">Defense</p>
                  <p className="text-white font-bold">{player.stats?.defense || 5}</p>
                </div>
              </div>
            </div>
            
            {/* Monster */}
            <MonsterDisplay monster={monster} />
          </div>
          
          {/* Middle Section: Combat Log */}
          <div className="bg-dark-800 rounded-lg p-3 sm:p-4 border border-dark-700 h-32 sm:h-40 md:h-48 overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3">Combat Log</h3>
            {safeCombatLog.length === 0 ? (
              <p className="text-gray-500 text-center py-4 sm:py-8 text-sm sm:text-base">Choose your action...</p>
            ) : (
              <div className="space-y-1 sm:space-y-2">
                {safeCombatLog.map((log, index) => (
                  <p key={index} className="text-gray-300 text-xs sm:text-sm">
                    <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                  </p>
                ))}
              </div>
            )}
          </div>
          
          {/* Bottom Section: Action Menu */}
          <div>
            <ActionMenu 
              state={combatMenuState} 
              onAction={handleMenuAction}
              disabled={isProcessing}
            />
            <FightSubmenu 
              state={combatMenuState}
              onAction={handleFightAction}
              onBack={handleBack}
              player={player}
              disabled={isProcessing}
            />
            <ItemsMenu 
              state={combatMenuState}
              onUseItem={handleUseItem}
              onBack={handleBack}
              inventory={player.inventory}
              disabled={isProcessing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombatView;
