import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import GridCell from './GridCell';
import worldGrid from '../../data/world_grid.json';

const WorldMapGrid = ({ mapKnowledge, biomes, currentLocation, onSelectLocation }) => {
  // Pan and zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const viewportRef = useRef(null);

  // Create a lookup map for biomes by ID for O(1) access
  const biomeMap = useMemo(() => {
    const map = new Map();
    biomes.forEach(biome => map.set(biome.id, biome));
    return map;
  }, [biomes]);
  
  // Helper to check if a coordinate is discovered
  const isCoordinateDiscovered = (x, y) => {
    // Check if this coordinate has a biome
    const biomeEntry = Object.entries(worldGrid.biome_coordinates).find(
      ([_, coords]) => coords.x === x && coords.y === y
    );
    
    if (!biomeEntry) return false; // Empty cell
    
    // Check if coordinate is in discovered_coordinates array
    const discovered = mapKnowledge?.discovered_coordinates?.some(
      coord => coord[0] === x && coord[1] === y
    );
    
    return discovered || false;
  };
  
  // Helper to check if player is at coordinate
  const isPlayerAt = (x, y) => {
    if (!currentLocation) return false;
    const coords = worldGrid.biome_coordinates[currentLocation.id];
    return coords && coords.x === x && coords.y === y;
  };
  
  // Helper to get biome at coordinate - optimized with Map lookup
  const getBiomeAtCoordinate = (x, y) => {
    const biomeEntry = Object.entries(worldGrid.biome_coordinates).find(
      ([_, coords]) => coords.x === x && coords.y === y
    );
    
    if (!biomeEntry) return null;
    
    const [biomeId, coords] = biomeEntry;
    const biomeData = biomeMap.get(biomeId);
    
    if (!biomeData) return null;
    
    return {
      ...biomeData,
      abbreviation: coords.abbreviation,
      icon: coords.icon
    };
  };

  // Handle zoom with mouse wheel - useCallback to ensure stable reference for event listener
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY * 0.001;
    setZoom(prevZoom => Math.min(Math.max(0.3, prevZoom + delta), 3));
  }, []);

  // Handle pan start
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Handle pan move
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // Handle pan end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Center on player position
  const centerOnPlayer = () => {
    if (currentLocation && viewportRef.current) {
      const coords = worldGrid.biome_coordinates[currentLocation.id];
      if (!coords) return;

      const viewportWidth = viewportRef.current.clientWidth;
      const viewportHeight = viewportRef.current.clientHeight;
      const cellSize = 80 * zoom; // Approximate cell size
      
      // Calculate the position to center the player
      const playerX = coords.x * cellSize;
      const playerY = coords.y * cellSize;
      
      setPan({
        x: viewportWidth / 2 - playerX - cellSize / 2,
        y: viewportHeight / 2 - playerY - cellSize / 2
      });
    }
  };

  // Reset view
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Attach mouse up listener globally to handle drag end outside viewport
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Attach wheel listener with passive: false to allow preventDefault
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      const wheelHandler = (e) => {
        handleWheel(e);
      };
      viewport.addEventListener('wheel', wheelHandler, { passive: false });
      return () => viewport.removeEventListener('wheel', wheelHandler);
    }
  }, [handleWheel]);

  // Center on player when map loads
  useEffect(() => {
    if (currentLocation) {
      setTimeout(centerOnPlayer, 100);
    }
  }, [currentLocation?.id]);

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
          
          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-gray-400">Zoom: {(zoom * 100).toFixed(0)}%</span>
            <button 
              onClick={centerOnPlayer}
              className="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 rounded transition"
              title="Center on player"
            >
              Center
            </button>
            <button 
              onClick={resetView}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition"
              title="Reset view"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Viewport Container */}
        <div 
          ref={viewportRef}
          className="grid-viewport"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          style={{
            width: '100%',
            height: '600px',
            overflow: 'hidden',
            position: 'relative',
            border: '2px solid #8b7355',
            borderRadius: '8px',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            background: 'linear-gradient(to bottom, #f4e8d0 0%, #e8d7b8 50%, #f4e8d0 100%)',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.1), inset 0 0 20px rgba(139,115,85,0.2)'
          }}
        >
          {/* Pannable and Zoomable Container */}
          <div 
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              display: 'inline-block',
              position: 'absolute',
              pointerEvents: isDragging ? 'none' : 'auto'
            }}
          >
            {/* Coordinate Labels - Top */}
            <div className="flex gap-0 mb-0">
              <div className="w-8 sm:w-10"></div>
              {Array.from({ length: worldGrid.grid_size.width }).map((_, x) => (
                <div
                  key={`top-${x}`}
                  className="flex-1 text-center text-xs sm:text-sm text-gray-400 font-mono"
                  style={{ minWidth: '60px' }}
                >
                  {x}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="space-y-0">
              {Array.from({ length: worldGrid.grid_size.height }).map((_, y) => (
                <div key={y} className="flex gap-0">
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
                        style={{ minWidth: '60px' }}
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
            <div className="flex gap-0 mt-0">
              <div className="w-8 sm:w-10"></div>
              {Array.from({ length: worldGrid.grid_size.width }).map((_, x) => (
                <div
                  key={`bottom-${x}`}
                  className="flex-1 text-center text-xs sm:text-sm text-gray-400 font-mono"
                  style={{ minWidth: '60px' }}
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
