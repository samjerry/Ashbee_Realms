/**
 * fix_inventory_arrays.js
 * Migrates player inventories from plain arrays to InventoryManager-compatible format
 * 
 * This script fixes the issue where some inventories were stored as plain arrays
 * instead of being properly serialized through InventoryManager.toArray()
 */

require('dotenv').config();
const db = require('../db');

async function fixInventoryArrays() {
  try {
    console.log('🔧 Starting inventory migration...\n');
    
    // Initialize database connection
    await db.initDB();
    
    // Get all characters from the database
    const query = `SELECT player_id, channel_name, character_data FROM characters`;
    const rows = await db.all(query);
    
    console.log(`📦 Found ${rows.length} characters to check\n`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;
    
    for (const row of rows) {
      try {
        const characterData = JSON.parse(row.character_data);
        const playerId = row.player_id;
        const channelName = row.channel_name;
        
        // Check if inventory exists and needs fixing
        if (!characterData.inventory) {
          console.log(`⚠️  ${characterData.name} (${playerId}): No inventory, setting to default`);
          characterData.inventory = ["Potion"];
          
          // Save the fixed character
          await db.run(
            `UPDATE characters SET character_data = $1 WHERE player_id = $2 AND channel_name = $3`,
            [JSON.stringify(characterData), playerId, channelName]
          );
          
          fixedCount++;
        } else if (Array.isArray(characterData.inventory)) {
          // Check if inventory items are in the correct format
          const needsFix = characterData.inventory.some(item => {
            // Plain strings are old format
            if (typeof item === 'string') return true;
            // Objects without required properties are invalid
            if (typeof item === 'object' && (!item.id || !item.name)) return true;
            return false;
          });
          
          if (needsFix) {
            console.log(`🔨 Fixing ${characterData.name} (${playerId}): Converting inventory format`);
            
            // Convert old format items to new format
            characterData.inventory = characterData.inventory.map(item => {
              if (typeof item === 'string') {
                // Old format: just item ID
                return {
                  id: item,
                  name: item, // Will be resolved by InventoryManager
                  tags: [],
                  quest_tags: []
                };
              } else if (typeof item === 'object' && item !== null) {
                // Partial object format: ensure all properties exist
                return {
                  id: item.id || 'unknown_item',
                  name: item.name || item.id || 'Unknown Item',
                  tags: item.tags || [],
                  quest_tags: item.quest_tags || [],
                  quantity: item.quantity || 1 // Preserve quantity if it exists
                };
              }
              // Fallback for invalid items
              return {
                id: 'unknown_item',
                name: 'Unknown Item',
                tags: [],
                quest_tags: []
              };
            });
            
            // Save the fixed character
            await db.run(
              `UPDATE characters SET character_data = $1 WHERE player_id = $2 AND channel_name = $3`,
              [JSON.stringify(characterData), playerId, channelName]
            );
            
            fixedCount++;
          } else {
            alreadyCorrectCount++;
          }
        } else {
          console.log(`⚠️  ${characterData.name} (${playerId}): Inventory is not an array (${typeof characterData.inventory}), resetting`);
          characterData.inventory = ["Potion"];
          
          // Save the fixed character
          await db.run(
            `UPDATE characters SET character_data = $1 WHERE player_id = $2 AND channel_name = $3`,
            [JSON.stringify(characterData), playerId, channelName]
          );
          
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${row.player_id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n✅ Migration complete!');
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Already correct: ${alreadyCorrectCount}`);
    console.log(`   Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close database connection
    await db.close();
    console.log('\n📊 Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  fixInventoryArrays()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = fixInventoryArrays;
