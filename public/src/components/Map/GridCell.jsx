import React, { useState } from 'react';
import { getDangerColor, getDangerBgColor } from '../../utils/asciiMapGenerator';
import {
  getTileAbbreviation,
  getDangerBadge,
  getDangerShimmer,
  getFogOverlay,
  getDangerBorderColor
} from '../../utils/tileHelpers';

/**
 * GridCell Component
 * Renders a single grid cell with image/text fallback and fog of war
 * 
 * @param {Object} props
 * @param {Array} props.coordinate - [x, y] grid coordinates
 * @param {Object} props.biome - Biome data object (for world map)
 * @param {string} props.biomeId - Biome identifier (for biome grid)
 * @param {Object} props.tileData - Tile data object (for biome grid)
 * @param {string} props.fogState - Fog state: 'deep' | 'thin' | 'revealed'
 * @param {boolean} props.isDiscovered - Whether this cell has been discovered (world map)
 * @param {boolean} props.isPlayerHere - Whether the player is at this location
 * @param {Object} props.scoutedData - Scouted data for thin fog
 * @param {number} props.distance - Distance from player position
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onHover - Hover handler
 */
const GridCell = ({ 
  coordinate, 
  biome, 
  biomeId,
  tileData,
  fogState,
  isDiscovered, 
  isPlayerHere, 
  scoutedData,
  distance,
  onClick,
  onHover
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Determine if this is world map mode or biome grid mode
  const isWorldMap = biome !== undefined && !tileData;
  const isBiomeGrid = tileData !== undefined;

  // World Map Mode (legacy support)
  if (isWorldMap) {
    const imagePath = biome?.id ? `/maps/tiles/${biome.id}.png` : null;
    
    // Handle undiscovered cells - show fog of war
    if (!isDiscovered) {
      return (
        <div 
          className="grid-cell undiscovered"
          title="Undiscovered region"
        >
          <div className="fog-overlay">░░░</div>
        </div>
      );
    }
    
    // Handle discovered cells
    const cellClassName = `grid-cell discovered ${isPlayerHere ? 'current-location' : ''}`;
    const dangerColor = biome ? getDangerColor(biome.danger_level) : 'text-gray-500';
    
    // Get abbreviation from biome
    const abbreviation = biome?.abbreviation || biome?.id?.substring(0, 2).toUpperCase() || '??';
    
    return (
      <div 
        className={cellClassName}
        onClick={onClick}
        title={biome?.name || 'Unknown'}
      >
        {/* Content layer: Image or text fallback */}
        <div className="cell-content">
          {imagePath && !imageError ? (
            <img 
              src={imagePath}
              alt={biome.name}
              className="biome-image"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className={`biome-text ${dangerColor}`}>
              {abbreviation}
            </div>
          )}
        </div>
        
        {/* Player marker overlay */}
        {isPlayerHere && (
          <div className="player-marker" title="Your current location">
            ★
          </div>
        )}
        
        {/* Cell label (biome name on hover) */}
        {biome && (
          <div className="cell-label">
            {biome.name}
          </div>
        )}
      </div>
    );
  }

  // Biome Grid Mode
  if (isBiomeGrid) {
    const coordStr = `[${coordinate[0]},${coordinate[1]}]`;
    
    // Deep Fog State (unexplored)
    if (fogState === 'deep') {
      const shimmerClass = distance !== undefined ? getDangerShimmer(distance) : '';
      
      return (
        <div 
          className="grid-cell deep-fog"
          onClick={onClick}
          onMouseEnter={onHover}
          title={`Unexplored ${coordStr} (Distance: ${distance || '?'})`}
        >
          <div className="fog-overlay">{getFogOverlay('deep')}</div>
          {distance !== undefined && distance > 0 && (
            <div className={`danger-shimmer ${shimmerClass}`}></div>
          )}
          <div className="coordinate-display">{coordStr}</div>
        </div>
      );
    }
    
    // Thin Fog State (scouted)
    if (fogState === 'thin') {
      const dangerBadge = scoutedData?.danger_hint ? 
        getDangerBadge(scoutedData.danger_hint === 'high' ? 4 : scoutedData.danger_hint === 'moderate' ? 3 : 2) : '';
      
      return (
        <div 
          className="grid-cell thin-fog"
          onClick={onClick}
          onMouseEnter={onHover}
          title={`Scouted ${coordStr}`}
        >
          <div className="fog-overlay">{getFogOverlay('thin')}</div>
          <div className="placeholder-text">???</div>
          {dangerBadge && (
            <div className="danger-badge text-yellow-500">{dangerBadge}</div>
          )}
        </div>
      );
    }
    
    // Revealed State
    if (fogState === 'revealed' && tileData) {
      const abbreviation = getTileAbbreviation(tileData.name || tileData.description || 'Unknown');
      const isNamedLocation = tileData.type === 'sublocation';
      const dangerLevel = tileData.danger_level || 0;
      const dangerColor = getDangerColor(dangerLevel);
      const dangerBorder = getDangerBorderColor(dangerLevel);
      
      const cellClasses = [
        'grid-cell',
        'revealed',
        isPlayerHere ? 'player-here' : '',
        isNamedLocation ? 'named-location' : ''
      ].filter(Boolean).join(' ');
      
      return (
        <div 
          className={cellClasses}
          onClick={onClick}
          onMouseEnter={onHover}
          title={tileData.name || tileData.description || coordStr}
          style={{ borderColor: dangerLevel > 2 ? undefined : undefined }}
        >
          {/* Tile abbreviation */}
          <div className={`tile-abbreviation ${dangerColor}`}>
            {abbreviation}
          </div>
          
          {/* Player marker */}
          {isPlayerHere && (
            <div className="player-marker" title="Your current location">
              [@]
            </div>
          )}
          
          {/* Danger level indicator (if > 2) */}
          {dangerLevel > 2 && (
            <div className={`danger-badge ${dangerColor}`}>
              {dangerLevel}
            </div>
          )}
          
          {/* Special indicators */}
          {tileData.encounter_chance > 0.3 && (
            <div className="encounter-warning" title="High encounter chance">⚔️</div>
          )}
          {tileData.loot_chance > 0.3 && (
            <div className="loot-indicator" title="Loot available">💎</div>
          )}
          {tileData.requires && (
            <div className="requirement-lock" title={`Requires: ${tileData.requires}`}>🔒</div>
          )}
          
          {/* Location label on hover */}
          {tileData.name && (
            <div className="location-label">
              {tileData.name}
            </div>
          )}
        </div>
      );
    }
    
    // Fallback for revealed with no data (empty tile)
    if (fogState === 'revealed') {
      return (
        <div 
          className="grid-cell revealed"
          onClick={onClick}
          onMouseEnter={onHover}
          title={`Empty ${coordStr}`}
        >
          <div className="tile-abbreviation text-gray-600">--</div>
        </div>
      );
    }
  }

  // Default fallback
  return (
    <div className="grid-cell undiscovered">
      <div className="fog-overlay">░░░</div>
    </div>
  );
};

export default GridCell;
