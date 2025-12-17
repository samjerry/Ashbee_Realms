import React, { useState, useEffect } from 'react';
import { Cloud, Sun, Snowflake, Leaf, Skull, Heart } from 'lucide-react';

const BroadcasterSetup = () => {
  const [channel, setChannel] = useState('');
  const [gameState, setGameState] = useState({
    weather: 'Clear',
    time_of_day: 'Day',
    season: 'Spring',
    game_mode: 'softcore'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get channel from API
    fetch('/api/player/channel')
      .then(res => res.json())
      .then(data => {
        const channelName = data.channel || 'default';
        setChannel(channelName);
        
        // Try to load existing game state
        return fetch(`/api/game-state?channel=${channelName}`);
      })
      .then(res => res.json())
      .then(data => {
        if (data.gameState) {
          setGameState(data.gameState);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setError('Failed to load configuration');
        setIsLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/game-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          ...gameState
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save game state');
      }

      // Redirect to adventure after successful setup
      window.location.href = '/adventure';
    } catch (err) {
      console.error('Error saving game state:', err);
      setError(err.message || 'Failed to save configuration');
      setIsSaving(false);
    }
  };

  const weatherOptions = [
    { value: 'Clear', label: 'Clear', icon: Sun },
    { value: 'Rain', label: 'Rain', icon: Cloud },
    { value: 'Snow', label: 'Snow', icon: Snowflake },
    { value: 'Fog', label: 'Fog', icon: Cloud },
    { value: 'Storm', label: 'Storm', icon: Cloud }
  ];

  const timeOfDayOptions = [
    { value: 'Dawn', label: 'Dawn' },
    { value: 'Day', label: 'Day' },
    { value: 'Dusk', label: 'Dusk' },
    { value: 'Night', label: 'Night' }
  ];

  const seasonOptions = [
    { value: 'Spring', label: 'Spring', icon: Leaf },
    { value: 'Summer', label: 'Summer', icon: Sun },
    { value: 'Autumn', label: 'Autumn', icon: Leaf },
    { value: 'Winter', label: 'Winter', icon: Snowflake }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-900 rounded-lg shadow-2xl border border-gray-800 p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-500 mb-2">⚔️ Game Setup</h1>
          <p className="text-gray-400">
            Configure your game world settings. These will affect all players in your channel.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Weather Selection */}
          <div>
            <label className="block text-white font-semibold mb-3">
              <Cloud className="inline-block w-5 h-5 mr-2" />
              Weather
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {weatherOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGameState({ ...gameState, weather: option.value })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      gameState.weather === option.value
                        ? 'border-red-500 bg-red-500/20 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Icon className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">{option.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time of Day Selection */}
          <div>
            <label className="block text-white font-semibold mb-3">
              <Sun className="inline-block w-5 h-5 mr-2" />
              Time of Day
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {timeOfDayOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGameState({ ...gameState, time_of_day: option.value })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    gameState.time_of_day === option.value
                      ? 'border-red-500 bg-red-500/20 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Season Selection */}
          <div>
            <label className="block text-white font-semibold mb-3">
              <Leaf className="inline-block w-5 h-5 mr-2" />
              Season
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {seasonOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGameState({ ...gameState, season: option.value })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      gameState.season === option.value
                        ? 'border-red-500 bg-red-500/20 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Icon className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">{option.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Game Mode Selection */}
          <div>
            <label className="block text-white font-semibold mb-3">
              Game Mode
            </label>
            <p className="text-gray-400 text-sm mb-3">
              This setting determines what happens when players die.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setGameState({ ...gameState, game_mode: 'softcore' })}
                className={`p-6 rounded-lg border-2 transition-all ${
                  gameState.game_mode === 'softcore'
                    ? 'border-green-500 bg-green-500/20 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <Heart className="w-8 h-8 mx-auto mb-3" />
                <div className="font-bold text-lg mb-2">Softcore</div>
                <div className="text-sm">
                  Players lose some gold and XP on death, but keep their character and progress.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGameState({ ...gameState, game_mode: 'hardcore' })}
                className={`p-6 rounded-lg border-2 transition-all ${
                  gameState.game_mode === 'hardcore'
                    ? 'border-red-500 bg-red-500/20 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <Skull className="w-8 h-8 mx-auto mb-3" />
                <div className="font-bold text-lg mb-2">Hardcore</div>
                <div className="text-sm">
                  Character is permanently deleted on death. Only permanent progression (souls, passives) is kept.
                </div>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSaving}
              className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all ${
                isSaving
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/50'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save & Start Game'}
            </button>
          </div>

          <div className="text-center text-gray-500 text-sm">
            You can change these settings later from the operator menu.
          </div>
        </form>
      </div>
    </div>
  );
};

export default BroadcasterSetup;
