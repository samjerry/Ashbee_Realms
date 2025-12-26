import React, { useState, useEffect } from 'react';
import BiomeGridCell from './BiomeGridCell';
import { coordToKey } from '../../utils/tileHelpers';

/**
 * BiomeGridMap Component
 * Renders the grid-based exploration map for a biome
 * Displays fog of war, player position, and tile information
 * 
 * @param {Object} props
 * @param {string} props.biomeId - Current biome identifier
 * @param {Object} props.gridConfig - Grid configuration from biome_grids.json
 * @param {Object} props.playerKnowledge - Player's knowledge of this biome
 * @param {Function} props.onTileClick - Handler for tile clicks
 * @param {string} props.channel - Channel name for API calls
 */
const BiomeGridMap = ({ 
  biomeId, 
  gridConfig, 
  playerKnowledge, 
  onTileClick,
  channel 
}) => {
  const [hoveredTile, setHoveredTile] = useState(null);
  const [hintText, setHintText] = useState(null);

  const { grid_size, tile_locations } = gridConfig;
  const { width, height } = grid_size;
  const playerPosition = playerKnowledge?.current_position;

  // Fetch hint when hovering over fog tiles
  const handleTileHover = async (coordinate) => {
    const key = coordToKey(coordinate);
    const isDiscovered = playerKnowledge?.discovered_tiles?.some(
      tile => tile[0] === coordinate[0] && tile[1] === coordinate[1]
    );
    
    if (!isDiscovered) {
      try {
        const response = await fetch(
          `/api/map/fog-hint/${biomeId}/${coordinate[0]}/${coordinate[1]}?channel=${channel}`
        );
        const data = await response.json();
        if (data.success) {
          setHintText(data.hint);
        }
      } catch (error) {
        console.error('Error fetching fog hint:', error);
      }
    } else {
      setHintText(null);
    }
    
    setHoveredTile(coordinate);
  };

  // Clear hint when mouse leaves
  useEffect(() => {
    if (!hoveredTile) {
      setHintText(null);
    }
  }, [hoveredTile]);

  // Generate grid cells
  const renderGrid = () => {
    const cells = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const coordinate = [x, y];
        const key = coordToKey(coordinate);
        const tileData = tile_locations[key];
        
        cells.push(
          <BiomeGridCell
            key={key}
            coordinate={coordinate}
            tileData={tileData}
            biomeKnowledge={playerKnowledge}
            playerPosition={playerPosition}
            onClick={onTileClick}
            onHover={handleTileHover}
          />
        );
      }
    }
    
    return cells;
  };

  // Render coordinate labels
  const renderXAxisLabels = () => {
    const labels = [];
    for (let x = 0; x < width; x++) {
      labels.push(
        <div key={`x-${x}`} className="axis-label">
          {x}
        </div>
      );
    }
    return labels;
  };

  const renderYAxisLabels = () => {
    const labels = [];
    for (let y = 0; y < height; y++) {
      labels.push(
        <div key={`y-${y}`} className="axis-label">
          {y}
        </div>
      );
    }
    return labels;
  };

  return (
    <div className="biome-grid-container">
      {/* Header */}
      <div className="biome-header">
        <h2 className="text-2xl font-bold mb-2">
          Exploring: {biomeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h2>
        {playerPosition && (
          <p className="text-sm text-gray-400">
            Current Position: [{playerPosition[0]}, {playerPosition[1]}]
          </p>
        )}
      </div>

      {/* Hint Display */}
      {hintText && (
        <div className="hint-display mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded text-sm italic text-gray-300">
          {hintText}
        </div>
      )}

      {/* Grid Wrapper */}
      <div className="grid-wrapper" style={{ gap: '0px' }}>
        {/* Y-axis labels */}
        <div className="y-axis-labels" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '0px',
          paddingTop: '24px',
          margin: 0
        }}>
          {renderYAxisLabels()}
        </div>

        {/* Main grid area */}
        <div>
          {/* X-axis labels */}
          <div className="x-axis-labels" style={{ 
            display: 'flex',
            gap: '0px',
            marginBottom: '4px',
            paddingLeft: '0px'
          }}>
            {renderXAxisLabels()}
          </div>

          {/* Grid tiles */}
          <div 
            className="grid-tiles"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${width}, 64px)`,
              gridTemplateRows: `repeat(${height}, 64px)`,
              gap: '0px',
              lineHeight: 0,
              fontSize: 0,
              margin: 0,
              padding: 0
            }}
          >
            {renderGrid()}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid-legend mt-4 p-3 bg-gray-800/30 border border-gray-700 rounded">
        <h3 className="text-sm font-bold mb-2">Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">░░░</span>
            <span>Deep Fog (Unexplored)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">▓▓▓</span>
            <span>Thin Fog (Scouted)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary-400">[@]</span>
            <span>Your Position</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">!!</span>
            <span>Danger Warning</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiomeGridMap;
