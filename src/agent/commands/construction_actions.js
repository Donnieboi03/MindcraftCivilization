import { actionsList } from './actions.js';

// construction_actions.js
import * as skills from '../library/skills.js';

// Standalone builder (reusable anywhere, not tied to the action system)
export async function buildSimpleHouse(
  bot,
  {
    size = 5,            // footprint width/depth
    height = 4,          // wall height (not counting roof)
    offsetForward = 2,   // build a bit in front of the bot
    materials = {}       // override defaults: { WALL, FLOOR, ROOF, WINDOW, DOOR }
  } = {}
) {
  const CLOSE = 1;

  // Default materials (can be overridden via `materials` param)
  const defaults = {
    WALL: 'oak_planks',
    FLOOR: 'oak_planks',
    ROOF: 'oak_planks',
    WINDOW: 'glass_pane',
    DOOR: 'oak_door'
  };
  const mats = { ...defaults, ...materials };

  // Pick an origin slightly ahead of the bot so we don’t build on ourselves
  const pos = bot.entity.position;
  const baseX = Math.floor(pos.x) + offsetForward;
  const baseY = Math.floor(pos.y);
  const baseZ = Math.floor(pos.z);

  const place = async (type, x, y, z) => {
    await skills.goToPosition(bot, x, y, z, CLOSE);
    await skills.placeBlock(bot, type, x, y, z);
  };

  // 1) Floor
  for (let dx = 0; dx < size; dx++) {
    for (let dz = 0; dz < size; dz++) {
      await place(mats.FLOOR, baseX + dx, baseY, baseZ + dz);
    }
  }

  // 2) Walls with door gap (south face center) + small windows at y=2
  const doorX = baseX + Math.floor(size / 2);
  const doorZ = baseZ;

  for (let dy = 1; dy <= height; dy++) {
    for (let dx = 0; dx < size; dx++) {
      for (let dz = 0; dz < size; dz++) {
        const onEdge = dx === 0 || dz === 0 || dx === size - 1 || dz === size - 1;
        if (!onEdge) continue;

        const x = baseX + dx;
        const y = baseY + dy;
        const z = baseZ + dz;

        // Door gap (2 blocks tall)
        const inDoorGap = x === doorX && z === doorZ && (dy === 1 || dy === 2);
        if (inDoorGap) continue;

        // Windows on level 2, one block in from corners
        const windowRow = dy === 2;
        const nearCorner = dx === 1 || dx === size - 2 || dz === 1 || dz === size - 2;
        const makeWindow = windowRow && nearCorner && (x !== doorX || z !== doorZ);

        await place(makeWindow ? mats.WINDOW : mats.WALL, x, y, z);
      }
    }
  }

  // 3) Flat roof (one block above wall top)
  const roofY = baseY + height + 1;
  for (let dx = 0; dx < size; dx++) {
    for (let dz = 0; dz < size; dz++) {
      await place(mats.ROOF, baseX + dx, roofY, baseZ + dz);
    }
  }

  // 4) Place door (lower then upper—handled by server for simple cases)
  await skills.goToPosition(bot, doorX, baseY + 1, doorZ, CLOSE);
  await skills.placeBlock(bot, mats.DOOR, doorX, baseY + 1, doorZ);

  return { baseX, baseY, baseZ, size, height };
}

// Action list for this module (hooked into your agent elsewhere)
export const constructionActionsList = [
  {
    name: '!constructHouse',
    description: 'Build a small oak house (5×5×4) near the bot.',
    params: {
      size:   { type: 'int', description: 'Footprint size', domain: [3, 15], optional: true, default: 5 },
      height: { type: 'int', description: 'Wall height',   domain: [3, 10], optional: true, default: 4 }
    },
    perform: async function (agent, size = 5, height = 4) {
      let result = '';
      const actionFn = async () => {
        const info = await buildSimpleHouse(agent.bot, { size, height });
        result = `House constructed at ~x:${info.baseX}, y:${info.baseY}, z:${info.baseZ} (size ${size}, height ${height}).`;
      };
      // Run under ActionManager so stop/timeout/resume work consistently
      await agent.actions.runAction('action:constructHouse', actionFn, { timeout: 15 });
      return result;
    }
  }
];