import React, { useState } from 'react';
import { 
  getFogState, 
  getDangerColor, 
  getDangerShimmer, 
  getDangerShimmerColor,
  getDangerIndicator,
  coordToKey
} from '../../utils/tileHelpers';

// Constants for tile indicators
const HIGH_ENCOUNTER_THRESHOLD = 0.5;
const HIGH_LOOT_THRESHOLD = 0.5;

/**
 * BiomeGridCell Component
 * Renders a single cell in a biome exploration grid
 * Handles fog of war states: deep fog, thin fog (scouted), and revealed
 * 
 * @param {Object} props
 * @param {Array} props.coordinate - [x, y] grid coordinates
 * @param {Object} props.tileData - Tile data from biome_grids.json
 * @param {Object} props.biomeKnowledge - Player's knowledge of this biome
 * @param {Array} props.playerPosition - Player's current position [x, y]
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onHover - Hover handler
 */
const BiomeGridCell = ({ 
  coordinate, 
  tileData, 
  biomeKnowledge, 
  playerPosition,
  onClick,
  onHover
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Determine fog state
  const fogState = getFogState(coordinate, biomeKnowledge);
  const coordKey = coordToKey(coordinate);
  const isPlayerHere = playerPosition && 
    playerPosition[0] === coordinate[0] && 
    playerPosition[1] === coordinate[1];

  // Calculate distance from player
  const distance = playerPosition 
    ? Math.abs(playerPosition[0] - coordinate[0]) + Math.abs(playerPosition[1] - coordinate[1])
    : 999;

  const handleClick = () => {
    if (onClick) onClick(coordinate);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHover) onHover(coordinate);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Deep Fog State - Completely unexplored
  if (fogState === 'deep') {
    const shimmerClass = getDangerShimmer(distance);
    const shimmerColor = tileData ? getDangerShimmerColor(tileData.danger_level) : 'danger-green';
    
    return (
      <div 
        className="grid-cell deep-fog"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={isHovered ? `[${coordinate[0]}, ${coordinate[1]}]` : ''}
      >
        <div className="fog-overlay">░░░</div>
        {distance <= 3 && (
          <div className={`danger-shimmer ${shimmerClass} ${shimmerColor}`}></div>
        )}
        <div className="coordinate-label">{coordinate[0]},{coordinate[1]}</div>
      </div>
    );
  }

  // Thin Fog State - Scouted but not explored
  if (fogState === 'thin') {
    const scoutedData = biomeKnowledge?.scouted_tiles?.[coordKey];
    const dangerIndicator = scoutedData ? getDangerIndicator(scoutedData.danger_hint) : '?';
    
    return (
      <div 
        className="grid-cell thin-fog"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={isHovered && scoutedData ? `${scoutedData.terrain_hint} - ${scoutedData.danger_hint} danger` : '???'}
      >
        <div className="fog-overlay thin">▓▓▓</div>
        <div className="danger-badge">{dangerIndicator}</div>
        <div className="mystery-text">???</div>
        <div className="coordinate-label">{coordinate[0]},{coordinate[1]}</div>
      </div>
    );
  }

  // Revealed State - Fully discovered
  const isNamedLocation = tileData && tileData.type === 'sublocation';
  const abbreviation = tileData?.abbreviation || '..';
  const dangerLevel = tileData?.danger_level || 1;
  const dangerColor = getDangerColor(dangerLevel);
  
  let cellClassName = 'grid-cell revealed';
  if (isNamedLocation) cellClassName += ' named-location';
  if (isPlayerHere) cellClassName += ' player-here';
  
  return (
    <div 
      className={cellClassName}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={tileData?.name || 'Unknown'}
    >
      {/* Player marker */}
      {isPlayerHere && (
        <div className="player-marker">[@]</div>
      )}
      
      {/* Tile abbreviation */}
      <div className={`tile-abbreviation ${dangerColor}`}>
        {abbreviation}
      </div>
      
      {/* Danger level indicator for high danger */}
      {dangerLevel >= 3 && (
        <div className={`danger-corner ${dangerColor}`}>
          {dangerLevel}
        </div>
      )}
      
      {/* Special indicators */}
      {tileData?.encounter_chance >= HIGH_ENCOUNTER_THRESHOLD && (
        <div className="encounter-warning" title="High encounter chance">⚔</div>
      )}
      {tileData?.loot_chance >= HIGH_LOOT_THRESHOLD && (
        <div className="loot-indicator" title="Loot possible">💎</div>
      )}
      {tileData?.required_item && (
        <div className="requirement-lock" title="Item required">🔒</div>
      )}
      
      {/* Location label on hover */}
      <div className="location-label">
        {tileData?.name || 'Unknown'}
      </div>
    </div>
  );
};

export default BiomeGridCell;
