/**
 * game/index.js
 * Central export point for all game systems
 */

const Character = require('./Character');
const EquipmentManager = require('./EquipmentManager');
const InventoryManager = require('./InventoryManager');
const CharacterInitializer = require('./CharacterInitializer');
const Combat = require('./Combat');
const StatusEffectManager = require('./StatusEffectManager');
const LootGenerator = require('./LootGenerator');
const ProgressionManager = require('./ProgressionManager');
const SkillManager = require('./SkillManager');
const ExplorationManager = require('./ExplorationManager');

module.exports = {
  Character,
  EquipmentManager,
  InventoryManager,
  CharacterInitializer,
  Combat,
  StatusEffectManager,
  LootGenerator,
  ProgressionManager,
  SkillManager,
  ExplorationManager
};
