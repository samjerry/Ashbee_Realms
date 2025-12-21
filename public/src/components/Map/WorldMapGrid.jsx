import React, { useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { generateWorldGrid, getDangerColor, getDangerBgColor, formatDiscoveryStats } from '../../utils/asciiMapGenerator';
import GridCell from './GridCell';
import worldGrid from '../../../data/world_grid.json';

const WorldMapGrid = ({ mapKnowledge, biomes, currentLocation, onSelectLocation }) => {
  const gridData = useMemo(() => {
    return generateWorldGrid(mapKnowledge, biomes, currentLocation?.id);
  }, [mapKnowledge, biomes, currentLocation]);

  const handleCellClick = (cell) => {
    if (cell.type === 'biome' && cell.discovered && onSelectLocation) {
      onSelectLocation(cell.biome);
    }
  };
  
  // Helper to check if a coordinate is discovered
  const isCoordinateDiscovered = (x, y) => {
    // Check if this coordinate has a biome
    const biomeEntry = Object.entries(worldGrid.biome_coordinates).find(
      ([_, coords]) => coords.x === x && coords.y === y
    );
    
    if (!biomeEntry) return false; // Empty cell
    
    const [biomeId, _] = biomeEntry;
    return mapKnowledge?.discovered_regions?.includes(biomeId) || biomeId === 'town_square';
  };
  
  // Helper to check if player is at coordinate
  const isPlayerAt = (x, y) => {
    if (!currentLocation) return false;
    const coords = worldGrid.biome_coordinates[currentLocation.id];
    return coords && coords.x === x && coords.y === y;
  };
  
  // Helper to get biome at coordinate
  const getBiomeAtCoordinate = (x, y) => {
    const biomeEntry = Object.entries(worldGrid.biome_coordinates).find(
      ([_, coords]) => coords.x === x && coords.y === y
    );
    
    if (!biomeEntry) return null;
    
    const [biomeId, coords] = biomeEntry;
    const biomeData = biomes.find(b => b.id === biomeId);
    
    if (!biomeData) return null;
    
    return {
      ...biomeData,
      abbreviation: coords.abbreviation,
      icon: coords.icon
    };
  };

  return (
    <div className="space-y-4">
      {/* Grid Container */}
      <div className="bg-dark-900 rounded-lg p-4 sm:p-6 border border-dark-700">
        {/* Header */}
        <div className="mb-4 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            ╔═══════════════════════════════════╗
          </h2>
          <h2 className="text-lg sm:text-xl font-bold text-primary-500 mb-2">
            ASHBEE REALMS - WORLD MAP
          </h2>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
            ╚═══════════════════════════════════╝
          </h2>
        </div>

        {/* Coordinate Labels - Top */}
        <div className="flex mb-1">
          <div className="w-8 sm:w-10"></div>
          {Array.from({ length: worldGrid.grid_size.width }).map((_, x) => (
            <div
              key={`top-${x}`}
              className="flex-1 text-center text-xs sm:text-sm text-gray-400 font-mono"
            >
              {x}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-1">
          {Array.from({ length: worldGrid.grid_size.height }).map((_, y) => (
            <div key={y} className="flex gap-1">
              {/* Y-axis label */}
              <div className="w-8 sm:w-10 flex items-center justify-center text-xs sm:text-sm text-gray-400 font-mono">
                {y}
              </div>
              
              {/* Grid cells */}
              {Array.from({ length: worldGrid.grid_size.width }).map((_, x) => {
                const biome = getBiomeAtCoordinate(x, y);
                const discovered = isCoordinateDiscovered(x, y);
                const playerHere = isPlayerAt(x, y);
                
                return (
                  <div
                    key={`${x}-${y}`}
                    className="flex-1"
                  >
                    <GridCell
                      coordinate={[x, y]}
                      biome={biome}
                      isDiscovered={discovered}
                      isPlayerHere={playerHere}
                      onClick={() => biome && discovered && onSelectLocation && onSelectLocation(biome)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Coordinate Labels - Bottom */}
        <div className="flex mt-1">
          <div className="w-8 sm:w-10"></div>
          {Array.from({ length: worldGrid.grid_size.width }).map((_, x) => (
            <div
              key={`bottom-${x}`}
              className="flex-1 text-center text-xs sm:text-sm text-gray-400 font-mono"
            >
              {x}
            </div>
          ))}
        </div>

        {/* Compass */}
        <div className="mt-4 text-center font-mono text-gray-400 text-xs sm:text-sm">
          <div>N</div>
          <div>↑</div>
          <div>W ← + → E</div>
          <div>↓</div>
          <div>S</div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-dark-900 rounded-lg p-4 border border-dark-700">
        <h3 className="text-lg font-bold text-white mb-3">Legend</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-primary-500">[@]</span>
            <span className="text-gray-300">Your Location</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-gray-600">░░</span>
            <span className="text-gray-300">Undiscovered Area</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-gray-500">##</span>
            <span className="text-gray-300">Unknown Region</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-green-500">TS</span>
            <span className="text-gray-300">Discovered Location</span>
          </div>
        </div>

        {/* Color coding explanation */}
        <div className="mt-4 pt-4 border-t border-dark-700">
          <p className="text-xs text-gray-400 mb-2">Danger Level Colors:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-300">Safe (0-1)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-300">Moderate (2)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-300">Challenging (3)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-gray-300">Dangerous (4)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-300">Deadly (5)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMapGrid;
