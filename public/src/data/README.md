# Frontend Data Files

This directory contains data files that are used by the frontend application.

## world_grid.json

This file is a copy of `/data/world_grid.json` from the root directory. It contains the world map grid layout, biome positions, and adjacency information.

**Important:** This file is duplicated because:
1. The frontend build (Vite) cannot access files outside the `public/` directory
2. The backend needs the original in `/data/` for server-side operations
3. Both files should be kept in sync when making changes

### When to Update

If you modify the world map structure (add/remove biomes, change coordinates, etc.):
1. Edit `/data/world_grid.json` (the source of truth)
2. Copy it to `/public/src/data/world_grid.json`
3. Run `npm run build` in the `public/` directory to verify

### Automation (Future)

Consider adding a build script to automatically copy this file during the build process to avoid manual synchronization.
