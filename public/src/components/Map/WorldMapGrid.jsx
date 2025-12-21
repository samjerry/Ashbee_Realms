import React, { useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { generateWorldGrid, getDangerColor, getDangerBgColor, formatDiscoveryStats } from '../../utils/asciiMapGenerator';

const WorldMapGrid = ({ mapKnowledge, biomes, currentLocation, onSelectLocation }) => {
  const gridData = useMemo(() => {
    return generateWorldGrid(mapKnowledge, biomes, currentLocation?.id);
  }, [mapKnowledge, biomes, currentLocation]);

  const handleCellClick = (cell) => {
    if (cell.type === 'biome' && cell.discovered && onSelectLocation) {
      onSelectLocation(cell.biome);
    }
  };

  const getCellClassName = (cell) => {
    const baseClass = 'aspect-square flex items-center justify-center text-xs font-mono font-bold border transition-all';
    
    if (cell.type === 'empty') {
      return `${baseClass} bg-dark-900 border-dark-800 text-gray-700 cursor-default`;
    }
    
    if (!cell.discovered) {
      return `${baseClass} bg-dark-800 border-dark-700 text-gray-600 cursor-default`;
    }
    
    if (cell.isCurrent) {
      return `${baseClass} ${getDangerBgColor(cell.dangerLevel)} ${getDangerColor(cell.dangerLevel)} ring-2 ring-primary-500 cursor-pointer hover:scale-110`;
    }
    
    return `${baseClass} ${getDangerBgColor(cell.dangerLevel)} ${getDangerColor(cell.dangerLevel)} cursor-pointer hover:scale-105 hover:ring-2 hover:ring-primary-500/50`;
  };

  const getCellContent = (cell) => {
    if (cell.isCurrent) {
      return '[@]';
    }
    return cell.content;
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
          {Array.from({ length: gridData.width }).map((_, x) => (
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
          {gridData.grid.map((row, y) => (
            <div key={y} className="flex gap-1">
              {/* Y-axis label */}
              <div className="w-8 sm:w-10 flex items-center justify-center text-xs sm:text-sm text-gray-400 font-mono">
                {y}
              </div>
              
              {/* Grid cells */}
              {row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className="flex-1"
                >
                  <div
                    className={getCellClassName(cell)}
                    onClick={() => handleCellClick(cell)}
                    title={cell.discovered && cell.biome ? cell.biome.name : 'Unknown'}
                  >
                    {getCellContent(cell)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Coordinate Labels - Bottom */}
        <div className="flex mt-1">
          <div className="w-8 sm:w-10"></div>
          {Array.from({ length: gridData.width }).map((_, x) => (
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
