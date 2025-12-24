const express = require('express');
const router = express.Router();
const db = require('../db');
const MapKnowledgeManager = require('../game/MapKnowledgeManager');
const { loadData } = require('../data/data_loader');

// Helper function to calculate distance
function calculateDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Helper function to get danger hint based on distance
function getDangerHint(distance) {
    if (distance === 0) return 'You are here!';
    if (distance === 1) return 'Extremely close! Right next to you!';
    if (distance === 2) return 'Very close! Just a step away!';
    if (distance <= 4) return 'Nearby. You sense something close.';
    if (distance <= 6) return 'In the area. Not too far.';
    if (distance <= 10) return 'Some distance away.';
    return 'Far away.';
}

// Helper function to generate tile hint
function generateTileHint(tileX, tileY, targetX, targetY) {
    const dx = targetX - tileX;
    const dy = targetY - tileY;
    const distance = calculateDistance(tileX, tileY, targetX, targetY);
    
    let direction = '';
    if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'east' : 'west';
    } else if (Math.abs(dy) > Math.abs(dx)) {
        direction = dy > 0 ? 'south' : 'north';
    } else {
        const horizontal = dx > 0 ? 'east' : 'west';
        const vertical = dy > 0 ? 'south' : 'north';
        direction = `${vertical}-${horizontal}`;
    }
    
    return {
        distance,
        direction,
        hint: getDangerHint(distance)
    };
}

// GET /api/map/knowledge - Get player's map knowledge
router.get('/knowledge', async (req, res) => {
    try {
        const userId = req.user.id;
        const knowledge = await MapKnowledgeManager.getPlayerKnowledge(userId);
        
        res.json({
            success: true,
            knowledge
        });
    } catch (error) {
        console.error('Error fetching map knowledge:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch map knowledge'
        });
    }
});

// GET /api/map/grid - Get world grid data
router.get('/grid', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get player's current position
        const player = await db.query(
            'SELECT current_biome_id, grid_x, grid_y FROM players WHERE user_id = $1',
            [userId]
        );
        
        if (player.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }
        
        const { current_biome_id, grid_x, grid_y } = player.rows[0];
        
        // Get discovered tiles
        const discoveredTiles = await MapKnowledgeManager.getDiscoveredTiles(userId, current_biome_id);
        
        res.json({
            success: true,
            currentPosition: { x: grid_x, y: grid_y },
            biomeId: current_biome_id,
            discoveredTiles
        });
    } catch (error) {
        console.error('Error fetching grid data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch grid data'
        });
    }
});

// POST /api/map/discover - Discover a region
router.post('/discover', async (req, res) => {
    try {
        const userId = req.user.id;
        const { biomeId } = req.body;
        
        if (!biomeId) {
            return res.status(400).json({
                success: false,
                error: 'Biome ID is required'
            });
        }
        
        // Get player's current position
        const player = await db.query(
            'SELECT current_biome_id, grid_x, grid_y FROM players WHERE user_id = $1',
            [userId]
        );
        
        if (player.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }
        
        const { current_biome_id, grid_x, grid_y } = player.rows[0];
        
        // Discover the region
        const result = await MapKnowledgeManager.discoverRegion(userId, biomeId, grid_x, grid_y);
        
        res.json({
            success: true,
            message: 'Region discovered successfully',
            data: result
        });
    } catch (error) {
        console.error('Error discovering region:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to discover region'
        });
    }
});

// POST /api/map/scout-tile - Scout adjacent tile
router.post('/scout-tile', async (req, res) => {
    try {
        const userId = req.user.id;
        const { x, y } = req.body;
        
        if (x === undefined || y === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Coordinates (x, y) are required'
            });
        }
        
        // Get player's current position
        const player = await db.query(
            'SELECT current_biome_id, grid_x, grid_y FROM players WHERE user_id = $1',
            [userId]
        );
        
        if (player.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }
        
        const { current_biome_id, grid_x, grid_y } = player.rows[0];
        
        // Check if tile is adjacent
        const distance = calculateDistance(grid_x, grid_y, x, y);
        if (distance !== 1) {
            return res.status(400).json({
                success: false,
                error: 'Can only scout adjacent tiles'
            });
        }
        
        // Scout the tile
        const result = await MapKnowledgeManager.scoutTile(userId, current_biome_id, x, y);
        
        res.json({
            success: true,
            message: 'Tile scouted successfully',
            data: result
        });
    } catch (error) {
        console.error('Error scouting tile:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to scout tile'
        });
    }
});

