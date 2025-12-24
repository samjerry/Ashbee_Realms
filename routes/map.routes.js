const express = require('express');
const router = express.Router();
const db = require('../db');
const { embedBuilder } = require('../utils/embedBuilder');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to get adjacent tiles
function getAdjacentTiles(x, y) {
  return {
    north: { x, y: y - 1, direction: 'north' },
    south: { x, y: y + 1, direction: 'south' },
    east: { x: x + 1, y, direction: 'east' },
    west: { x: x - 1, y, direction: 'west' }
  };
}

// Helper function to create map view
function createMapView(character, mapData) {
  const currentX = character.x;
  const currentY = character.y;
  const viewRadius = 2;
  
  let mapView = '';
  for (let y = currentY - viewRadius; y <= currentY + viewRadius; y++) {
    for (let x = currentX - viewRadius; x <= currentX + viewRadius; x++) {
      const key = `${x},${y}`;
      
      if (x === currentX && y === currentY) {
        mapView += '🧙'; // Player position
      } else if (character.mapKnowledge && character.mapKnowledge[key]) {
        const tile = character.mapKnowledge[key];
        mapView += tile.icon || '📍';
      } else {
        mapView += '⬛'; // Unexplored
      }
      mapView += ' ';
    }
    mapView += '\n';
  }
  
  return mapView;
}

// Helper function to reveal current tile
function revealTile(character, mapData) {
  const key = `${character.x},${character.y}`;
  const tile = mapData[key];
  
  if (!character.mapKnowledge) {
    character.mapKnowledge = {};
  }
  
  if (tile) {
    character.mapKnowledge[key] = {
      name: tile.name,
      description: tile.description,
      icon: tile.icon,
      explored: true,
      exploredAt: new Date().toISOString()
    };
  }
}

// GET /map - Show current map view
router.get('/', async (req, res) => {
  try {
    const { user, channel } = req.query;
    
    if (!user || !channel) {
      return res.status(400).json({ 
        error: 'Missing required parameters: user and channel' 
      });
    }

    const character = await db.getCharacter(user, channel.toLowerCase());
    
    if (!character) {
      return res.status(404).json({ 
        error: 'Character not found. Please create a character first using /start' 
      });
    }

    const mapData = await db.getMapData();
    const currentKey = `${character.x},${character.y}`;
    const currentTile = mapData[currentKey] || {
      name: 'Unknown Location',
      description: 'You find yourself in an unfamiliar place.',
      icon: '❓'
    };

    // Reveal current tile
    revealTile(character, mapData);
    
    const mapView = createMapView(character, mapData);
    const adjacent = getAdjacentTiles(character.x, character.y);
    
    // Create movement buttons
    const buttons = new ActionRowBuilder();
    
    // Check each direction
    for (const [direction, coords] of Object.entries(adjacent)) {
      const tileKey = `${coords.x},${coords.y}`;
      const tile = mapData[tileKey];
      
      if (tile) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`move_${direction}`)
            .setLabel(direction.charAt(0).toUpperCase() + direction.slice(1))
            .setStyle(ButtonStyle.Primary)
        );
      }
    }

    const embed = embedBuilder({
      title: `🗺️ ${currentTile.name}`,
      description: currentTile.description,
      fields: [
        {
          name: 'Map View',
          value: `\`\`\`\n${mapView}\`\`\``,
          inline: false
        },
        {
          name: 'Coordinates',
          value: `X: ${character.x}, Y: ${character.y}`,
          inline: true
        },
        {
          name: 'Tiles Explored',
          value: `${Object.keys(character.mapKnowledge || {}).length}`,
          inline: true
        }
      ],
      color: 0x3498db
    });

    res.json({
      embeds: [embed],
      components: buttons.components.length > 0 ? [buttons] : []
    });

  } catch (error) {
    console.error('Error in GET /map:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve map',
      details: error.message 
    });
  }
});

