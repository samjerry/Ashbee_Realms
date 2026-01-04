import React, { useState } from 'react';
import { getDangerColor, getDangerBgColor } from '../../utils/mapUtils';

/**
 * GridCell Component
 * Renders a single grid cell with image/text fallback and fog of war
 * 
 * @param {Object} props
 * @param {Array} props.coordinate - [x, y] grid coordinates
 * @param {Object} props.biome - Biome data object
 * @param {boolean} props.isDiscovered - Whether this cell has been discovered
 * @param {boolean} props.isPlayerHere - Whether the player is at this location
 * @param {Function} props.onClick - Click handler
 */
const GridCell = ({ coordinate, biome, isDiscovered, isPlayerHere, onClick }) => {
  const [imageError, setImageError] = useState(false);
  
  // Path to the biome image
  const imagePath = biome?.id ? `/maps/tiles/${biome.id}.png` : null;
  
  // Handle undiscovered cells - show fog of war
  if (!isDiscovered) {
    return (
      <div 
        className="grid-cell undiscovered"
        title="Undiscovered region"
      >
        <div className="fog-overlay">░░░░░░░░░░</div>
      </div>
    );
  }
  
  // Handle discovered cells
  const cellClassName = `grid-cell discovered ${isPlayerHere ? 'current-location' : ''}`;
  const dangerColor = biome ? getDangerColor(biome.danger_level) : 'text-gray-500';
  const dangerBg = biome ? getDangerBgColor(biome.danger_level) : 'bg-gray-500/20 border-gray-500';
  
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
};

export default GridCell;
