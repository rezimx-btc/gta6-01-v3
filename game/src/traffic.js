// Traffic and pedestrians: the city alive around Rae. Cars follow the road grid from one
// intersection to the next, slow for the car ahead, and park at the kerb; pedestrians stroll
// the sidewalks and scatter when shots ring out. Nothing here knows about missions or the law.

import { CAR_KINDS, ROADS, TRAFFIC, WORLD } from './config.js';
import { nearestRoadPoint, pushOutOfBuildings, randomRoadPoint } from './city.js';
import { randomPick, randomRange } from './random.js';
import { damageCar } from './player.js';

let nextCarId = 1;

/** A car: kind, colour, pose, speed, health, and who is driving it. */
export function makeCar(kind, x, y, angle, driver, random) {
  const spec = CAR_KINDS[kind];
  const colors = spec.colors;
  return {
    id: nextCarId++,
    kind,
    color: random ? colors[Math.floor(random() * colors.length)] : colors[0],
    x,
    y,
    angle,
    speed: 0,
    health: spec.health,
    wrecked: false,
    driver,
    cruise: random ? TRAFFIC.carSpeed * randomRange(random, 0.6, 1.1) : TRAFFIC.carSpeed,
    target: null,
    wait: 0,
  };
}

/** The intersections of the road grid, as waypoints traffic drives between. */
export function intersections() {
  const points = [];
  for (const vx of ROADS.vertical) {
    for (const hy of ROADS.horizontal) points.push({ x: vx, y: hy });
  }
  return points;
}

/** Pick the next waypoint for a car: a neighbouring intersection along a road. */
function nextWaypoint(car, random) {
  const points = intersections();
  const near = points.filter((p) => Math.hypot(p.x - car.x, p.y - car.y) < 700);
  const pool = near.length > 0 ? near : points;
  return pool[Math.floor(random() * pool.length)];
}

/** A fresh traffic pool: moving cars on the roads and parked cars at the kerbs. */
export function createTraffic(city, random) {
  const cars = [];
  for (let i = 0; i < TRAFFIC.cars; i += 1) {
    const spot = randomRoadPoint(random);
    const kind = randomPick(random, ['sedan', 'sedan', 'sedan', 'taxi', 'truck', 'van', 'sport']);
    const car = makeCar(kind, spot.x, spot.y, spot.angle, 'traffic', random);
    car.speed = TRAFFIC.carSpeed * randomRange(random, 0.7, 1.1);
    car.target = nextWaypoint(car, random);
    cars.push(car);
  }
  for (let i = 0; i < TRAFFIC.parked; i += 1) {
    const spot = randomRoadPoint(random);
    const kind = randomPick(random, ['sedan', 'sedan', 'taxi', 'sport', 'van']);
    const car = makeCar(kind, spot.x + randomRange(random, -30, 30), spot.y + randomRange(random, -30, 30), spot.angle, 'parked', random);
    car.health = 500;
    cars.push(car);
  }
  const peds = [];
  for (let i = 0; i < TRAFFIC.peds; i += 1) {
    const spot = randomRoadPoint(random);
    peds.push(makePed(random, spot.x + randomRange(random, -60, 60), spot.y + randomRange(random, -60, 60)));
  }
  return { cars, peds };
}

/** A pedestrian: a colour, a stroll speed, and a direction that changes at the kerbs. */
export function makePed(random, x, y) {
  return {
    x,
    y,
    angle: random() * Math.PI * 2,
    speed: randomRange(random, TRAFFIC.pedSpeed - TRAFFIC.pedSpeedJitter, TRAFFIC.pedSpeed + TRAFFIC.pedSpeedJitter),
    color: randomPick(random, ['#e8b04b', '#7fb0d8', '#c97b9b', '#8ac97b', '#d8d8d8', '#b07fd8']),
    state: 'walk',
    wait: randomRange(random, 0, 4),
    fleeX: 0,
    fleeY: 0,
  };
}

/** Steer a moving car toward its waypoint, easing off for the car ahead. */
function driveTrafficCar(state, car, dt) {
  if (car.target === null) {
    car.target = nextWaypoint(car, state.random);
    return;
  }
  const dx = car.target.x - car.x;
  const dy = car.target.y - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 40) {
    car.target = nextWaypoint(car, state.random);
    return;
  }
  const want = Math.atan2(dy, dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  let ahead = Infinity;
  for (let i = 0; i < state.cars.length; i += 1) {
    const other = state.cars[i];
    if (other === car || other.wrecked) continue;
    const ox = other.x - car.x;
    const oy = other.y - car.y;
    const along = ox * Math.cos(car.angle) + oy * Math.sin(car.angle);
    const side = Math.abs(-ox * Math.sin(car.angle) + oy * Math.cos(car.angle));
    if (along > 0 && along < 110 && side < 30) ahead = Math.min(ahead, along);
  }
  const goal = ahead < 110 ? Math.max(0, car.cruise * (ahead / 110)) : car.cruise;
  car.speed += Math.max(-260 * dt, Math.min(200 * dt, goal - car.speed));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const fixed = pushOutOfBuildings(state.city, car.x, car.y, CAR_KINDS[car.kind].length / 2 - 4);
  if (fixed.hit) {
    car.angle += Math.PI / 2;
    car.speed *= 0.4;
  }
  car.x = fixed.x;
  car.y = fixed.y;
}

