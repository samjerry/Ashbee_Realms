import React, { useState, useMemo, useEffect } from 'react';
import { Compass, Map, AlertTriangle } from 'lucide-react';
import GridCell from './GridCell';
import { calculateTileDistance, generateTileHint } from '../../utils/tileHelpers';
import biomeGrids from '../../data/biome_grids.json';

/**
 * BiomeGridMap Component
 * Renders a grid for the current biome with fog of war
 * 
 * @param {Object} props
 * @param {string} props.biomeId - Current biome identifier
 * @param {Object} props.mapKnowledge - Player's map knowledge
 * @param {Function} props.onTileAction - Handler for tile actions (explore, scout, move, enter)
 * @param {Function} props.onClose - Handler to close the biome grid view
 */
const BiomeGridMap = ({ biomeId, mapKnowledge, onTileAction, onClose }) => {
  const [selectedTile, setSelectedTile] = useState(null);
  const [hoveredTile, setHoveredTile] = useState(null);
  const [actionMode, setActionMode] = useState('explore'); // 'explore', 'scout', 'move'
  
  // Get biome grid configuration
  const biomeGrid = biomeGrids[biomeId];
  
  if (!biomeGrid) {
    return (
      <div className="card p-6 text-center">
        <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
        <p className="text-white text-lg mb-2">Biome Grid Not Available</p>
        <p className="text-gray-400 mb-4">
          Grid exploration is not yet available for this biome.
        </p>
        <button onClick={onClose} className="btn-primary">
          Return to World Map
        </button>
      </div>
    );
  }
  
  const { grid_size, starting_position, tile_locations } = biomeGrid;
  
  // Get biome knowledge
  const biomeKnowledge = mapKnowledge?.biome_map_knowledge?.[biomeId] || {
    discovered_tiles: [starting_position],
    scouted_tiles: {},
    fog_hints: {},
    current_position: starting_position
  };
  
  const currentPosition = biomeKnowledge.current_position || starting_position;
  
  // Helper to get tile data
  const getTileData = (x, y) => {
    const coordStr = `${x},${y}`;
    return tile_locations[coordStr] || null;
  };
  
  // Helper to get fog state
  const getFogState = (x, y) => {
    const coord = [x, y];
    const coordStr = `${x},${y}`;
    
    // Check if discovered
    const isDiscovered = biomeKnowledge.discovered_tiles.some(
      tile => tile[0] === x && tile[1] === y
    );
    if (isDiscovered) return 'revealed';
    
    // Check if scouted
    if (biomeKnowledge.scouted_tiles[coordStr]) return 'thin';
    
    return 'deep';
  };
  
  // Helper to check if player is at position
  const isPlayerAt = (x, y) => {
    return currentPosition && currentPosition[0] === x && currentPosition[1] === y;
  };
  
  // Calculate distance from current position
  const getDistance = (x, y) => {
    return calculateTileDistance(currentPosition, [x, y]);
  };
  
  // Handle tile click
  const handleTileClick = (x, y) => {
    const coord = [x, y];
    const tileData = getTileData(x, y);
    const fogState = getFogState(x, y);
    const distance = getDistance(x, y);
    
    setSelectedTile({ coord, tileData, fogState, distance });
  };
  
  // Handle tile hover
  const handleTileHover = (x, y) => {
    const coord = [x, y];
    const tileData = getTileData(x, y);
    const fogState = getFogState(x, y);
    const distance = getDistance(x, y);
    
    setHoveredTile({ coord, tileData, fogState, distance });
  };
  
  // Handle action execution
  const executeAction = () => {
    if (!selectedTile) return;
    
    const { coord, tileData, fogState } = selectedTile;
    
    if (actionMode === 'scout' && fogState === 'deep') {
      onTileAction('scout', coord, tileData);
    } else if (actionMode === 'explore' && fogState !== 'revealed') {
      onTileAction('explore', coord, tileData);
    } else if (actionMode === 'move' && fogState === 'revealed') {
      onTileAction('move', coord, tileData);
    } else if (tileData?.type === 'sublocation' && fogState === 'revealed') {
      onTileAction('enter', coord, tileData);
    }
    
    setSelectedTile(null);
  };
  
  // Get available actions for selected tile
  const getAvailableActions = () => {
    if (!selectedTile) return [];
    
    const { coord, tileData, fogState, distance } = selectedTile;
    const actions = [];
    
    if (fogState === 'deep' && distance === 1) {
      actions.push({ id: 'scout', label: 'Scout', description: 'Peek at this tile (no encounter)' });
    }
    
    if (fogState !== 'revealed') {
      actions.push({ id: 'explore', label: 'Explore', description: 'Fully explore this tile (may encounter enemies)' });
    }
    
    if (fogState === 'revealed' && !isPlayerAt(coord[0], coord[1])) {
      actions.push({ id: 'move', label: 'Move', description: 'Move to this tile (no encounter)' });
    }
    
    if (tileData?.type === 'sublocation' && fogState === 'revealed') {
      actions.push({ id: 'enter', label: 'Enter', description: 'Enter this location' });
    }
    
    return actions;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Map size={24} className="text-primary-500" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {biomeId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} - Grid Exploration
              </h2>
              <p className="text-sm text-gray-400">
                Current Position: [{currentPosition[0]}, {currentPosition[1]}]
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-secondary text-sm">
            World Map
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div className="bg-dark-900 rounded p-2">
            <p className="text-gray-400 text-xs">Discovered</p>
            <p className="text-white font-bold">{biomeKnowledge.discovered_tiles.length}</p>
          </div>
          <div className="bg-dark-900 rounded p-2">
            <p className="text-gray-400 text-xs">Scouted</p>
            <p className="text-white font-bold">{Object.keys(biomeKnowledge.scouted_tiles).length}</p>
          </div>
          <div className="bg-dark-900 rounded p-2">
            <p className="text-gray-400 text-xs">Grid Size</p>
            <p className="text-white font-bold">{grid_size.width}x{grid_size.height}</p>
          </div>
          <div className="bg-dark-900 rounded p-2">
            <p className="text-gray-400 text-xs">Total Tiles</p>
            <p className="text-white font-bold">{Object.keys(tile_locations).length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Grid Container */}
        <div className="lg:col-span-2">
          <div className="card p-4 sm:p-6">
            <div className="biome-grid-container">
              {/* Coordinate Labels - Top */}
              <div className="flex mb-1">
                <div className="w-8"></div>
                {Array.from({ length: grid_size.width }).map((_, x) => (
                  <div
                    key={`top-${x}`}
                    className="flex-1 text-center text-xs text-gray-400 font-mono"
                  >
                    {x}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="space-y-1">
                {Array.from({ length: grid_size.height }).map((_, y) => (
                  <div key={y} className="flex gap-1">
                    {/* Y-axis label */}
                    <div className="w-8 flex items-center justify-center text-xs text-gray-400 font-mono">
                      {y}
                    </div>
                    
                    {/* Grid cells */}
                    {Array.from({ length: grid_size.width }).map((_, x) => {
                      const tileData = getTileData(x, y);
                      const fogState = getFogState(x, y);
                      const isPlayerHere = isPlayerAt(x, y);
                      const distance = getDistance(x, y);
                      const coordStr = `${x},${y}`;
                      const scoutedData = biomeKnowledge.scouted_tiles[coordStr];
                      
                      return (
                        <div key={`${x}-${y}`} className="flex-1">
                          <GridCell
                            coordinate={[x, y]}
                            biomeId={biomeId}
                            tileData={tileData}
                            fogState={fogState}
                            isPlayerHere={isPlayerHere}
                            scoutedData={scoutedData}
                            distance={distance}
                            onClick={() => handleTileClick(x, y)}
                            onHover={() => handleTileHover(x, y)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Coordinate Labels - Bottom */}
              <div className="flex mt-1">
                <div className="w-8"></div>
                {Array.from({ length: grid_size.width }).map((_, x) => (
                  <div
                    key={`bottom-${x}`}
                    className="flex-1 text-center text-xs text-gray-400 font-mono"
                  >
                    {x}
                  </div>
                ))}
              </div>

              {/* Compass */}
              <div className="mt-4 text-center font-mono text-gray-400 text-xs">
                <div>N</div>
                <div>↑</div>
                <div>W ← + → E</div>
                <div>↓</div>
                <div>S</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tile Info Panel */}
        <div className="lg:col-span-1">
          <div className="card p-4 sm:p-6 sticky top-6">
            {selectedTile ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {selectedTile.tileData?.name || `Tile [${selectedTile.coord[0]}, ${selectedTile.coord[1]}]`}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {selectedTile.fogState === 'revealed' 
                      ? selectedTile.tileData?.description || 'An empty area'
                      : selectedTile.fogState === 'thin'
                      ? 'You have scouted this area...'
                      : generateTileHint(selectedTile.tileData)}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Fog State:</span>
                    <span className="text-white font-bold capitalize">{selectedTile.fogState}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Distance:</span>
                    <span className="text-white font-bold">{selectedTile.distance}</span>
                  </div>
                  {selectedTile.tileData?.danger_level && selectedTile.fogState === 'revealed' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Danger Level:</span>
                      <span className="text-white font-bold">{selectedTile.tileData.danger_level}</span>
                    </div>
                  )}
                </div>

                {/* Available Actions */}
                <div className="space-y-2">
                  {getAvailableActions().map(action => (
                    <button
                      key={action.id}
                      onClick={() => {
                        setActionMode(action.id);
                        executeAction();
                      }}
                      className={`w-full btn ${
                        action.id === 'enter' ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                  {getAvailableActions().length === 0 && (
                    <p className="text-center text-gray-500 text-sm">
                      No actions available
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Compass size={48} className="mx-auto mb-3 opacity-50" />
                <p>Select a tile to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-4">
        <h3 className="text-sm font-bold text-white mb-3">Legend</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-primary-500">[@]</span>
            <span className="text-gray-300">Your Position</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-gray-600">░░░</span>
            <span className="text-gray-300">Deep Fog</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-gray-500">▓▓▓</span>
            <span className="text-gray-300">Thin Fog (Scouted)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-green-500">TC</span>
            <span className="text-gray-300">Revealed Tile</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-yellow-500">⚔️</span>
            <span className="text-gray-300">Encounter Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-yellow-500">💎</span>
            <span className="text-gray-300">Loot Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-gray-500">🔒</span>
            <span className="text-gray-300">Requirement Lock</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-yellow-500">!</span>
            <span className="text-gray-300">Danger Badge</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiomeGridMap;