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
const QuestManager = require('./QuestManager');
const ConsumableManager = require('./ConsumableManager');
const ShopManager = require('./ShopManager');
const ItemComparator = require('./ItemComparator');
const NPCManager = require('./NPCManager');
const DialogueManager = require('./DialogueManager');
const AchievementManager = require('./AchievementManager');
const DungeonManager = require('./DungeonManager');
const FactionManager = require('./FactionManager');
const EnchantingManager = require('./EnchantingManager');
const CraftingManager = require('./CraftingManager');
const PassiveManager = require('./PassiveManager');
const RaidManager = require('./RaidManager');
const SeasonManager = require('./SeasonManager');
const LeaderboardManager = require('./LeaderboardManager');
const OperatorManager = require('./OperatorManager');

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
  ExplorationManager,
  QuestManager,
  ConsumableManager,
  ShopManager,
  ItemComparator,
  NPCManager,
  DialogueManager,
  AchievementManager,
  DungeonManager,
  FactionManager,
  EnchantingManager,
  CraftingManager,
  RaidManager,
  PassiveManager,
  SeasonManager,
  LeaderboardManager,
  OperatorManager
};
