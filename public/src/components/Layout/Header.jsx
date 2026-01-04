import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Heart, Droplet, TrendingUp, Coins, Shield, Menu } from 'lucide-react';
import useGameStore from '../../store/gameStore';
import axios from 'axios';
import { getRoleBadges, getPlayerNameColor, getPrimaryRoleIcon } from '../../utils/roleHelpers';

// Lazy load OperatorMenu for code splitting
const OperatorMenu = lazy(() => import('../Operator/OperatorMenu'));

const Header = () => {
  const { player, toggleMobileMenu } = useGameStore();
  const [hasOperatorAccess, setHasOperatorAccess] = useState(false);
  const [showOperatorMenu, setShowOperatorMenu] = useState(false);

  useEffect(() => {
    // Check if user has operator access
    const checkAccess = async () => {
      if (!player?.channel) return;

      try {
        const response = await axios.get(`/api/operator/status?channel=${player.channel}`);
        setHasOperatorAccess(response.data.hasAccess);
      } catch (error) {
        setHasOperatorAccess(false);
      }
    };

    checkAccess();
  }, [player?.channel]);

  if (!player) return null;

  const hpPercent = (player.hp / player.maxHp) * 100;
  const manaPercent = player.mana ? (player.mana / player.maxMana) * 100 : 0;
  const xpPercent = (player.xp / player.xpToNextLevel) * 100;

  // Get HP bar color class based on percentage
  const getHpBarClass = () => {
    if (hpPercent > 50) return 'hp-fill hp-fill-high';
    if (hpPercent > 30) return 'hp-fill hp-fill-medium';
    return 'hp-fill hp-fill-low';
  };

  // Get player icon based on role
  const PlayerIcon = getPrimaryRoleIcon(player.roles, player.selectedRoleBadge);

  return (
    <>
      <header className="bg-dark-900 border-b border-dark-700 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left section: mobile menu + player info */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>

            {/* Player info */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <PlayerIcon size={20} className="sm:w-6 sm:h-6" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-dark-900 border-2 border-primary-500 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                  {player.level}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-bold truncate flex items-center gap-1" style={{ color: getPlayerNameColor(player.nameColor, player.roles) }}>
                  {getRoleBadges(player.roles, player.selectedRoleBadge).map(({ Icon, color, role }) => (
                    <Icon key={role} size={16} className="sm:w-5 sm:h-5 flex-shrink-0" style={{ color }} />
                  ))}
                  <span className="truncate">{player.username}</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 truncate">
                  {player.class} • Level {player.level}
                </p>
              </div>
            </div>
          </div>

          {/* Stats bars */}
          <div className="hidden md:flex flex-col flex-1 max-w-2xl mx-6 space-y-2">
            {/* HP Bar */}
            <div className="flex items-center space-x-3">
              <Heart size={20} className="text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>HP</span>
                  <span>
                    {player.hp} / {player.maxHp}
                  </span>
                </div>
                <div className="hp-bar">
                  <div
                    className={getHpBarClass()}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Mana Bar */}
            {player.mana !== undefined && (
              <div className="flex items-center space-x-3">
                <Droplet size={20} className="text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Mana</span>
                    <span>
                      {player.mana} / {player.maxMana}
                    </span>
                  </div>
                  <div className="mana-bar">
                    <div
                      className="mana-fill"
                      style={{ width: `${manaPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* XP Bar */}
            <div className="flex items-center space-x-3">
              <TrendingUp size={20} className="text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>XP</span>
                  <span>
                    {player.xp} / {player.xpToNextLevel}
                  </span>
                </div>
                <div className="xp-bar">
                  <div
                    className="xp-fill"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right section: gold + operator button */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Gold */}
            <div className="flex items-center space-x-2 bg-dark-800 px-3 sm:px-4 py-2 rounded-lg border border-dark-700">
              <Coins size={16} className="sm:w-5 sm:h-5 text-yellow-500" />
              <span className="text-sm sm:text-lg font-bold text-yellow-500">
                {(player.gold || 0).toLocaleString()}
              </span>
            </div>

            {/* Operator Menu Button */}
            {hasOperatorAccess && (
              <button
                onClick={() => setShowOperatorMenu(true)}
                className="flex items-center space-x-2 bg-purple-900/30 border border-purple-500 px-4 py-2 rounded-lg hover:bg-purple-900/50 transition-colors"
                title="Operator Menu"
              >
                <Shield size={20} className="text-purple-400" />
                <span className="text-sm font-medium text-purple-300">
                  Operator
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Operator Menu Modal */}
      {showOperatorMenu && hasOperatorAccess && (
        <Suspense fallback={null}>
          <OperatorMenu
            isOpen={showOperatorMenu}
            onClose={() => setShowOperatorMenu(false)}
            channelName={player.channel}
          />
        </Suspense>
      )}
    </>
  );
};

export default Header;
