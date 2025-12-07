const fs = require('fs');

const dialoguesData = JSON.parse(fs.readFileSync('./data/dialogues.json', 'utf8'));
const npcsData = JSON.parse(fs.readFileSync('./data/npcs.json', 'utf8'));

console.log('🔍 VALIDATION RESULTS:\n');

// Check NPC to dialogue mapping
const allNpcs = [...npcsData.npcs.merchants, ...npcsData.npcs.quest_givers];
const npcIds = allNpcs.map(n => n.id);
const dialogues = dialoguesData.dialogues;
const dialogueKeys = Object.keys(dialogues);

console.log('📊 NPC-Dialogue Mapping:');
dialogueKeys.forEach(key => {
  const exists = npcIds.includes(key);
  console.log(`  ${exists ? '✓' : '❌'} ${key} ${exists ? '' : '(NPC NOT FOUND)'}`);
});

console.log('\n🔗 Node Reference Validation:');
let errors = 0;
for (const [npcId, dialogue] of Object.entries(dialogues)) {
  for (const [convId, conv] of Object.entries(dialogue.conversations)) {
    const nodeIds = conv.nodes.map(n => n.id);
    nodeIds.push('end'); // Special node
    
    conv.nodes.forEach(node => {
      // Check next
      if (node.next && !nodeIds.includes(node.next)) {
        console.log(`  ❌ ${npcId}/${convId}: node '${node.id}' next='${node.next}' (MISSING)`);
        errors++;
      }
      
      // Check choices
      if (node.choices) {
        node.choices.forEach((choice, i) => {
          if (choice.next && !nodeIds.includes(choice.next)) {
            console.log(`  ❌ ${npcId}/${convId}: node '${node.id}' choice[${i}] next='${choice.next}' (MISSING)`);
            errors++;
          }
        });
      }
    });
  }
}

if (errors === 0) {
  console.log('  ✅ All node references are valid!');
}

console.log(`\n📋 Summary: ${errors} error(s) found`);

// Check for NPCs that might need dialogues
console.log('\n💭 NPCs without dialogue trees:');
const questGivers = allNpcs.filter(n => n.type === 'quest_giver' && !dialogueKeys.includes(n.id));
if (questGivers.length > 0) {
  console.log('  Quest Givers:');
  questGivers.forEach(npc => console.log(`    - ${npc.name} (${npc.id})`));
}
