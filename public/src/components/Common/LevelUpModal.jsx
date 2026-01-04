import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, Star, Heart, Zap, Shield, Sparkles, X } from 'lucide-react';

const LevelUpModal = ({ levelUpData, onClose }) => {
  const [show, setShow] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setShow(true), 50);
    
    // Apply theme-based gradient background
    if (modalRef.current) {
      modalRef.current.style.background = 'linear-gradient(to bottom right, var(--modal-from), var(--modal-via), var(--modal-to))';
      modalRef.current.style.borderColor = 'var(--modal-border)';
    }
  }, []);

  if (!levelUpData) return null;

  const { newLevel, levelsGained, statsGained, skillPoints, newMaxHp } = levelUpData;

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  // Use CSS variables that are set by the theme system
  const themeStyles = {
    '--modal-from': 'rgb(var(--color-primary-900) / 1)',
    '--modal-via': 'rgb(var(--color-primary-800) / 1)',
    '--modal-to': 'rgb(var(--color-primary-900) / 1)',
    '--modal-border': 'rgb(var(--color-primary-400) / 1)',
    '--modal-sparkle': 'rgb(var(--color-primary-400) / 1)',
    '--modal-text-main': 'rgb(var(--color-primary-100) / 1)',
    '--modal-text-sub': 'rgb(var(--color-primary-200) / 1)',
    '--modal-text-accent': 'rgb(var(--color-primary-300) / 1)',
    '--modal-btn-from': 'rgb(var(--color-primary-600) / 1)',
    '--modal-btn-to': 'rgb(var(--color-primary-500) / 1)',
    '--modal-btn-hover-from': 'rgb(var(--color-primary-500) / 1)',
    '--modal-btn-hover-to': 'rgb(var(--color-primary-400) / 1)',
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 animate-fadeIn">
      <div 
        ref={modalRef}
        style={themeStyles}
        className={`relative rounded-xl border-4 shadow-2xl max-w-md w-full transform transition-all duration-300 ${
          show ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      >
        {/* Sparkle effects */}
        <div className="absolute -top-8 -left-8 animate-bounce" style={{ color: 'var(--modal-sparkle)' }}>
          <Sparkles size={48} />
        </div>
        <div className="absolute -top-8 -right-8 animate-bounce animation-delay-200" style={{ color: 'var(--modal-sparkle)' }}>
          <Sparkles size={48} />
        </div>
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce animation-delay-400" style={{ color: 'var(--modal-sparkle)' }}>
          <Sparkles size={48} />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 transition-colors z-10 hover:text-white"
          style={{ color: 'var(--modal-text-sub)' }}
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center py-8 px-6 border-b-4" style={{ borderColor: 'rgba(var(--color-primary-400) / 0.5)' }}>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Star className="animate-pulse" size={80} style={{ color: 'var(--modal-sparkle)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold" style={{ color: 'var(--modal-from)' }}>{newLevel}</span>
              </div>
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-2 animate-pulse" style={{ color: 'var(--modal-text-main)' }}>
            LEVEL UP!
          </h2>
          <p className="text-xl" style={{ color: 'var(--modal-text-sub)' }}>
            {levelsGained > 1 ? `+${levelsGained} Levels!` : `Level ${newLevel} Reached!`}
          </p>
        </div>

        {/* Stats Display */}
        <div className="p-6 space-y-4">
          <div className="bg-black/30 rounded-lg p-4 border" style={{ borderColor: 'rgba(var(--color-primary-400) / 0.3)' }}>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--modal-text-accent)' }}>
              <TrendingUp size={20} />
              Stat Increases
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {statsGained?.strength > 0 && (
                <div className="flex items-center justify-between bg-red-900/20 border border-red-600/30 rounded px-3 py-2">
                  <span className="text-red-300 text-sm font-semibold">Strength</span>
                  <span className="text-red-400 font-bold">+{statsGained.strength}</span>
                </div>
              )}
              
              {statsGained?.dexterity > 0 && (
                <div className="flex items-center justify-between bg-green-900/20 border border-green-600/30 rounded px-3 py-2">
                  <span className="text-green-300 text-sm font-semibold">Dexterity</span>
                  <span className="text-green-400 font-bold">+{statsGained.dexterity}</span>
                </div>
              )}
              
              {statsGained?.constitution > 0 && (
                <div className="flex items-center justify-between bg-orange-900/20 border border-orange-600/30 rounded px-3 py-2">
                  <span className="text-orange-300 text-sm font-semibold">Constitution</span>
                  <span className="text-orange-400 font-bold">+{statsGained.constitution}</span>
                </div>
              )}
              
              {statsGained?.intelligence > 0 && (
                <div className="flex items-center justify-between bg-blue-900/20 border border-blue-600/30 rounded px-3 py-2">
                  <span className="text-blue-300 text-sm font-semibold">Intelligence</span>
                  <span className="text-blue-400 font-bold">+{statsGained.intelligence}</span>
                </div>
              )}
              
              {statsGained?.wisdom > 0 && (
                <div className="flex items-center justify-between bg-purple-900/20 border border-purple-600/30 rounded px-3 py-2">
                  <span className="text-purple-300 text-sm font-semibold">Wisdom</span>
                  <span className="text-purple-400 font-bold">+{statsGained.wisdom}</span>
                </div>
              )}
              
              {statsGained?.hp > 0 && (
                <div className="flex items-center justify-between bg-pink-900/20 border border-pink-600/30 rounded px-3 py-2 col-span-2">
                  <span className="text-pink-300 text-sm font-semibold flex items-center gap-1">
                    <Heart size={16} />
                    Max HP
                  </span>
                  <span className="text-pink-400 font-bold">+{statsGained.hp}</span>
                </div>
              )}
            </div>
          </div>

          {/* Rewards */}
          <div className="space-y-2">
            {skillPoints > 0 && (
              <div className="flex items-center justify-between bg-cyan-900/20 border border-cyan-600/30 rounded-lg px-4 py-3">
                <span className="text-cyan-300 font-semibold flex items-center gap-2">
                  <Zap size={18} className="text-cyan-400" />
                  Skill Points
                </span>
                <span className="text-cyan-400 font-bold text-lg">+{skillPoints}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between bg-green-900/20 border border-green-600/30 rounded-lg px-4 py-3">
              <span className="text-green-300 font-semibold flex items-center gap-2">
                <Shield size={18} className="text-green-400" />
                Fully Healed
              </span>
              <span className="text-green-400 font-bold">{newMaxHp} HP</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={handleClose}
            className="w-full text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
            style={{
              background: 'linear-gradient(to right, var(--modal-btn-from), var(--modal-btn-to))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, var(--modal-btn-hover-from), var(--modal-btn-hover-to))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, var(--modal-btn-from), var(--modal-btn-to))';
            }}
          >
            Continue Adventure
          </button>
        </div>
      </div>
    </div>
  );
};

export default LevelUpModal;
