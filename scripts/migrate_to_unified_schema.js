#!/usr/bin/env node

/**
 * Migration script to move data from per-channel player tables to unified schema
 * 
 * This script:
 * 1. Migrates character-specific data to the unified `characters` table
 * 2. Migrates account-wide data to the `account_progress` table
 * 3. Preserves all existing data in old tables (non-destructive)
 * 
 * Usage:
 *   node scripts/migrate_to_unified_schema.js
 * 
 * Options:
 *   --dry-run   : Show what would be migrated without making changes
 *   --channel   : Migrate only a specific channel (e.g., --channel=marrowofalbion)
 *   --force     : Skip confirmation prompts
 */

require('dotenv').config();
const { Pool } = require('pg');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const channelArg = args.find(arg => arg.startsWith('--channel='));
const specificChannel = channelArg ? channelArg.split('=')[1] : null;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL environment variable is required!', colors.red);
    process.exit(1);
  }

  log('\n🔄 Database Migration: Per-Channel Tables → Unified Schema', colors.bright + colors.cyan);
  log('═══════════════════════════════════════════════════════════\n', colors.cyan);

  if (dryRun) {
    log('🔍 DRY RUN MODE - No changes will be made\n', colors.yellow);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    log('✅ Connected to database', colors.green);

    // Get list of channels
    const CHANNELS = process.env.CHANNELS 
      ? process.env.CHANNELS.split(',').map(ch => ch.trim().toLowerCase()) 
      : [];

    if (CHANNELS.length === 0) {
      log('⚠️  No channels configured in CHANNELS environment variable', colors.yellow);
      process.exit(0);
    }

    log(`📋 Found ${CHANNELS.length} channel(s): ${CHANNELS.join(', ')}\n`, colors.blue);

    // Filter to specific channel if requested
    const channelsToMigrate = specificChannel 
      ? CHANNELS.filter(ch => ch === specificChannel.toLowerCase())
      : CHANNELS;

    if (channelsToMigrate.length === 0) {
      log(`❌ Channel "${specificChannel}" not found in CHANNELS`, colors.red);
      process.exit(1);
    }

    // Check if new tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('characters', 'account_progress')
    `);

    const hasCharactersTable = tablesCheck.rows.some(r => r.table_name === 'characters');
    const hasAccountProgressTable = tablesCheck.rows.some(r => r.table_name === 'account_progress');

    if (!hasCharactersTable || !hasAccountProgressTable) {
      log('❌ New tables do not exist. Please run the server first to create them.', colors.red);
      log('   Missing tables:', colors.red);
      if (!hasCharactersTable) log('   - characters', colors.red);
      if (!hasAccountProgressTable) log('   - account_progress', colors.red);
      process.exit(1);
    }

    log('✅ New tables verified (characters, account_progress)\n', colors.green);

    // Migration summary
    let totalCharacters = 0;
    let totalAccountProgress = 0;

    for (const channel of channelsToMigrate) {
      const tableName = `players_${channel.replace(/[^a-z0-9_]/g, '_')}`;
      
      log(`📊 Analyzing ${channel}...`, colors.blue);

      // Check if old table exists
      const tableExists = await pool.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [tableName]
      );

      if (!tableExists.rows[0].exists) {
        log(`   ⚠️  Table ${tableName} does not exist - skipping`, colors.yellow);
        continue;
      }

      // Count characters in old table
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const characterCount = parseInt(countResult.rows[0].count);

      log(`   📈 Found ${characterCount} character(s) in ${tableName}`, colors.cyan);

      if (characterCount === 0) {
        log(`   ℹ️  No characters to migrate - skipping\n`, colors.blue);
        continue;
      }

      // Check for duplicates in target table
      const duplicateCheck = await pool.query(
        `SELECT COUNT(*) as count FROM characters WHERE channel_name = $1`,
        [channel]
      );
      const existingCount = parseInt(duplicateCheck.rows[0].count);

      if (existingCount > 0) {
        log(`   ⚠️  ${existingCount} character(s) already exist in unified table`, colors.yellow);
        if (!force && !dryRun) {
          log(`   ⏭️  Skipping to avoid duplicates (use --force to overwrite)\n`, colors.yellow);
          continue;
        }
      }

      if (!dryRun) {
        log(`   🔄 Migrating characters...`, colors.cyan);

        // Migrate character data
        const migrateCharactersQuery = `
          INSERT INTO characters (
            player_id, channel_name, name, location, level, xp, xp_to_next,
            max_hp, hp, mana, max_mana, gold, type, inventory, pending, combat,
            skill_cd, step, is_player, in_combat, equipped, base_stats, skills,
            skill_points, travel_state, active_quests, completed_quests,
            consumable_cooldowns, dialogue_history, reputation, unlocked_achievements,
            achievement_progress, achievement_unlock_dates, achievement_points,
            unlocked_titles, active_title, stats, dungeon_state, completed_dungeons,
            crafting_xp, known_recipes, season_progress, seasonal_challenges_completed,
            bestiary, bestiary_unlocked, map_knowledge, roles, name_color,
            selected_role_badge, theme, unlocked_abilities, equipped_abilities,
            ability_cooldowns, created_at, updated_at
          )
          SELECT 
            player_id, $1 as channel_name, name, location, level, xp, xp_to_next,
            max_hp, hp, COALESCE(mana, 100), COALESCE(max_mana, 100), gold, type,
            inventory, pending, combat, skill_cd, step, is_player, in_combat,
            equipped, base_stats, skills, skill_points, travel_state,
            active_quests, completed_quests, consumable_cooldowns, dialogue_history,
            reputation, unlocked_achievements, achievement_progress,
            achievement_unlock_dates, achievement_points, unlocked_titles,
            active_title, stats, dungeon_state, completed_dungeons,
            crafting_xp, known_recipes, season_progress, seasonal_challenges_completed,
            COALESCE(bestiary, '{}'::jsonb), COALESCE(bestiary_unlocked, false),
            COALESCE(map_knowledge, '{"discovered_regions":["town_square"]}'::jsonb),
            COALESCE(roles, '["viewer"]'::jsonb), name_color, selected_role_badge,
            COALESCE(theme, 'crimson-knight'),
            COALESCE(unlocked_abilities, '[]'::jsonb),
            COALESCE(equipped_abilities, '[]'::jsonb),
            COALESCE(ability_cooldowns, '{}'::jsonb),
            created_at, updated_at
          FROM ${tableName}
          ON CONFLICT (player_id, channel_name) DO UPDATE SET
            name = EXCLUDED.name,
            location = EXCLUDED.location,
            level = EXCLUDED.level,
            xp = EXCLUDED.xp,
            xp_to_next = EXCLUDED.xp_to_next,
            max_hp = EXCLUDED.max_hp,
            hp = EXCLUDED.hp,
            mana = EXCLUDED.mana,
            max_mana = EXCLUDED.max_mana,
            gold = EXCLUDED.gold,
            type = EXCLUDED.type,
            inventory = EXCLUDED.inventory,
            pending = EXCLUDED.pending,
            combat = EXCLUDED.combat,
            skill_cd = EXCLUDED.skill_cd,
            step = EXCLUDED.step,
            is_player = EXCLUDED.is_player,
            in_combat = EXCLUDED.in_combat,
            equipped = EXCLUDED.equipped,
            base_stats = EXCLUDED.base_stats,
            skills = EXCLUDED.skills,
            skill_points = EXCLUDED.skill_points,
            travel_state = EXCLUDED.travel_state,
            active_quests = EXCLUDED.active_quests,
            completed_quests = EXCLUDED.completed_quests,
            consumable_cooldowns = EXCLUDED.consumable_cooldowns,
            dialogue_history = EXCLUDED.dialogue_history,
            reputation = EXCLUDED.reputation,
            unlocked_achievements = EXCLUDED.unlocked_achievements,
            achievement_progress = EXCLUDED.achievement_progress,
            achievement_unlock_dates = EXCLUDED.achievement_unlock_dates,
            achievement_points = EXCLUDED.achievement_points,
            unlocked_titles = EXCLUDED.unlocked_titles,
            active_title = EXCLUDED.active_title,
            stats = EXCLUDED.stats,
            dungeon_state = EXCLUDED.dungeon_state,
            completed_dungeons = EXCLUDED.completed_dungeons,
            crafting_xp = EXCLUDED.crafting_xp,
            known_recipes = EXCLUDED.known_recipes,
            season_progress = EXCLUDED.season_progress,
            seasonal_challenges_completed = EXCLUDED.seasonal_challenges_completed,
            bestiary = EXCLUDED.bestiary,
            bestiary_unlocked = EXCLUDED.bestiary_unlocked,
            map_knowledge = EXCLUDED.map_knowledge,
            roles = EXCLUDED.roles,
            name_color = EXCLUDED.name_color,
            selected_role_badge = EXCLUDED.selected_role_badge,
            theme = EXCLUDED.theme,
            unlocked_abilities = EXCLUDED.unlocked_abilities,
            equipped_abilities = EXCLUDED.equipped_abilities,
            ability_cooldowns = EXCLUDED.ability_cooldowns,
            updated_at = EXCLUDED.updated_at
        `;

        const result = await pool.query(migrateCharactersQuery, [channel]);
        log(`   ✅ Migrated ${characterCount} character(s) to unified table`, colors.green);
        totalCharacters += characterCount;

        // Migrate account-wide data (aggregate from character data)
        log(`   🔄 Migrating account progress...`, colors.cyan);

        const migrateAccountProgressQuery = `
          INSERT INTO account_progress (
            player_id, passive_levels, souls, legacy_points, account_stats,
            total_deaths, total_kills, total_gold_earned, total_xp_earned,
            highest_level_reached, total_crits, created_at, updated_at
          )
          SELECT DISTINCT ON (player_id)
            player_id,
            COALESCE(passive_levels, '{}'::jsonb),
            COALESCE(souls, 5),
            COALESCE(legacy_points, 0),
            COALESCE(account_stats, '{}'::jsonb),
            COALESCE(total_deaths, 0),
            COALESCE(total_kills, 0),
            COALESCE(total_gold_earned, 0),
            COALESCE(total_xp_earned, 0),
            COALESCE(highest_level_reached, 1),
            COALESCE(total_crits, 0),
            created_at,
            updated_at
          FROM ${tableName}
          ON CONFLICT (player_id) DO UPDATE SET
            passive_levels = CASE 
              WHEN EXCLUDED.souls > account_progress.souls THEN EXCLUDED.passive_levels
              ELSE account_progress.passive_levels
            END,
            souls = GREATEST(account_progress.souls, EXCLUDED.souls),
            legacy_points = GREATEST(account_progress.legacy_points, EXCLUDED.legacy_points),
            total_deaths = account_progress.total_deaths + EXCLUDED.total_deaths,
            total_kills = account_progress.total_kills + EXCLUDED.total_kills,
            total_gold_earned = account_progress.total_gold_earned + EXCLUDED.total_gold_earned,
            total_xp_earned = account_progress.total_xp_earned + EXCLUDED.total_xp_earned,
            highest_level_reached = GREATEST(account_progress.highest_level_reached, EXCLUDED.highest_level_reached),
            total_crits = account_progress.total_crits + EXCLUDED.total_crits,
            updated_at = EXCLUDED.updated_at
        `;

        await pool.query(migrateAccountProgressQuery);
        log(`   ✅ Migrated account progress data`, colors.green);
        totalAccountProgress += characterCount;
      }

      log('', ''); // Empty line for readability
    }

    // Final summary
    log('═══════════════════════════════════════════════════════════', colors.cyan);
    if (dryRun) {
      log('✅ DRY RUN COMPLETE - No changes were made', colors.green);
      log(`   Would migrate ${totalCharacters} character(s)`, colors.blue);
    } else {
      log('✅ MIGRATION COMPLETE', colors.green);
      log(`   Migrated ${totalCharacters} character(s) to unified table`, colors.blue);
      log(`   Updated account progress for players`, colors.blue);
      log('\n⚠️  Old tables have NOT been deleted for safety', colors.yellow);
      log('   Verify the migration and use DROP TABLE to remove them manually', colors.yellow);
    }
    log('═══════════════════════════════════════════════════════════\n', colors.cyan);

  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
