// The law: heat, wanted stars, and the police who answer them. Crimes add heat; heat sets
// the wanted level; the wanted level decides how many patrol cars and foot cops hunt Rae.
// Lose them by breaking line of sight and staying quiet, and the heat cools off — unless the
// helicopter is overhead, in which case the sky is watching and the heat barely moves.

import { CAR_KINDS, HELI, WANTED } from './config.js';
import { pushOutOfBuildings, randomRoadPoint } from './city.js';
import { makeCar } from './traffic.js';
import { damageCar, damagePlayer } from './player.js';
import { createHelis, updateHelis } from './helicopter.js';

/** The police pool: patrol cars live in state.cars (driver 'police'), foot cops live here. */
export function createPolice() {
  return { foot: [], helis: createHelis() };
}

/** Add heat for a crime: stealing, hitting a pedestrian, firing a shot, ramming a car. */
export function addHeat(state, amount) {
  const player = state.player;
  player.heat = Math.min(320, player.heat + amount);
  player.wanted = wantedFromHeat(player.heat);
}

/** The wanted level a heat value buys, 0 to 5. */
export function wantedFromHeat(heat) {
  let level = 0;
  for (let i = 0; i < WANTED.thresholds.length; i += 1) {
    if (heat >= WANTED.thresholds[i]) level = i;
  }
  return Math.min(WANTED.max, level);
}

/** Count the patrol cars currently hunting. */
function countPoliceCars(state) {
  let n = 0;
  for (let i = 0; i < state.cars.length; i += 1) {
    if (state.cars[i].driver === 'police' && !state.cars[i].wrecked) n += 1;
  }
  return n;
}

/** Spawn one patrol car on a road near the camera, already rolling toward Rae. */
function spawnPoliceCar(state) {
  const spot = randomRoadPoint(state.random);
  const car = makeCar('police', spot.x, spot.y, Math.atan2(state.player.y - spot.y, state.player.x - spot.x), 'police', state.random);
  car.health = 500;
  car.speed = 200;
  state.cars.push(car);
  return car;
}

/** Spawn one foot cop near Rae, on the pavement. */
function spawnFootCop(state) {
  const angle = state.random() * Math.PI * 2;
  const dist = 420 + state.random() * 200;
  state.police.foot.push({
    x: state.player.x + Math.cos(angle) * dist,
    y: state.player.y + Math.sin(angle) * dist,
    angle: 0,
    speed: 195,
    bustT: 0,
  });
}

/** One step of the law: cool the heat, match the patrol to the wanted level, hunt Rae. */
export function updatePolice(state, dt) {
  const player = state.player;
  if (player.dead || player.busted) return;

  // The helicopter watches from above: while it circles, hiding does not cool the heat.
  updateHelis(state, dt);
  const watched = state.police.helis.some((h) => h.active);

  // Heat cools faster when no police can see her.
  let nearest = Infinity;
  for (let i = 0; i < state.cars.length; i += 1) {
    const car = state.cars[i];
    if (car.driver !== 'police' || car.wrecked) continue;
    nearest = Math.min(nearest, Math.hypot(car.x - player.x, car.y - player.y));
  }
  for (let i = 0; i < state.police.foot.length; i += 1) {
    const cop = state.police.foot[i];
    nearest = Math.min(nearest, Math.hypot(cop.x - player.x, cop.y - player.y));
  }
  const hidden = nearest > 420 && !watched;
  const decay = watched ? HELI.heatDecayWhileWatched : (hidden ? WANTED.heatDecayHidden : WANTED.heatDecay);
  player.heat = Math.max(0, player.heat - decay * dt);
  player.wanted = wantedFromHeat(player.heat);

  // Match the patrol to the wanted level: spawn what is missing, retire the rest.
  const wantCars = WANTED.policeCars[player.wanted];
  let haveCars = countPoliceCars(state);
  while (haveCars < wantCars) {
    spawnPoliceCar(state);
    haveCars += 1;
  }
  const wantFoot = WANTED.policeFoot[player.wanted];
  while (state.police.foot.length < wantFoot) spawnFootCop(state);

  // Patrol cars chase: steer at her, ram what they catch.
  for (let i = 0; i < state.cars.length; i += 1) {
    const car = state.cars[i];
    if (car.driver !== 'police' || car.wrecked) continue;
    const dx = player.x - car.x;
    const dy = player.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (player.wanted === 0 && dist > 700) {
      car.speed = Math.max(0, car.speed - 200 * dt);
      continue;
    }
    const want = Math.atan2(dy, dx);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.8 * dt, Math.min(2.8 * dt, diff));
    const top = CAR_KINDS.police.topSpeed;
    car.speed += Math.max(-300 * dt, Math.min(320 * dt, top - car.speed));
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Patrol cars stay on the streets: buildings are solid, even for the law.
    const fixed = pushOutOfBuildings(state.city, car.x, car.y, 26);
    if (fixed.hit) {
      car.angle += 1.1;
      car.speed *= 0.55;
    }
    car.x = fixed.x;
    car.y = fixed.y;
    if (player.wanted > 0 && dist < 34) {
      if (player.car !== null) {
        const hadCar = player.car !== null;
        damageCar(state, player.car, 14 * dt);
        if (hadCar && player.car === null) break;
      } else {
        damagePlayer(state, 12 * dt);
      }
      car.speed *= 0.5;
    }
  }

  // Foot cops run her down; cornered on foot, she gets busted.
  for (let i = state.police.foot.length - 1; i >= 0; i -= 1) {
    const cop = state.police.foot[i];
    const dx = player.x - cop.x;
    const dy = player.y - cop.y;
    const dist = Math.hypot(dx, dy);
    cop.angle = Math.atan2(dy, dx);
    if (player.wanted === 0 && dist > 700) {
      state.police.foot.splice(i, 1);
      continue;
    }
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    if (player.onFoot && dist < WANTED.bustRadius && Math.abs(player.speed) < 60) {
      cop.bustT += dt;
      if (cop.bustT > 1.5) player.busted = true;
    } else {
      cop.bustT = 0;
    }
  }
}

/** Clear the patrol (a new game, or the heat is gone and the streets are quiet again). */
export function clearPolice(state) {
  for (let i = state.cars.length - 1; i >= 0; i -= 1) {
    if (state.cars[i].driver === 'police') state.cars.splice(i, 1);
  }
  state.police.foot.length = 0;
  for (let i = 0; i < state.police.helis.length; i += 1) state.police.helis[i].active = false;
}
