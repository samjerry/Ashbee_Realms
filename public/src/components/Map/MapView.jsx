import React, { useEffect, useState } from 'react';
import { Map, MapPin, Navigation, Loader } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const MapView = () => {
  const { availableLocations, currentLocation, player, fetchLocations, travelTo } = useGameStore();
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  useEffect(() => {
    fetchLocations();
  }, []);
  
  const getDangerColor = (level) => {
    const colors = {
      1: 'text-green-500',
      2: 'text-blue-500',
      3: 'text-yellow-500',
      4: 'text-orange-500',
      5: 'text-red-500',
    };
    return colors[level] || 'text-gray-500';
  };
  
  const canTravel = (location) => {
    if (!player) return false;
    return player.level >= location.recommended_level[0];
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Map size={24} className="sm:w-8 sm:h-8 text-primary-500 flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">World Map</h1>
              <p className="text-sm sm:text-base text-gray-400">Explore the world of Ashbee Realms</p>
            </div>
          </div>
          
          {currentLocation && (
            <div className="flex items-center space-x-2 bg-dark-800 px-3 sm:px-4 py-2 rounded-lg border border-dark-700">
              <MapPin size={16} className="sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Current Location</p>
                <p className="text-xs sm:text-sm font-bold text-white">{currentLocation.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Location Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {availableLocations.map(location => {
              const accessible = canTravel(location);
              return (
                <button
                  key={location.id}
                  onClick={() => accessible && setSelectedLocation(location)}
                  disabled={!accessible}
                  className={`card p-4 sm:p-6 text-left transition-all ${
                    accessible 
                      ? 'hover:border-primary-500 cursor-pointer active:scale-95' 
                      : 'opacity-50 cursor-not-allowed'
                  } ${
                    selectedLocation?.id === location.id ? 'border-primary-500 ring-2 ring-primary-500/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-1 truncate">{location.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-400 line-clamp-2">{location.description}</p>
                    </div>
                    {currentLocation?.id === location.id && (
                      <MapPin size={16} className="sm:w-5 sm:h-5 text-primary-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div>
                      <p className="text-gray-500">Danger</p>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-4 rounded-sm ${
                              i < location.danger_level 
                                ? getDangerColor(location.danger_level).replace('text-', 'bg-')
                                : 'bg-dark-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-gray-500">Level</p>
                      <p className={`font-bold ${accessible ? 'text-white' : 'text-red-500'}`}>
                        {location.recommended_level[0]}-{location.recommended_level[1]}
                      </p>
                    </div>
                  </div>
                  
                  {location.sub_locations && (
                    <div className="mt-3 pt-3 border-t border-dark-700">
                      <p className="text-xs text-gray-500">
                        {location.sub_locations.length} sub-locations
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Location Details */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-6">
            {selectedLocation ? (
              <div className="space-y-4">
                <div>
                  <div className="text-4xl mb-3 text-center">{selectedLocation.icon || '🗺️'}</div>
                  <h2 className="text-2xl font-bold text-white text-center mb-2">
                    {selectedLocation.name}
                  </h2>
                  <p className="text-gray-300 text-sm">{selectedLocation.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-900 rounded-lg p-3 border border-dark-700">
                    <p className="text-xs text-gray-400 mb-1">Danger Level</p>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-5 rounded-sm ${
                            i < selectedLocation.danger_level 
                              ? getDangerColor(selectedLocation.danger_level).replace('text-', 'bg-')
                              : 'bg-dark-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-dark-900 rounded-lg p-3 border border-dark-700">
                    <p className="text-xs text-gray-400 mb-1">Recommended Level</p>
                    <p className="text-lg font-bold text-white">
                      {selectedLocation.recommended_level[0]}-{selectedLocation.recommended_level[1]}
                    </p>
                  </div>
                </div>
                
                {selectedLocation.environmental_effects && (
                  <div className="bg-dark-900 rounded-lg p-3 border border-dark-700">
                    <p className="text-sm font-bold text-white mb-2">Environmental Effects</p>
                    <div className="space-y-1 text-xs text-gray-400">
                      {Object.entries(selectedLocation.environmental_effects).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-yellow-500">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedLocation.sub_locations && selectedLocation.sub_locations.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-white mb-2">Sub-Locations</p>
                    <div className="space-y-2">
                      {selectedLocation.sub_locations.map((sub, index) => (
                        <div key={index} className="bg-dark-900 rounded-lg p-2 border border-dark-700">
                          <p className="text-sm text-white">{sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {currentLocation?.id !== selectedLocation.id && (
                  <button
                    onClick={() => travelTo(selectedLocation.id)}
                    disabled={!canTravel(selectedLocation)}
                    className="btn-primary w-full mt-4 flex items-center justify-center space-x-2"
                  >
                    <Navigation size={20} />
                    <span>Travel Here</span>
                  </button>
                )}
                
                {currentLocation?.id === selectedLocation.id && (
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 text-center">
                    <MapPin size={20} className="text-green-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-green-500">You are here</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Map size={48} className="mx-auto mb-3 opacity-50" />
                <p>Select a location to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
