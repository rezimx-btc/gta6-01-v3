// The city of Solmar: its roads, blocks, buildings, beach and park, all laid out once from
// a seed. Nothing here draws or moves; it answers geometry questions (is this a road?
// which district? what pushes a car out of a building?) for the traffic, the police and
// the renderer. The third dimension lives here too: every building carries its height, so
// the 3D renderer can raise the same city the first game drew flat.

import { DISTRICTS, ROADS, WORLD } from './config.js';
import { randomPick, randomRange } from './random.js';

const ROAD_HALF = ROADS.width / 2;
const BEACH_TOP = 2320;
const WATER_TOP = 2480;

/** Roof colours per district, so each part of town reads differently from above. */
const ROOFS = {
  'The Hills': ['#a8b89a', '#c9b458', '#8fae7a'],
  Downtown: ['#6b7d8c', '#8c8a6b', '#5c6b7d', '#c9b458'],
  'Old Port': ['#7a8fae', '#6b7d8c', '#8c6b5a'],
  'Barrio Sol': ['#d08a4e', '#c96b6b', '#c9b458', '#8a6f8c'],
  'Marina Bay': ['#4e9fb0', '#7ab0a0', '#c9c9c9'],
};

/**
 * Build the city from a seed: buildings packed into the blocks between roads, a park in one
 * Downtown block, palms along the beachfront, cranes and containers down at the Old Port.
 */
export function buildCity(random) {
  const buildings = [];
  const decorations = [];
  const vertical = ROADS.vertical;
  const horizontal = ROADS.horizontal;

  // The blocks are the rectangles between neighbouring roads (and the world edges).
  const xs = [0, ...vertical, WORLD.width];
  const ys = [0, ...horizontal, WORLD.height];
  const parkBlock = { bx: 2, by: 1 };

  for (let by = 0; by < ys.length - 1; by += 1) {
    for (let bx = 0; bx < xs.length - 1; bx += 1) {
      const x0 = xs[bx] + (bx === 0 ? 0 : ROAD_HALF);
      const x1 = xs[bx + 1] - (bx + 1 === xs.length - 1 ? 0 : ROAD_HALF);
      const y0 = ys[by] + (by === 0 ? 0 : ROAD_HALF);
      const y1 = ys[by + 1] - (by + 1 === ys.length - 1 ? 0 : ROAD_HALF);
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 90 || h < 90) continue;
      if (y0 >= BEACH_TOP) continue;
      const district = districtAt((x0 + x1) / 2, (y0 + y1) / 2);
      if (bx === parkBlock.bx && by === parkBlock.by) {
        for (let t = 0; t < 26; t += 1) {
          decorations.push({ kind: 'tree', x: randomRange(random, x0 + 20, x1 - 20), y: randomRange(random, y0 + 20, y1 - 20), size: randomRange(random, 10, 18) });
        }
        continue;
      }
      const cols = w > 320 ? 2 : 1;
      const rows = h > 280 ? 2 : 1;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          if (random() < 0.12) continue;
          const bw = (w / cols) * randomRange(random, 0.55, 0.8);
          const bh = (h / rows) * randomRange(random, 0.5, 0.75);
          const bx0 = x0 + (c * w) / cols + (w / cols - bw) / 2;
          const by0 = y0 + (r * h) / rows + (h / rows - bh) / 2;
          buildings.push({
            x: bx0,
            y: by0,
            width: bw,
            height: bh,
            tall: randomRange(random, 6, district === 'Downtown' ? 46 : 22),
            color: randomPick(random, ROOFS[district] ?? ROOFS.Downtown),
            district,
          });
        }
      }
    }
  }

  // Palms along the beachfront road, cranes and containers at the Old Port docks.
  for (let x = 120; x < WORLD.width; x += 150) {
    decorations.push({ kind: 'palm', x: x + randomRange(random, -20, 20), y: BEACH_TOP + 42, size: 14 });
  }
  for (let i = 0; i < 5; i += 1) {
    decorations.push({ kind: 'crane', x: 150 + i * 170, y: 420 + randomRange(random, -30, 30), size: 60 });
  }
  for (let i = 0; i < 18; i += 1) {
    decorations.push({
      kind: 'container',
      x: randomRange(random, 90, 1050),
      y: randomRange(random, 900, 1750),
      size: randomRange(random, 22, 34),
      color: randomPick(random, ['#c96b4f', '#4f7ec9', '#c9b458', '#5a8c6b']),
    });
  }

  return {
    buildings,
    decorations,
    beachTop: BEACH_TOP,
    waterTop: WATER_TOP,
    blocks: buildings.length,
  };
}

