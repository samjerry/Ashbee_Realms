import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

const WorldNameSetup = ({ channel }) => {
  const [worldName, setWorldName] = useState('');
  const [currentWorldName, setCurrentWorldName] = useState('Ashbee Realms');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Fetch current world name
    fetch(`/api/setup/world-name?channel=${channel}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentWorldName(data.worldName);
          setWorldName(data.worldName);
        }
      })
      .catch(err => {
        console.error('Error fetching world name:', err);
      });
  }, [channel]);

  const handleSave = async () => {
    if (!worldName.trim()) {
      setError('World name cannot be empty');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/setup/world-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldName })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(data.error || 'Failed to save world name');
      }

      const data = await response.json();

      if (data.success) {
        setCurrentWorldName(data.worldName);
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to save world name');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-dark-900 rounded-lg p-6 space-y-4">
      <div className="flex items-center space-x-3">
        <Globe size={32} className="text-primary-500" />
        <div>
          <h2 className="text-2xl font-bold text-white">World Name</h2>
          <p className="text-gray-400 text-sm">
            Personalize your game instance with a custom world name
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Custom World Name
        </label>
        <input
          type="text"
          value={worldName}
          onChange={(e) => setWorldName(e.target.value)}
          maxLength={50}
          placeholder="e.g., Shadowlands, Valorheim, The Forgotten Realm"
          className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
        />
        <p className="text-xs text-gray-500">
          This will replace "Ashbee Realms" throughout your game instance
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/30 border border-green-700 rounded p-3 text-green-300 text-sm">
          ✅ World name saved successfully!
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || worldName === currentWorldName}
        className={`w-full py-3 rounded-lg font-bold transition-all ${
          saving || worldName === currentWorldName
            ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 text-white'
        }`}
      >
        {saving ? 'Saving...' : 'Save World Name'}
      </button>

      <div className="bg-dark-800 border border-dark-700 rounded p-4">
        <p className="text-sm text-gray-400">
          <strong className="text-white">Preview:</strong> Welcome to{' '}
          <span className="text-primary-400 font-bold">{worldName || 'Ashbee Realms'}</span>!
        </p>
      </div>
    </div>
  );
};

export default WorldNameSetup;
