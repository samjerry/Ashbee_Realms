import React from 'react';
import useGameStore from '../../store/gameStore';

const LoadingScreen = () => {
  const worldName = useGameStore((state) => state.worldName);
  
  return (
    <div className="h-screen flex items-center justify-center bg-dark-950">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-6 mx-auto animate-pulse-slow">
          AR
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{worldName}</h2>
        <p className="text-gray-400 mb-6">Loading your adventure...</p>
        <div className="w-48 h-2 bg-dark-900 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-primary-600 to-primary-500 animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
