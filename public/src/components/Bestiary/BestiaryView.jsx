import React, { useState, useEffect } from 'react';
import { Search, Filter, Book } from 'lucide-react';
import useGameStore from '../../store/gameStore';
import MonsterCard from './MonsterCard';

const BestiaryView = () => {
  const { bestiary, fetchBestiary } = useGameStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBestiary = async () => {
      setIsLoading(true);
      await fetchBestiary();
      setIsLoading(false);
    };
    loadBestiary();
  }, [fetchBestiary]);

  if (!bestiary.unlocked) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-dark-800 rounded-lg border border-dark-700 max-w-md">
          <Book size={48} className="mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl font-bold text-white mb-2">Bestiary Locked</h2>
          <p className="text-gray-400">
            Defeat your first monster to unlock the bestiary and track your encounters!
          </p>
        </div>
      </div>
    );
  }

  // Filter entries based on search and filter type
  const filteredEntries = bestiary.entries.filter(entry => {
    // Search filter
    if (searchTerm && !entry.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filterType === 'encountered' && (!entry.encountered || entry.defeated)) {
      return false;
    }
    if (filterType === 'defeated' && !entry.defeated) {
      return false;
    }

    return true;
  });

  const filterOptions = [
    { value: 'all', label: 'All', count: bestiary.entries.length },
    { value: 'encountered', label: 'Encountered', count: bestiary.stats.encountered - bestiary.stats.defeated },
    { value: 'defeated', label: 'Defeated', count: bestiary.stats.defeated }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                <Book size={32} />
                Bestiary
              </h1>
              <p className="text-sm sm:text-base text-gray-400 mt-1">
                Track your monster encounters and defeats
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div className="bg-dark-900 rounded-lg p-3 border border-dark-700">
              <p className="text-xs sm:text-sm text-gray-400">Total Monsters</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{bestiary.stats.totalMonsters}</p>
            </div>
            <div className="bg-dark-900 rounded-lg p-3 border border-dark-700">
              <p className="text-xs sm:text-sm text-gray-400">Encountered</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-400">{bestiary.stats.encountered}</p>
            </div>
            <div className="bg-dark-900 rounded-lg p-3 border border-dark-700">
              <p className="text-xs sm:text-sm text-gray-400">Defeated</p>
              <p className="text-xl sm:text-2xl font-bold text-green-400">{bestiary.stats.defeated}</p>
            </div>
            <div className="bg-dark-900 rounded-lg p-3 border border-dark-700">
              <p className="text-xs sm:text-sm text-gray-400">Completion</p>
              <p className="text-xl sm:text-2xl font-bold text-primary-400">{bestiary.stats.completionPercentage}%</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search monsters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilterType(option.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-900 text-gray-400 hover:bg-dark-700 border border-dark-700'
                  }`}
                >
                  {option.label}
                  <span className="ml-2 text-xs opacity-75">({option.count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monster Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <p className="text-gray-400 mt-4">Loading bestiary...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <Filter size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">
                {searchTerm ? 'No monsters found matching your search.' : 'No monsters in this category yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEntries.map(entry => (
                <MonsterCard key={entry.monster_id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BestiaryView;
