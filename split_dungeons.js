/**
 * Dungeon Splitter Script
 * Splits the monolithic dungeons.json into individual dungeon files
 */

const fs = require('fs');
const path = require('path');

// Load the current dungeons.json
const dungeonsData = require('./data/dungeons.json');

// Difficulty mapping
const difficultyFolders = {
  'easy': 'easy',
  'medium': 'medium',
  'hard': 'hard',
  'very_hard': 'very_hard',
  'extreme': 'extreme',
  'nightmare': 'extreme', // Map old nightmare to extreme
  'scaling': 'special'
};

console.log('🔪 Splitting dungeons.json into individual files...\n');

let splitCount = 0;

// Split each dungeon into its own file
Object.entries(dungeonsData.dungeons).forEach(([dungeonId, dungeonData]) => {
  const difficulty = dungeonData.difficulty;
  const folder = difficultyFolders[difficulty];
  
  if (!folder) {
    console.warn(`⚠️  Unknown difficulty '${difficulty}' for dungeon '${dungeonId}'`);
    return;
  }
  
  const filePath = path.join(__dirname, 'data', 'dungeons', folder, `${dungeonId}.json`);
  
  // Write individual dungeon file
  fs.writeFileSync(filePath, JSON.stringify(dungeonData, null, 2));
  
  console.log(`✅ Created: data/dungeons/${folder}/${dungeonId}.json`);
  splitCount++;
});

// Create metadata file with difficulty definitions and modifiers
const metadata = {
  dungeon_difficulties: dungeonsData.dungeon_difficulties,
  dungeon_modifiers: dungeonsData.dungeon_modifiers
};

fs.writeFileSync(
  path.join(__dirname, 'data', 'dungeons', '_metadata.json'),
  JSON.stringify(metadata, null, 2)
);

console.log(`✅ Created: data/dungeons/_metadata.json`);

console.log(`\n🎉 Successfully split ${splitCount} dungeons into individual files!`);
console.log('\n📁 Folder structure:');
console.log('  data/dungeons/');
console.log('    ├── easy/        (5 dungeons)');
console.log('    ├── medium/      (5 dungeons)');
console.log('    ├── hard/        (5 dungeons)');
console.log('    ├── very_hard/   (5 dungeons)');
console.log('    ├── extreme/     (5 dungeons)');
console.log('    ├── special/     (1 dungeon)');
console.log('    └── _metadata.json');
