/**
 * game/index.js
 * Central export point for all game systems
 */

const Character = require('./Character');
const EquipmentManager = require('./EquipmentManager');
const InventoryManager = require('./InventoryManager');
const CharacterInitializer = require('./CharacterInitializer');

module.exports = {
  Character,
  EquipmentManager,
  InventoryManager,
  CharacterInitializer
};