// POST /map/move - Move to a new location
router.post('/move', async (req, res) => {
  try {
    const { user, channel, direction } = req.body;
    
    if (!user || !channel || !direction) {
      return res.status(400).json({ 
        error: 'Missing required parameters: user, channel, and direction' 
      });
    }

    const character = await db.getCharacter(user, channel.toLowerCase());
    
    if (!character) {
      return res.status(404).json({ 
        error: 'Character not found. Please create a character first using /start' 
      });
    }

    const mapData = await db.getMapData();
    let newX = character.x;
    let newY = character.y;

    // Calculate new position based on direction
    switch (direction.toLowerCase()) {
      case 'north':
        newY -= 1;
        break;
      case 'south':
        newY += 1;
        break;
      case 'east':
        newX += 1;
        break;
      case 'west':
        newX -= 1;
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid direction. Use: north, south, east, or west' 
        });
    }

    const newKey = `${newX},${newY}`;
    const newTile = mapData[newKey];

    if (!newTile) {
      return res.status(400).json({ 
        error: 'You cannot move in that direction. There is no path there.' 
      });
    }

    // Update character position
    character.x = newX;
    character.y = newY;
    
    // Reveal new tile
    revealTile(character, mapData);
    
    // Save character with updated position and map knowledge
    await db.saveCharacter(user, channel.toLowerCase(), character);

    // Create new map view
    const mapView = createMapView(character, mapData);
    const adjacent = getAdjacentTiles(newX, newY);
    
    // Create movement buttons for new location
    const buttons = new ActionRowBuilder();
    
    for (const [dir, coords] of Object.entries(adjacent)) {
      const tileKey = `${coords.x},${coords.y}`;
      const tile = mapData[tileKey];
      
      if (tile) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`move_${dir}`)
            .setLabel(dir.charAt(0).toUpperCase() + dir.slice(1))
            .setStyle(ButtonStyle.Primary)
        );
      }
    }

    const embed = embedBuilder({
      title: `🗺️ ${newTile.name}`,
      description: `You travel ${direction}.\n\n${newTile.description}`,
      fields: [
        {
          name: 'Map View',
          value: `\`\`\`\n${mapView}\`\`\``,
          inline: false
        },
        {
          name: 'Coordinates',
          value: `X: ${newX}, Y: ${newY}`,
          inline: true
        },
        {
          name: 'Tiles Explored',
          value: `${Object.keys(character.mapKnowledge || {}).length}`,
          inline: true
        }
      ],
      color: 0x2ecc71
    });

    res.json({
      embeds: [embed],
      components: buttons.components.length > 0 ? [buttons] : []
    });

  } catch (error) {
    console.error('Error in POST /map/move:', error);
    res.status(500).json({ 
      error: 'Failed to move character',
      details: error.message 
    });
  }
});

// GET /map/explore - Explore current location
router.get('/explore', async (req, res) => {
  try {
    const { user, channel } = req.query;
    
    if (!user || !channel) {
      return res.status(400).json({ 
        error: 'Missing required parameters: user and channel' 
      });
    }

    const character = await db.getCharacter(user, channel.toLowerCase());
    
    if (!character) {
      return res.status(404).json({ 
        error: 'Character not found. Please create a character first using /start' 
      });
    }

    const mapData = await db.getMapData();
    const currentKey = `${character.x},${character.y}`;
    const currentTile = mapData[currentKey];

    if (!currentTile) {
      return res.status(404).json({ 
        error: 'Current location not found in map data' 
      });
    }

    // Reveal adjacent tiles
    const adjacent = getAdjacentTiles(character.x, character.y);
    let revealedCount = 0;
    
    if (!character.mapKnowledge) {
      character.mapKnowledge = {};
    }

    for (const coords of Object.values(adjacent)) {
      const key = `${coords.x},${coords.y}`;
      const tile = mapData[key];
      
      if (tile && !character.mapKnowledge[key]) {
        character.mapKnowledge[key] = {
          name: tile.name,
          description: tile.description,
          icon: tile.icon,
          explored: false, // Seen but not visited
          discoveredAt: new Date().toISOString()
        };
        revealedCount++;
      }
    }

    // Save updated map knowledge
    await db.saveCharacter(user, channel.toLowerCase(), character);

    const mapView = createMapView(character, mapData);
    
    const embed = embedBuilder({
      title: `🔍 Exploring ${currentTile.name}`,
      description: `You carefully survey your surroundings...\n\n${revealedCount > 0 ? `You discovered ${revealedCount} new area(s)!` : 'You don\'t see any new areas from here.'}`,
      fields: [
        {
          name: 'Updated Map View',
          value: `\`\`\`\n${mapView}\`\`\``,
          inline: false
        },
        {
          name: 'Total Areas Discovered',
          value: `${Object.keys(character.mapKnowledge || {}).length}`,
          inline: true
        }
      ],
      color: 0x9b59b6
    });

    res.json({
      embeds: [embed]
    });

  } catch (error) {
    console.error('Error in GET /map/explore:', error);
    res.status(500).json({ 
      error: 'Failed to explore location',
      details: error.message 
    });
  }
});