/** The district a point sits in, by its rectangle. */
export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.width && y >= d.y && y < d.y + d.height) return d.name;
  }
  return 'Downtown';
}

/** True when a point is on a road (or on the beachfront sand strip's road edge). */
export function isRoad(x, y) {
  if (x < 0 || y < 0 || x > WORLD.width || y > WORLD.height) return false;
  for (const vx of ROADS.vertical) if (Math.abs(x - vx) <= ROAD_HALF) return true;
  for (const hy of ROADS.horizontal) if (Math.abs(y - hy) <= ROAD_HALF) return true;
  return false;
}

/** True when a point is in the sea (south of the beach). */
export function isWater(x, y) {
  return y >= WATER_TOP && x >= 0 && x <= WORLD.width;
}

/** True when a point is on sand (between the beachfront road and the water). */
export function isSand(x, y) {
  return y >= BEACH_TOP && y < WATER_TOP && x >= 0 && x <= WORLD.width;
}

/** The nearest point on a road centre line to (x, y). */
export function nearestRoadPoint(x, y, random) {
  let best = null;
  let bestDist = Infinity;
  for (const vx of ROADS.vertical) {
    const d = Math.abs(x - vx);
    if (d < bestDist) {
      bestDist = d;
      best = { x: vx, y: Math.max(60, Math.min(WORLD.height - 60, y)) };
    }
  }
  for (const hy of ROADS.horizontal) {
    const d = Math.abs(y - hy);
    if (d < bestDist) {
      bestDist = d;
      best = { x: Math.max(60, Math.min(WORLD.width - 60, x)), y: hy };
    }
  }
  if (best === null) return { x: 1500, y: 1300 };
  return best;
}

/** A random point on a random road, for spawning traffic and police. */
export function randomRoadPoint(random) {
  if (random() < 0.5) {
    const vx = randomPick(random, ROADS.vertical);
    return { x: vx + randomRange(random, -24, 24), y: randomRange(random, 80, WORLD.height - 80), angle: random() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
  }
  const hy = randomPick(random, ROADS.horizontal);
  return { x: randomRange(random, 80, WORLD.width - 80), y: hy + randomRange(random, -24, 24), angle: random() < 0.5 ? 0 : Math.PI };
}

/** The building a point sits inside, or null. */
export function buildingAt(city, x, y) {
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return b;
  }
  return null;
}

/**
 * Push a circle out of every building it overlaps: returns the corrected centre and whether
 * it hit anything. Buildings are solid; roads, sand and water never block.
 */
export function pushOutOfBuildings(city, x, y, radius) {
  let hit = false;
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    const cx = Math.max(b.x, Math.min(x, b.x + b.width));
    const cy = Math.max(b.y, Math.min(y, b.y + b.height));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    hit = true;
    if (d2 === 0) {
      // Dead centre inside the block: shove out along the shorter axis.
      const left = x - b.x;
      const right = b.x + b.width - x;
      const top = y - b.y;
      const bottom = b.y + b.height - y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = b.x - radius;
      else if (m === right) x = b.x + b.width + radius;
      else if (m === top) y = b.y - radius;
      else y = b.y + b.height + radius;
    } else {
      const d = Math.sqrt(d2);
      x = cx + (dx / d) * radius;
      y = cy + (dy / d) * radius;
    }
  }
  return { x, y, hit };
}

/** Clamp a point inside the world, keeping it out of the sea. */
export function clampToWorld(x, y) {
  return {
    x: Math.max(20, Math.min(WORLD.width - 20, x)),
    y: Math.max(20, Math.min(WATER_TOP - 16, y)),
  };
}
