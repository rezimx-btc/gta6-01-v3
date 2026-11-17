// Rae Vega: on foot and behind the wheel. On foot she walks the sidewalks and the sand;
// in a car she is the car. Entering a car syncs her position to it, so the road pilot never
// reads a stale spawn point, and leaving one puts her on the pavement beside it. Armour,
// bought at the shops, soaks half of every hit until it runs out.

import { CAR_KINDS, KMH, PLAYER, WALK_KMH, WORLD } from './config.js';
import { clampToWorld, pushOutOfBuildings } from './city.js';

/** Where Rae starts: on the beachfront road in Marina Bay, facing Downtown. */
const START_ROAD = { x: 1500, y: 2300 };

/** A fresh player: full health, a starter pistol, no car, no heat, no armour. */
export function createPlayer() {
  return {
    x: START_ROAD.x,
    y: START_ROAD.y - 90,
    angle: -Math.PI / 2,
    speed: 0,
    health: PLAYER.health,
    armor: PLAYER.armor,
    ammo: PLAYER.startAmmo,
    cash: 0,
    earned: 0,
    invuln: 0,
    onFoot: true,
    car: null,
    wanted: 0,
    heat: 0,
    busted: false,
    dead: false,
    steps: 0,
  };
}

/** Put Rae back at the beachfront start, on foot and clean. */
export function resetPlayer(player) {
  player.x = START_ROAD.x;
  player.y = START_ROAD.y - 90;
  player.angle = -Math.PI / 2;
  player.speed = 0;
  player.health = PLAYER.health;
  player.armor = PLAYER.armor;
  player.ammo = PLAYER.startAmmo;
  player.invuln = 0;
  player.onFoot = true;
  player.car = null;
  player.wanted = 0;
  player.heat = 0;
  player.busted = false;
  player.dead = false;
}

/**
 * One step on foot: WASD moves her, Shift runs, buildings are solid, the sea stops her.
 * Returns true when she moved.
 */
export function walkPlayer(state, dt, input) {
  const player = state.player;
  const run = input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const tx = input.throttle();
  const sx = input.steer();
  let dx = 0;
  let dy = 0;
  if (tx !== 0 || sx !== 0) {
    const len = Math.hypot(sx, tx) || 1;
    dx = (sx / len) * run;
    dy = (-tx / len) * run;
  }
  if (dx === 0 && dy === 0) {
    player.speed = 0;
    return false;
  }
  player.x += dx * dt;
  player.y += dy * dt;
  player.angle = Math.atan2(dy, dx);
  player.speed = run;
  player.steps += 1;
  const fixed = pushOutOfBuildings(state.city, player.x, player.y, PLAYER.radius);
  player.x = fixed.x;
  player.y = fixed.y;
  const clamped = clampToWorld(player.x, player.y);
  player.x = clamped.x;
  player.y = clamped.y;
  return true;
}

/**
 * Enter a car: the car becomes hers (its driver flips to 'player') and her position, angle
 * and speed sync to the car at once — anything reading her position afterwards sees the car.
 */
export function enterCar(state, car) {
  const player = state.player;
  car.driver = 'player';
  car.health = Math.max(car.health, 40);
  player.car = car;
  player.onFoot = false;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.speed = car.speed;
}

/** Step out: she appears on the pavement beside the car, on foot again. */
export function exitCar(state) {
  const player = state.player;
  const car = player.car;
  if (car === null) return;
  car.driver = 'parked';
  car.speed = 0;
  const side = player.angle + Math.PI / 2;
  player.x = car.x + Math.cos(side) * 34;
  player.y = car.y + Math.sin(side) * 34;
  const fixed = pushOutOfBuildings(state.city, player.x, player.y, PLAYER.radius);
  player.x = fixed.x;
  player.y = fixed.y;
  const clamped = clampToWorld(player.x, player.y);
  player.x = clamped.x;
  player.y = clamped.y;
  player.angle = car.angle;
  player.speed = 0;
  player.car = null;
  player.onFoot = true;
}

/**
 * One step of arcade car physics: throttle speeds up along the nose, steering turns harder
 * the faster she goes, drag and the brakes slow her down, buildings crunch the bodywork.
 * The crunch is gentle on purpose: a graze costs a little paint, not the whole car.
 */
export function drivePlayerCar(state, dt, input) {
  const player = state.player;
  const car = player.car;
  if (car === null) return;
  const kind = CAR_KINDS[car.kind];
  const throttle = input.throttle();
  const steer = input.steer();
  if (throttle > 0) car.speed += kind.accel * dt;
  else if (throttle < 0) {
    car.speed -= (car.speed > 10 ? kind.brake : kind.accel * 0.55) * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 140 * dt);
  }
  car.speed = Math.max(-130, Math.min(kind.topSpeed, car.speed));
  const turn = steer * 1.9 * dt * Math.min(1, Math.abs(car.speed) / 120 + 0.25);
  car.angle += car.speed >= 0 ? turn : -turn;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const fixed = pushOutOfBuildings(state.city, car.x, car.y, kind.length / 2 - 4);
  if (fixed.hit && Math.abs(car.speed) > 60) {
    damageCar(state, car, Math.abs(car.speed) * 0.05);
    car.speed *= -0.25;
  }
  car.x = fixed.x;
  car.y = fixed.y;
  const clamped = clampToWorld(car.x, car.y);
  car.x = clamped.x;
  car.y = clamped.y;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.speed = car.speed;
}

/**
 * Hurt Rae, unless her invulnerability window is still open. Armour soaks half of every
 * hit first. Returns true when it landed.
 */
export function damagePlayer(state, amount) {
  const player = state.player;
  if (player.invuln > 0 || player.dead || player.busted) return false;
  let rest = amount;
  if (player.armor > 0) {
    const soaked = Math.min(player.armor, rest * 0.5);
    player.armor -= soaked;
    rest -= soaked;
  }
  player.health -= rest;
  player.invuln = PLAYER.invulnerable;
  if (player.health <= 0) {
    player.health = 0;
    player.dead = true;
  }
  return true;
}

/**
 * Hurt a car. A wrecked car stops, smokes, and if it was Rae's she is thrown clear onto the
 * pavement — callers must re-check player.car after this, it may be null now.
 */
export function damageCar(state, car, amount) {
  car.health -= amount;
  if (car.health > 0) return false;
  car.health = 0;
  car.wrecked = true;
  car.speed = 0;
  if (state.player.car === car) {
    const player = state.player;
    player.car = null;
    player.onFoot = true;
    player.x = car.x + 40;
    player.y = car.y + 40;
    const fixed = pushOutOfBuildings(state.city, player.x, player.y, PLAYER.radius);
    player.x = fixed.x;
    player.y = fixed.y;
    player.speed = 0;
  }
  return true;
}

/** The nearest car Rae could steal, within arm's reach, or null. */
export function nearestStealableCar(state) {
  const player = state.player;
  let best = null;
  let bestDist = 70;
  for (let i = 0; i < state.cars.length; i += 1) {
    const car = state.cars[i];
    if (car.wrecked || car.driver === 'player') continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

/**
 * Rae's speed for the HUD, in km/h. On foot she walks at about 5 km/h and runs at about
 * 8; in a car the arcade factor applies. The old code used the car factor everywhere, so
 * walking showed 79 km/h — fast for a courier on foot.
 */
export function playerKmh(state) {
  const player = state.player;
  if (player.onFoot) return Math.round(Math.abs(player.speed) * WALK_KMH);
  return Math.round(Math.abs(player.speed) * KMH);
}