// GET /map/journal - View exploration journal
router.get('/journal', async (req, res) => {
  try {
    const { user, channel } = req.query;
    
    if (!user || !channel) {
      return res.status(400).json({ 
        error: 'Missing required parameters: user and channel' 
      });
    }

    const character = await db.getCharacter(user, channel.toLowerCase());
    
    if (!character) {
      return res.status(404).json({ 
        error: 'Character not found. Please create a character first using /start' 
      });
    }

    const mapKnowledge = character.mapKnowledge || {};
    const exploredTiles = Object.entries(mapKnowledge)
      .filter(([_, tile]) => tile.explored)
      .sort((a, b) => {
        const dateA = new Date(a[1].exploredAt || 0);
        const dateB = new Date(b[1].exploredAt || 0);
        return dateB - dateA;
      });

    const discoveredTiles = Object.entries(mapKnowledge)
      .filter(([_, tile]) => !tile.explored)
      .sort((a, b) => {
        const dateA = new Date(a[1].discoveredAt || 0);
        const dateB = new Date(b[1].discoveredAt || 0);
        return dateB - dateA;
      });

    let journalText = '**🏛️ Explored Locations:**\n';
    if (exploredTiles.length > 0) {
      exploredTiles.slice(0, 10).forEach(([coords, tile]) => {
        journalText += `${tile.icon} **${tile.name}** (${coords})\n`;
      });
      if (exploredTiles.length > 10) {
        journalText += `_...and ${exploredTiles.length - 10} more_\n`;
      }
    } else {
      journalText += '_None yet_\n';
    }

    journalText += '\n**👁️ Discovered (Not Visited):**\n';
    if (discoveredTiles.length > 0) {
      discoveredTiles.slice(0, 10).forEach(([coords, tile]) => {
        journalText += `${tile.icon} **${tile.name}** (${coords})\n`;
      });
      if (discoveredTiles.length > 10) {
        journalText += `_...and ${discoveredTiles.length - 10} more_\n`;
      }
    } else {
      journalText += '_None yet_\n';
    }

    const embed = embedBuilder({
      title: `📖 ${character.name}'s Exploration Journal`,
      description: journalText,
      fields: [
        {
          name: 'Statistics',
          value: `Explored: ${exploredTiles.length}\nDiscovered: ${discoveredTiles.length}\nTotal: ${Object.keys(mapKnowledge).length}`,
          inline: true
        }
      ],
      color: 0xe67e22
    });

    res.json({
      embeds: [embed]
    });

  } catch (error) {
    console.error('Error in GET /map/journal:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve exploration journal',
      details: error.message 
    });
  }
});

// POST /map/teleport - Admin command to teleport to coordinates
router.post('/teleport', async (req, res) => {
  try {
    const { user, channel, x, y, admin } = req.body;
    
    // Simple admin check (you should implement proper admin verification)
    if (!admin) {
      return res.status(403).json({ 
        error: 'This command requires admin privileges' 
      });
    }

    if (!user || !channel || x === undefined || y === undefined) {
      return res.status(400).json({ 
        error: 'Missing required parameters: user, channel, x, y' 
      });
    }

    const character = await db.getCharacter(user, channel.toLowerCase());
    
    if (!character) {
      return res.status(404).json({ 
        error: 'Character not found' 
      });
    }

    const mapData = await db.getMapData();
    const targetKey = `${x},${y}`;
    const targetTile = mapData[targetKey];

    if (!targetTile) {
      return res.status(400).json({ 
        error: 'No tile exists at those coordinates' 
      });
    }

    // Update character position
    character.x = parseInt(x);
    character.y = parseInt(y);
    
    // Reveal target tile
    revealTile(character, mapData);
    
    // Save character
    await db.saveCharacter(user, channel.toLowerCase(), character);

    const mapView = createMapView(character, mapData);

    const embed = embedBuilder({
      title: `✨ Teleported to ${targetTile.name}`,
      description: targetTile.description,
      fields: [
        {
          name: 'Map View',
          value: `\`\`\`\n${mapView}\`\`\``,
          inline: false
        },
        {
          name: 'New Coordinates',
          value: `X: ${x}, Y: ${y}`,
          inline: true
        }
      ],
      color: 0xf39c12
    });

    res.json({
      embeds: [embed]
    });

  } catch (error) {
    console.error('Error in POST /map/teleport:', error);
    res.status(500).json({ 
      error: 'Failed to teleport character',
      details: error.message 
    });
  }
});

module.exports = router;