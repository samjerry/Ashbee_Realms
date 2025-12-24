import React, { useState } from 'react';
import { getAdjacentCoordinate, calculateDistance } from '../../utils/tileHelpers';

/**
 * MapActions Component
 * Action panel for biome grid exploration
 * Allows scouting, exploring, and moving between tiles
 * 
 * @param {Object} props
 * @param {string} props.biomeId - Current biome identifier
 * @param {Array} props.playerPosition - Player's current position [x, y]
 * @param {Array} props.selectedTile - Selected tile coordinate [x, y]
 * @param {Object} props.gridConfig - Grid configuration
 * @param {Object} props.playerKnowledge - Player's knowledge of biome
 * @param {string} props.channel - Channel name for API calls
 * @param {Function} props.onActionComplete - Callback after action completes
 */
const MapActions = ({ 
  biomeId, 
  playerPosition, 
  selectedTile,
  gridConfig,
  playerKnowledge,
  channel,
  onActionComplete 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Check if tile is discovered
  const isTileDiscovered = (coord) => {
    if (!playerKnowledge?.discovered_tiles) return false;
    return playerKnowledge.discovered_tiles.some(
      tile => tile[0] === coord[0] && tile[1] === coord[1]
    );
  };

  // Check if tile is scouted
  const isTileScouted = (coord) => {
    if (!playerKnowledge?.scouted_tiles) return false;
    const key = `${coord[0]},${coord[1]}`;
    return !!playerKnowledge.scouted_tiles[key];
  };

  // Calculate distance to selected tile
  const distance = selectedTile && playerPosition 
    ? calculateDistance(playerPosition, selectedTile)
    : null;

  // Scout a direction
  const handleScout = async (direction) => {
    if (!playerPosition) return;
    
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const targetCoord = getAdjacentCoordinate(playerPosition, direction);
    
    try {
      const response = await fetch('/api/map/scout-tile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          biome_id: biomeId,
          coordinate: targetCoord
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`Scouted tile: ${data.hint}`);
        if (onActionComplete) onActionComplete(data);
      } else {
        setError(data.error || 'Failed to scout');
      }
    } catch (err) {
      setError('Network error while scouting');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Explore a tile
  const handleExplore = async () => {
    if (!selectedTile) {
      setError('Please select a tile to explore');
      return;
    }

    if (isTileDiscovered(selectedTile)) {
      setError('Tile already explored. Use Travel instead.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/map/explore-tile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          biome_id: biomeId,
          coordinate: selectedTile
        })
      });

      const data = await response.json();
      
      if (data.success) {
        let msg = data.message;
        if (data.encounter) {
          msg += ` - ${data.encounter.message}`;
        }
        setMessage(msg);
        if (onActionComplete) onActionComplete(data);
      } else {
        setError(data.error || 'Failed to explore');
      }
    } catch (err) {
      setError('Network error while exploring');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Move to a tile
  const handleMove = async () => {
    if (!selectedTile) {
      setError('Please select a tile to move to');
      return;
    }

    if (!isTileDiscovered(selectedTile)) {
      setError('Cannot move to undiscovered tile');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/map/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          biome_id: biomeId,
          coordinate: selectedTile
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        if (onActionComplete) onActionComplete(data);
      } else {
        setError(data.error || 'Failed to move');
      }
    } catch (err) {
      setError('Network error while moving');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="map-actions p-4 bg-gray-800/50 border border-gray-700 rounded">
      <h3 className="text-lg font-bold mb-3">Actions</h3>

      {/* Scout Direction Buttons */}
      <div className="scout-section mb-4">
        <h4 className="text-sm font-semibold mb-2">Scout Adjacent Tiles</h4>
        <div className="scout-grid grid grid-cols-3 gap-2 w-32 mx-auto">
          <div></div>
          <button
            onClick={() => handleScout('N')}
            disabled={isLoading}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
          >
            N
          </button>
          <div></div>
          
          <button
            onClick={() => handleScout('W')}
            disabled={isLoading}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
          >
            W
          </button>
          <div className="flex items-center justify-center text-gray-500 text-xs">
            Scout
          </div>
          <button
            onClick={() => handleScout('E')}
            disabled={isLoading}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
          >
            E
          </button>
          
          <div></div>
          <button
            onClick={() => handleScout('S')}
            disabled={isLoading}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
          >
            S
          </button>
          <div></div>
        </div>
      </div>

      {/* Explore/Move Buttons */}
      <div className="action-buttons flex flex-col gap-2">
        <button
          onClick={handleExplore}
          disabled={isLoading || !selectedTile || isTileDiscovered(selectedTile)}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded font-semibold"
        >
          Explore Selected Tile
        </button>
        
        <button
          onClick={handleMove}
          disabled={isLoading || !selectedTile || !isTileDiscovered(selectedTile)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-semibold"
        >
          Travel to Selected Tile
        </button>
      </div>

      {/* Selected Tile Info */}
      {selectedTile && (
        <div className="selected-info mt-3 p-2 bg-gray-700/50 rounded text-sm">
          <p className="font-semibold">Selected: [{selectedTile[0]}, {selectedTile[1]}]</p>
          {distance !== null && (
            <p className="text-gray-400">Distance: {distance} tiles</p>
          )}
          {isTileDiscovered(selectedTile) && (
            <p className="text-green-400">✓ Discovered</p>
          )}
          {isTileScouted(selectedTile) && !isTileDiscovered(selectedTile) && (
            <p className="text-blue-400">👁 Scouted</p>
          )}
          {!isTileDiscovered(selectedTile) && !isTileScouted(selectedTile) && (
            <p className="text-gray-500">Unexplored</p>
          )}
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className="message mt-3 p-2 bg-green-900/30 border border-green-700 rounded text-sm text-green-300">
          {message}
        </div>
      )}
      
      {error && (
        <div className="error mt-3 p-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Warnings */}
      {distance > 1 && selectedTile && !isTileDiscovered(selectedTile) && (
        <div className="warning mt-3 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-300">
          ⚠ Exploring distant tiles ({distance} away) increases encounter risk!
        </div>
      )}
    </div>
  );
};

export default MapActions;
