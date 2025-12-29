import React, { useState, useEffect } from 'react';
import { Settings, Globe, Gamepad2, Cloud, Sun, Snowflake, Save, AlertCircle } from 'lucide-react';

const SetupView = () => {
  const [settings, setSettings] = useState({
    worldName: 'Ashbee Realms',
    gameMode: 'softcore',
    weather: 'Clear',
    timeOfDay: 'Day',
    season: 'Spring',
    maintenanceMode: false
  });
  
  const [originalSettings, setOriginalSettings] = useState(null);
  const [isExistingSetup, setIsExistingSetup] = useState(false);
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Check for changes whenever settings update
  useEffect(() => {
    if (originalSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(changed);
    }
  }, [settings, originalSettings]);

  // Warn user if they have unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/setup/settings', {
        credentials: 'same-origin'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        setOriginalSettings(data.settings);
        setIsExistingSetup(data.isExistingSetup);
        setChannel(data.channel);
      } else {
        setError(data.error || 'Failed to load settings');
      }
    } catch (err) {
      setError('Network error loading settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      const response = await fetch('/api/setup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setOriginalSettings(settings);
        setIsExistingSetup(true);
        setHasChanges(false);
        
        // Show success message briefly
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Network error saving settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      setHasChanges(false);
    }
  };

  const getChangedFields = () => {
    if (!originalSettings) return [];
    
    const changed = [];
    Object.keys(settings).forEach(key => {
      if (settings[key] !== originalSettings[key]) {
        changed.push(key);
      }
    });
    return changed;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your settings...</p>
        </div>
      </div>
    );
  }

  const changedFields = getChangedFields();

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-2">
            <Settings size={32} className="text-red-500" />
            <h1 className="text-3xl font-bold text-white">
              {isExistingSetup ? 'Edit Game Settings' : 'Game Setup'}
            </h1>
          </div>
          <p className="text-gray-400">
            {isExistingSetup 
              ? `Update your game settings for ${channel}. Changes will take effect immediately.`
              : `Configure your game instance for ${channel}. You can change these anytime.`
            }
          </p>
          
          {isExistingSetup && (
            <div className="mt-3 flex items-center space-x-2 text-sm text-yellow-400">
              <AlertCircle size={16} />
              <span>You have existing settings. Make changes and save to update.</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-green-300">
            ✅ Settings saved successfully!
          </div>
        )}

        {/* World Name */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <Globe size={24} className="text-red-500" />
            <h2 className="text-xl font-bold text-white">World Name</h2>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              changedFields.includes('worldName') ? 'text-yellow-400' : 'text-gray-300'
            }`}>
              Custom World Name {changedFields.includes('worldName') && '(Modified)'}
            </label>
            <input
              type="text"
              value={settings.worldName}
              onChange={(e) => setSettings({ ...settings, worldName: e.target.value })}
              maxLength={50}
              placeholder="Ashbee Realms"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Personalize your game world (max 50 characters)
            </p>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded p-3">
            <p className="text-sm text-gray-400">
              <strong className="text-white">Preview:</strong> Welcome to{' '}
              <span className="text-red-400 font-bold">{settings.worldName || 'Ashbee Realms'}</span>!
            </p>
          </div>
        </div>

        {/* Game Mode */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <Gamepad2 size={24} className="text-red-500" />
            <h2 className="text-xl font-bold text-white">Game Mode</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['softcore', 'hardcore', 'ironman'].map((mode) => (
              <button
                key={mode}
                onClick={() => setSettings({ ...settings, gameMode: mode })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.gameMode === mode
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="text-center">
                  <p className="font-bold text-white capitalize">{mode}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {mode === 'softcore' && 'Standard difficulty'}
                    {mode === 'hardcore' && 'Permadeath enabled'}
                    {mode === 'ironman' && 'No trading or help'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Environment Settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <Cloud size={24} className="text-red-500" />
            <h2 className="text-xl font-bold text-white">Environment</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weather */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                changedFields.includes('weather') ? 'text-yellow-400' : 'text-gray-300'
              }`}>
                Weather {changedFields.includes('weather') && '(Modified)'}
              </label>
              <select
                value={settings.weather}
                onChange={(e) => setSettings({ ...settings, weather: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
              >
                <option value="Clear">Clear ☀️</option>
                <option value="Rain">Rain 🌧️</option>
                <option value="Snow">Snow ❄️</option>
                <option value="Storm">Storm ⛈️</option>
                <option value="Fog">Fog 🌫️</option>
              </select>
            </div>
            
            {/* Time of Day */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                changedFields.includes('timeOfDay') ? 'text-yellow-400' : 'text-gray-300'
              }`}>
                Time of Day {changedFields.includes('timeOfDay') && '(Modified)'}
              </label>
              <select
                value={settings.timeOfDay}
                onChange={(e) => setSettings({ ...settings, timeOfDay: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
              >
                <option value="Day">Day ☀️</option>
                <option value="Night">Night 🌙</option>
                <option value="Dawn">Dawn 🌅</option>
                <option value="Dusk">Dusk 🌇</option>
              </select>
            </div>
            
            {/* Season */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                changedFields.includes('season') ? 'text-yellow-400' : 'text-gray-300'
              }`}>
                Season {changedFields.includes('season') && '(Modified)'}
              </label>
              <select
                value={settings.season}
                onChange={(e) => setSettings({ ...settings, season: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
              >
                <option value="Spring">Spring 🌸</option>
                <option value="Summer">Summer ☀️</option>
                <option value="Autumn">Autumn 🍂</option>
                <option value="Winter">Winter ❄️</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-2 ${
                saving || !hasChanges
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <Save size={20} />
              <span>{saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}</span>
            </button>
            
            {hasChanges && (
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 text-white transition-all"
              >
                Reset
              </button>
            )}
          </div>
          
          {hasChanges && (
            <p className="text-sm text-yellow-400 mt-3 text-center">
              ⚠️ You have unsaved changes
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupView;