// POST /api/map/explore-tile - Explore a tile
router.post('/explore-tile', async (req, res) => {
    try {
        const userId = req.user.id;
        const { x, y } = req.body;
        
        if (x === undefined || y === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Coordinates (x, y) are required'
            });
        }
        
        // Get player's current position
        const player = await db.query(
            'SELECT current_biome_id, grid_x, grid_y FROM players WHERE user_id = $1',
            [userId]
        );
        
        if (player.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }
        
        const { current_biome_id, grid_x, grid_y } = player.rows[0];
        
        // Check if player is on the tile
        if (grid_x !== x || grid_y !== y) {
            return res.status(400).json({
                success: false,
                error: 'You must be on the tile to explore it'
            });
        }
        
        // Explore the tile
        const result = await MapKnowledgeManager.exploreTile(userId, current_biome_id, x, y);
        
        res.json({
            success: true,
            message: 'Tile explored successfully',
            data: result
        });
    } catch (error) {
        console.error('Error exploring tile:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to explore tile'
        });
    }
});

// POST /api/map/move - Move to discovered tile
router.post('/move', async (req, res) => {
    try {
        const userId = req.user.id;
        const { x, y } = req.body;
        
        if (x === undefined || y === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Coordinates (x, y) are required'
            });
        }
        
        // Get player's current position
        const player = await db.query(
            'SELECT current_biome_id, grid_x, grid_y FROM players WHERE user_id = $1',
            [userId]
        );
        
        if (player.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }
        
        const { current_biome_id, grid_x, grid_y } = player.rows[0];
        
        // Check if tile is adjacent
        const distance = calculateDistance(grid_x, grid_y, x, y);
        if (distance !== 1) {
            return res.status(400).json({
                success: false,
                error: 'Can only move to adjacent tiles'
            });
        }
        
        // Check if tile is discovered
        const isDiscovered = await MapKnowledgeManager.isTileDiscovered(userId, current_biome_id, x, y);
        if (!isDiscovered) {
            return res.status(400).json({
                success: false,
                error: 'Tile must be scouted before moving to it'
            });
        }
        
        // Move player
        await db.query(
            'UPDATE players SET grid_x = $1, grid_y = $2 WHERE user_id = $3',
            [x, y, userId]
        );
        
        res.json({
            success: true,
            message: 'Moved successfully',
            newPosition: { x, y }
        });
    } catch (error) {
        console.error('Error moving player:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to move player'
        });
    }
});

// GET /api/map/fog-hint/:biome_id/:x/:y - Get fog hint
router.get('/fog-hint/:biome_id/:x/:y', async (req, res) => {
    try {
        const userId = req.user.id;
        const { biome_id, x, y } = req.params;
        
        const tileX = parseInt(x);
        const tileY = parseInt(y);
        
        if (isNaN(tileX) || isNaN(tileY)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid coordinates'
            });
        }
        
        // Get player's current position
        const player = await db.query(
            'SELECT grid_x, grid_y FROM players WHERE user_id = $1',
            [userId]
        );
        
        if (player.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }
        
        const { grid_x, grid_y } = player.rows[0];
        
        // Get biome data to find points of interest
        const biomes = loadData('biomes');
        const biome = biomes.find(b => b.id === biome_id);
        
        if (!biome || !biome.grid) {
            return res.status(404).json({
                success: false,
                error: 'Biome not found or has no grid'
            });
        }
        
        // Find nearest point of interest
        let nearestHint = null;
        let minDistance = Infinity;
        
        if (biome.grid.poi) {
            for (const poi of biome.grid.poi) {
                const hint = generateTileHint(tileX, tileY, poi.x, poi.y);
                if (hint.distance < minDistance) {
                    minDistance = hint.distance;
                    nearestHint = {
                        ...hint,
                        type: poi.type
                    };
                }
            }
        }
        
        res.json({
            success: true,
            hint: nearestHint || {
                hint: 'Nothing of interest detected.',
                distance: 0,
                direction: 'unknown'
            }
        });
    } catch (error) {
        console.error('Error getting fog hint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get fog hint'
        });
    }
});

// GET /api/map/biome-grid/:biome_id - Get biome grid config
router.get('/biome-grid/:biome_id', async (req, res) => {
    try {
        const { biome_id } = req.params;
        
        // Load biome data
        const biomes = loadData('biomes');
        const biome = biomes.find(b => b.id === biome_id);
        
        if (!biome) {
            return res.status(404).json({
                success: false,
                error: 'Biome not found'
            });
        }
        
        if (!biome.grid) {
            return res.status(404).json({
                success: false,
                error: 'Biome has no grid configuration'
            });
        }
        
        res.json({
            success: true,
            grid: biome.grid
        });
    } catch (error) {
        console.error('Error fetching biome grid:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch biome grid configuration'
        });
    }
});

module.exports = router;
