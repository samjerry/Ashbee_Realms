import React, { useState, useEffect, useRef } from 'react';
import BiomeGridCell from './BiomeGridCell';
import { coordToKey } from '../../utils/tileHelpers';

/**
 * BiomeGridMap Component
 * Renders the grid-based exploration map for a biome
 * Displays fog of war, player position, and tile information
 * Now features pan and zoom controls for large grids
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
  
  // Pan and zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const viewportRef = useRef(null);

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

  // Handle zoom with mouse wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom(prevZoom => Math.min(Math.max(0.3, prevZoom + delta), 3));
  };

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
    if (playerPosition && viewportRef.current) {
      const viewportWidth = viewportRef.current.clientWidth;
      const viewportHeight = viewportRef.current.clientHeight;
      const cellSize = 64 * zoom;
      
      // Calculate the position to center the player
      const playerX = playerPosition[0] * cellSize;
      const playerY = playerPosition[1] * cellSize;
      
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
<div className="flex items-center justify-between">
          {playerPosition && (
            <p className="text-sm text-gray-400">
              Position: [{playerPosition[0]}, {playerPosition[1]}]
            </p>
          )}
          <div className="flex items-center gap-2">
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
      </div>

      {/* Hint Display */}
      {hintText && (
        <div className="hint-display mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded text-sm italic text-gray-300">
          {hintText}
        </div>
      )}

      {/* Viewport Container */}
      <div 
        ref={viewportRef}
        className="grid-viewport"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        style={{
          width: '100%',
          height: '600px',
          overflow: 'hidden',
          position: 'relative',
          border: '2px solid #2a2a2a',
          borderRadius: '8px',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
      >
        {/* Pannable and Zoomable Container */}
        <div 
          className="grid-wrapper"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            display: 'inline-flex',
            gap: '0px',
            position: 'absolute'
          }}
        >
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
                padding: 0,
                pointerEvents: isDragging ? 'none' : 'auto'
              }}
            >
              {renderGrid()}
            </div>
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
