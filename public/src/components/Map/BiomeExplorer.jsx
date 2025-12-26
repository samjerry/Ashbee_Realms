import React, { useState, useEffect } from 'react';
import BiomeGridMap from './BiomeGridMap';
import MapActions from './MapActions';

/**
 * BiomeExplorer Component
 * Main view for biome grid exploration system
 * Fetches biome grid data and player knowledge, manages state
 * 
 * @param {Object} props
 * @param {string} props.biomeId - Biome to explore
 * @param {string} props.channel - Channel name for API calls
 */
const BiomeExplorer = ({ biomeId = 'town_square', channel }) => {
  const [gridConfig, setGridConfig] = useState(null);
  const [playerKnowledge, setPlayerKnowledge] = useState(null);
  const [selectedTile, setSelectedTile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch biome grid data and player knowledge
  const fetchBiomeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/map/grid/${biomeId}?channel=${channel}`);
      const data = await response.json();

      if (data.success) {
        setGridConfig(data.grid_config);
        setPlayerKnowledge(data.player_knowledge);
      } else {
        setError(data.error || 'Failed to load biome data');
      }
    } catch (err) {
      setError('Network error loading biome data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (biomeId && channel) {
      fetchBiomeData();
    }
  }, [biomeId, channel]);

  // Handle tile click
  const handleTileClick = (coordinate) => {
    setSelectedTile(coordinate);
  };

  // Handle action completion (refresh data)
  const handleActionComplete = async (result) => {
    // Refresh biome data after action
    await fetchBiomeData();
    
    // Clear selection if we moved/explored
    if (result.new_position) {
      setSelectedTile(null);
    }
  };

  if (loading) {
    return (
      <div className="biome-explorer p-8 text-center">
        <div className="text-gray-400">Loading biome exploration data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="biome-explorer p-8">
        <div className="bg-red-900/30 border border-red-700 rounded p-4 text-red-300">
          Error: {error}
        </div>
        <button 
          onClick={fetchBiomeData}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!gridConfig || !playerKnowledge) {
    return (
      <div className="biome-explorer p-8 text-center">
        <div className="text-gray-400">No biome data available</div>
      </div>
    );
  }

  return (
    <div className="biome-explorer p-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Map Area */}
        <div className="lg:col-span-2">
          <BiomeGridMap
            biomeId={biomeId}
            gridConfig={gridConfig}
            playerKnowledge={playerKnowledge}
            onTileClick={handleTileClick}
            channel={channel}
          />
        </div>

        {/* Actions Panel */}
        <div className="lg:col-span-1">
          <MapActions
            biomeId={biomeId}
            playerPosition={playerKnowledge.current_position}
            selectedTile={selectedTile}
            gridConfig={gridConfig}
            playerKnowledge={playerKnowledge}
            channel={channel}
            onActionComplete={handleActionComplete}
          />
          
          {/* Info Panel */}
          <div className="info-panel mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded">
            <h3 className="text-lg font-bold mb-2">Exploration Info</h3>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-400">Discovered Tiles:</span>{' '}
                <span className="text-primary-400 font-semibold">
                  {playerKnowledge.discovered_tiles?.length || 0}
                </span>
              </p>
              <p>
                <span className="text-gray-400">Scouted Tiles:</span>{' '}
                <span className="text-blue-400 font-semibold">
                  {Object.keys(playerKnowledge.scouted_tiles || {}).length}
                </span>
              </p>
              <p className="mt-3 text-xs text-gray-500 italic">
                Click tiles to select them, then use the action buttons to scout, explore, or travel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiomeExplorer;
