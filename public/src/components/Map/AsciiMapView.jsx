import React from 'react';
import { MapPin, Lock } from 'lucide-react';
import { generateBiomeAscii, getDangerColor, getBiomeCoordinates } from '../../utils/asciiMapGenerator';

const AsciiMapView = ({ mapKnowledge, biomes, currentLocation, onSelectLocation }) => {
  const discoveredBiomes = biomes.filter(b => 
    mapKnowledge?.discovered_regions?.includes(b.id)
  );

  const undiscoveredCount = biomes.length - discoveredBiomes.length;

  const getBiomeIcon = (biomeId) => {
    const coords = getBiomeCoordinates(biomeId);
    return coords?.icon || '🗺️';
  };

  const renderBiomeCard = (biome, discovered) => {
    const isCurrent = currentLocation?.id === biome.id;
    const coords = getBiomeCoordinates(biome.id);
    
    return (
      <div
        key={biome.id}
        onClick={() => discovered && onSelectLocation && onSelectLocation(biome)}
        className={`
          card p-4 transition-all
          ${discovered ? 'cursor-pointer hover:border-primary-500 hover:scale-105' : 'cursor-not-allowed opacity-50'}
          ${isCurrent ? 'ring-2 ring-primary-500 border-primary-500' : ''}
        `}
      >
        {/* ASCII Art Box */}
        <div className="mb-3">
          <pre className={`
            text-xs sm:text-sm font-mono text-center leading-tight
            ${discovered ? getDangerColor(biome.danger_level) : 'text-gray-600'}
          `}>
            {discovered ? `
╔════════════════╗
║  ${coords?.icon || '🗺️'}  ${(biome.name || 'Unknown').substring(0, 10).toUpperCase().padEnd(10)}║
║  Danger Lv: ${biome.danger_level || 0}   ║
╚════════════════╝
            `.trim() : `
╔════════════════╗
║   UNEXPLORED   ║
║      ???       ║
║   [UNKNOWN]    ║
╚════════════════╝
            `.trim()}
          </pre>
        </div>

        {/* Info */}
        {discovered ? (
          <>
            <div className="mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {isCurrent && <MapPin size={14} className="text-primary-500" />}
                {biome.name}
              </h3>
              <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                {biome.description}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500">Level:</span>
                <span className="text-white ml-1 font-bold">
                  {biome.recommended_level?.[0]}-{biome.recommended_level?.[1]}
                </span>
              </div>
              {coords && (
                <div>
                  <span className="text-gray-500">Grid:</span>
                  <span className="text-white ml-1 font-mono">
                    ({coords.x},{coords.y})
                  </span>
                </div>
              )}
            </div>

            {/* Exploration Progress */}
            {biome.sub_locations && (
              <div className="mt-2 pt-2 border-t border-dark-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Explored:</span>
                  <span className="text-primary-500 font-bold">
                    {mapKnowledge?.explored_sublocations?.[biome.id]?.length || 0}/{biome.sub_locations.length}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <Lock size={20} className="mx-auto text-gray-600 mb-2" />
            <p className="text-xs text-gray-500">
              Explore to discover this region
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-dark-900 rounded-lg p-4 sm:p-6 border border-dark-700">
        <div className="text-center">
          <pre className="text-sm sm:text-base font-mono text-primary-500 mb-4">
{`╔═══════════════════════════════════════════╗
║     ASHBEE REALMS - ASCII MAP VIEW       ║
╚═══════════════════════════════════════════╝`}
          </pre>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            <div>
              <span className="text-gray-400">Discovered:</span>
              <span className="text-green-500 font-bold ml-2">
                {discoveredBiomes.length} regions
              </span>
            </div>
            <div>
              <span className="text-gray-400">Unexplored:</span>
              <span className="text-orange-500 font-bold ml-2">
                {undiscoveredCount} regions
              </span>
            </div>
            <div>
              <span className="text-gray-400">Progress:</span>
              <span className="text-primary-500 font-bold ml-2">
                {((discoveredBiomes.length / biomes.length) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Regions */}
      {discoveredBiomes.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Discovered Regions ({discoveredBiomes.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {discoveredBiomes.map(biome => renderBiomeCard(biome, true))}
          </div>
        </div>
      )}

      {/* Undiscovered Regions */}
      {undiscoveredCount > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Lock size={20} className="text-gray-500" />
            Unexplored Regions ({undiscoveredCount})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {biomes
              .filter(b => !mapKnowledge?.discovered_regions?.includes(b.id))
              .slice(0, 6) // Show only first 6 unknown
              .map(biome => renderBiomeCard(biome, false))}
            {undiscoveredCount > 6 && (
              <div className="card p-4 flex items-center justify-center opacity-50">
                <div className="text-center">
                  <p className="text-gray-500 text-sm">
                    +{undiscoveredCount - 6} more regions
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    to discover...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {discoveredBiomes.length === 0 && (
        <div className="card p-8 text-center">
          <Lock size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No Regions Discovered
          </h3>
          <p className="text-gray-400">
            Begin your journey to explore and map the world of Ashbee Realms!
          </p>
        </div>
      )}
    </div>
  );
};

export default AsciiMapView;
