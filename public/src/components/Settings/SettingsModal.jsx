import React, { useState, useEffect } from 'react';
import { X, Volume2, Bell, Eye, Palette } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const THEMES = [
  { 
    id: 'crimson-knight', 
    name: 'Crimson Knight', 
    colors: {
      50: '254 242 242', 100: '254 226 226', 200: '254 202 202', 300: '252 165 165',
      400: '248 113 113', 500: '239 68 68', 600: '220 38 38', 700: '185 28 28',
      800: '153 27 27', 900: '127 29 29'
    },
    bg: '10 10 15',
    preview: '#dc2626'
  },
  { 
    id: 'lovecraftian', 
    name: 'Lovecraftian Depths', 
    colors: {
      50: '240 253 244', 100: '220 252 231', 200: '187 247 208', 300: '134 239 172',
      400: '74 222 128', 500: '34 197 94', 600: '21 128 61', 700: '20 83 45',
      800: '22 101 52', 900: '20 83 45'
    },
    bg: '2 6 23',
    preview: '#15803d'
  },
  { 
    id: 'azure-mage', 
    name: 'Azure Mage', 
    colors: {
      50: '239 246 255', 100: '219 234 254', 200: '191 219 254', 300: '147 197 253',
      400: '96 165 250', 500: '59 130 246', 600: '37 99 235', 700: '29 78 216',
      800: '30 64 175', 900: '30 58 138'
    },
    bg: '15 23 42',
    preview: '#2563eb'
  },
  { 
    id: 'golden-paladin', 
    name: 'Golden Paladin', 
    colors: {
      50: '254 252 232', 100: '254 249 195', 200: '254 240 138', 300: '253 224 71',
      400: '250 204 21', 500: '234 179 8', 600: '202 138 4', 700: '161 98 7',
      800: '133 77 14', 900: '113 63 18'
    },
    bg: '24 24 27',
    preview: '#ca8a04'
  },
  { 
    id: 'shadow-assassin', 
    name: 'Shadow Assassin', 
    colors: {
      50: '250 245 255', 100: '243 232 255', 200: '233 213 255', 300: '216 180 254',
      400: '192 132 252', 500: '168 85 247', 600: '124 58 237', 700: '109 40 217',
      800: '91 33 182', 900: '76 29 149'
    },
    bg: '12 10 9',
    preview: '#7c3aed'
  },
  { 
    id: 'frost-warden', 
    name: 'Frost Warden', 
    colors: {
      50: '240 249 255', 100: '224 242 254', 200: '186 230 253', 300: '125 211 252',
      400: '56 189 248', 500: '14 165 233', 600: '8 145 178', 700: '14 116 144',
      800: '21 94 117', 900: '22 78 99'
    },
    bg: '10 10 15',
    preview: '#0891b2'
  },
];

const SettingsModal = () => {
  const { showSettings, closeSettings } = useGameStore();
  const [settings, setSettings] = useState({
    volume: 70,
    sfxVolume: 80,
    notifications: true,
    combatAnimations: true,
    showDamageNumbers: true,
    autoLoot: true,
    theme: 'crimson-knight',
  });

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('gameSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
      applyTheme(parsed.theme);
    }
  }, []);

  const applyTheme = (themeId) => {
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    Object.entries(theme.colors).forEach(([shade, rgb]) => {
      document.documentElement.style.setProperty(`--color-primary-${shade}`, rgb);
    });
    document.documentElement.style.setProperty('--color-bg-950', theme.bg);
  };

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);
  
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

          {/* Theme Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Palette size={24} className="text-primary-500" />
              <h2 className="text-xl font-bold text-white">Theme</h2>
            </div>
            
            <div className="pl-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => handleSettingChange('theme', theme.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      settings.theme === theme.id
                        ? 'border-primary-500 bg-dark-800'
                        : 'border-dark-700 bg-dark-900 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: theme.preview }}
                      />
                      <span className="text-gray-300 font-medium">{theme.name}</span>
                    </div>
                  </button>
                ))}
              </div>
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
                Made with ❤️ by MarrowOfAlbion
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