/** One step for every car and pedestrian in the city. */
export function updateTraffic(state, dt) {
  for (let i = 0; i < state.cars.length; i += 1) {
    const car = state.cars[i];
    if (car.wrecked || car.driver === 'player' || car.driver === 'parked' || car.driver === 'police' || car.driver === 'escort') continue;
    driveTrafficCar(state, car, dt);
  }
  for (let i = 0; i < state.peds.length; i += 1) {
    const ped = state.peds[i];
    if (ped.state === 'flee') {
      ped.x += Math.cos(ped.angle) * ped.speed * 2.4 * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * 2.4 * dt;
      ped.wait -= dt;
      if (ped.wait <= 0) ped.state = 'walk';
    } else {
      ped.wait -= dt;
      if (ped.wait <= 0) {
        ped.angle += (state.random() - 0.5) * 2.2;
        ped.wait = randomRange(state.random, 1.5, 5);
      }
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
    }
    const fixed = pushOutOfBuildings(state.city, ped.x, ped.y, 10);
    if (fixed.hit) ped.angle += Math.PI / 2;
    ped.x = Math.max(20, Math.min(WORLD.width - 20, fixed.x));
    ped.y = Math.max(20, Math.min(WORLD.height - 20, fixed.y));
  }
  collideCars(state);
  keepTrafficNearCamera(state);
}

/** Make every pedestrian near (x, y) run away from it. */
export function scatterPeds(state, x, y, radius) {
  for (let i = 0; i < state.peds.length; i += 1) {
    const ped = state.peds[i];
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.state = 'flee';
      ped.angle = Math.atan2(ped.y - y, ped.x - x);
      ped.wait = randomRange(state.random, 1.5, 3);
    }
  }
}

/**
 * Car-on-car bumps: push apart, trade a little speed, crunch bodywork when it is fast.
 * The crunch is gentle on purpose — a tap at city speed dents paint, it does not total
 * the car. When damageCar wrecks the player's car mid-loop, later iterations must not
 * read player.car — the guard below breaks out the moment it becomes null.
 */
export function collideCars(state) {
  const cars = state.cars;
  for (let i = 0; i < cars.length; i += 1) {
    const a = cars[i];
    if (a.wrecked) continue;
    for (let j = i + 1; j < cars.length; j += 1) {
      const b = cars[j];
      if (b.wrecked) continue;
      const ra = CAR_KINDS[a.kind].length / 2;
      const rb = CAR_KINDS[b.kind].length / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = ra + rb - 8;
      if (d >= min || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      const overlap = (min - d) / 2;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;
      const closing = Math.abs(a.speed - b.speed) + 40;
      if (closing > 90) {
        const hadPlayerCar = state.player.car !== null;
        damageCar(state, a, closing * 0.045);
        damageCar(state, b, closing * 0.045);
        // damageCar can wreck the player's car mid-loop: once it is gone, stop touching
        // anything that assumes it is still there and leave this pair alone.
        if (hadPlayerCar && state.player.car === null) break;
        const tmp = a.speed;
        a.speed = b.speed * 0.5;
        b.speed = tmp * 0.5;
      }
    }
  }
}

/** Keep the traffic pool near the camera: respawn far cars, replace wrecked ones slowly. */
function keepTrafficNearCamera(state) {
  const cam = state.camera;
  for (let i = 0; i < state.cars.length; i += 1) {
    const car = state.cars[i];
    if (car.driver === 'player' || car.driver === 'police' || car.driver === 'escort' || car.convoy) continue;
    const d = Math.hypot(car.x - cam.x, car.y - cam.y);
    if (d > TRAFFIC.despawn || (car.wrecked && d > 700)) {
      const spot = randomRoadPoint(state.random);
      car.x = spot.x;
      car.y = spot.y;
      car.angle = spot.angle;
      car.health = CAR_KINDS[car.kind].health;
      car.wrecked = false;
      car.speed = TRAFFIC.carSpeed;
      car.driver = car.driver === 'parked' ? 'parked' : 'traffic';
      car.target = nextWaypoint(car, state.random);
    }
  }
  for (let i = 0; i < state.peds.length; i += 1) {
    const ped = state.peds[i];
    const d = Math.hypot(ped.x - cam.x, ped.y - cam.y);
    if (d > TRAFFIC.despawn) {
      const spot = randomRoadPoint(state.random);
      ped.x = spot.x + randomRange(state.random, -60, 60);
      ped.y = spot.y + randomRange(state.random, -60, 60);
      ped.state = 'walk';
    }
  }
}
