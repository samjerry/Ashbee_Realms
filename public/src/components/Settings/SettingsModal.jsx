import React, { useState } from 'react';
import { X, Volume2, Bell, Eye, Palette } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const SettingsModal = () => {
  const { showSettings, closeSettings } = useGameStore();
  const [settings, setSettings] = useState({
    volume: 70,
    sfxVolume: 80,
    notifications: true,
    combatAnimations: true,
    showDamageNumbers: true,
    autoLoot: true,
    theme: 'dark',
  });
  
  if (!showSettings) return null;
  
  const handleClose = () => {
    closeSettings();
  };
  
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Save to localStorage
    localStorage.setItem('gameSettings', JSON.stringify({ ...settings, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl my-auto">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors z-10"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>
        
        <div className="card p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-h-[85vh] overflow-y-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-sm sm:text-base text-gray-400">Customize your game experience</p>
          </div>
          
          {/* Audio Settings */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2">
              <Volume2 size={20} className="sm:w-6 sm:h-6 text-primary-500" />
              <h2 className="text-lg sm:text-xl font-bold text-white">Audio</h2>
            </div>
            
            <div className="space-y-3 sm:space-y-4 pl-6 sm:pl-8">
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span className="text-gray-400">Music Volume</span>
                  <span className="text-white">{settings.volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={(e) => handleSettingChange('volume', parseInt(e.target.value))}
                  className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">SFX Volume</span>
                  <span className="text-white">{settings.sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sfxVolume}
                  onChange={(e) => handleSettingChange('sfxVolume', parseInt(e.target.value))}
                  className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
          
          {/* Notification Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Bell size={24} className="text-primary-500" />
              <h2 className="text-xl font-bold text-white">Notifications</h2>
            </div>
            
            <div className="space-y-3 pl-8">
              <label className="flex items-center justify-between p-3 bg-dark-900 rounded-lg border border-dark-700 cursor-pointer">
                <span className="text-gray-300">Enable Notifications</span>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                />
              </label>
            </div>
          </div>
          
          {/* Visual Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Eye size={24} className="text-primary-500" />
              <h2 className="text-xl font-bold text-white">Visual</h2>
            </div>
            
            <div className="space-y-3 pl-8">
              <label className="flex items-center justify-between p-3 bg-dark-900 rounded-lg border border-dark-700 cursor-pointer">
                <span className="text-gray-300">Combat Animations</span>
                <input
                  type="checkbox"
                  checked={settings.combatAnimations}
                  onChange={(e) => handleSettingChange('combatAnimations', e.target.checked)}
                  className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                />
              </label>
              
              <label className="flex items-center justify-between p-3 bg-dark-900 rounded-lg border border-dark-700 cursor-pointer">
                <span className="text-gray-300">Show Damage Numbers</span>
                <input
                  type="checkbox"
                  checked={settings.showDamageNumbers}
                  onChange={(e) => handleSettingChange('showDamageNumbers', e.target.checked)}
                  className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                />
              </label>
            </div>
          </div>
          
          {/* Gameplay Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Palette size={24} className="text-primary-500" />
              <h2 className="text-xl font-bold text-white">Gameplay</h2>
            </div>
            
            <div className="space-y-3 pl-8">
              <label className="flex items-center justify-between p-3 bg-dark-900 rounded-lg border border-dark-700 cursor-pointer">
                <span className="text-gray-300">Auto-loot Items</span>
                <input
                  type="checkbox"
                  checked={settings.autoLoot}
                  onChange={(e) => handleSettingChange('autoLoot', e.target.checked)}
                  className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                />
              </label>
            </div>
          </div>
          
          {/* About */}
          <div className="border-t border-dark-700 pt-6">
            <h2 className="text-xl font-bold text-white mb-3">About</h2>
            <div className="space-y-2 text-sm text-gray-400">
              <p>Ashbee Realms v1.0.0</p>
              <p>A Twitch-integrated RPG adventure</p>
              <p className="pt-3 border-t border-dark-800">
                Made with ❤️ by the Ashbee Realms team
              </p>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button onClick={handleClose} className="btn-primary flex-1">
              Save Changes
            </button>
            <button onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
