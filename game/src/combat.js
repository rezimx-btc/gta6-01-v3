// Combat: Rae's pistol, the bullets it fires, the rivals who shoot back, and the pickups
// the streets leave behind. Bullets are fast and dumb; enemies are slow and brave; pickups
// are the only free lunch in Solmar.

import { buildingAt } from './city.js';
import { damageCar, damagePlayer } from './player.js';
import { addHeat } from './police.js';
import { WANTED } from './config.js';
import { scatterPeds } from './traffic.js';

const BULLET_SPEED = 720;
const BULLET_LIFE = 1.1;
const ENEMY_HEALTH = 50;
const ENEMY_RANGE = 420;
const ENEMY_SHOOT_DELAY = 1.15;

/** Fire one shot from Rae toward an angle: costs a bullet, makes noise, draws heat. */
export function shootPlayer(state, angle) {
  const player = state.player;
  if (player.ammo <= 0 || player.dead || player.busted) return false;
  player.ammo -= 1;
  state.bullets.push({
    x: player.x + Math.cos(angle) * 20,
    y: player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    life: BULLET_LIFE,
    from: 'player',
    damage: 34,
  });
  scatterPeds(state, player.x, player.y, 260);
  addHeat(state, WANTED.crimeShoot);
  state.stats.shotsFired += 1;
  return true;
}

/** Put rival shooters on the street at (x, y): they chase Rae and fire back. */
export function spawnEnemies(state, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    state.enemies.push({
      x: x + (state.random() - 0.5) * 160,
      y: y + (state.random() - 0.5) * 160,
      angle: 0,
      health: ENEMY_HEALTH,
      speed: 150,
      state: 'chase',
      shootT: 0.6 + state.random() * 0.8,
    });
  }
}

/** Drop a pickup: health, ammo or cash. */
export function spawnPickup(state, x, y, kind, amount) {
  state.pickups.push({ x, y, kind, amount, t: 0 });
}

/** One step of combat: bullets fly, enemies hunt, pickups wait to be collected. */
export function updateCombat(state, dt) {
  const player = state.player;

  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || buildingAt(state.city, b.x, b.y) !== null;
    if (!dead) {
      if (b.from === 'player') {
        for (let e = 0; e < state.enemies.length; e += 1) {
          const enemy = state.enemies[e];
          if (Math.hypot(enemy.x - b.x, enemy.y - b.y) < 18) {
            enemy.health -= b.damage;
            dead = true;
            if (enemy.health <= 0) {
              state.enemies.splice(e, 1);
              spawnPickup(state, enemy.x, enemy.y, 'cash', 60);
              state.stats.kills += 1;
            }
            break;
          }
        }
        if (!dead) {
          for (let c = 0; c < state.cars.length; c += 1) {
            const car = state.cars[c];
            if (car.wrecked || car.driver === 'player') continue;
            if (Math.hypot(car.x - b.x, car.y - b.y) < 26) {
              damageCar(state, car, b.damage);
              dead = true;
              break;
            }
          }
        }
      } else if (Math.hypot(player.x - b.x, player.y - b.y) < 16) {
        damagePlayer(state, b.damage);
        dead = true;
      }
    }
    if (dead) state.bullets.splice(i, 1);
  }

  for (let i = 0; i < state.enemies.length; i += 1) {
    const enemy = state.enemies[i];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    enemy.angle = Math.atan2(dy, dx);
    if (dist > ENEMY_RANGE) {
      enemy.x += Math.cos(enemy.angle) * enemy.speed * dt;
      enemy.y += Math.sin(enemy.angle) * enemy.speed * dt;
    } else {
      enemy.shootT -= dt;
      if (enemy.shootT <= 0 && !player.dead && !player.busted) {
        enemy.shootT = ENEMY_SHOOT_DELAY + state.random() * 0.5;
        state.bullets.push({
          x: enemy.x + Math.cos(enemy.angle) * 20,
          y: enemy.y + Math.sin(enemy.angle) * 20,
          vx: Math.cos(enemy.angle) * BULLET_SPEED * 0.85,
          vy: Math.sin(enemy.angle) * BULLET_SPEED * 0.85,
          life: BULLET_LIFE,
          from: 'enemy',
          damage: 12,
        });
      }
    }
  }

  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const p = state.pickups[i];
    p.t += dt;
    if (Math.hypot(p.x - player.x, p.y - player.y) < 30) {
      if (p.kind === 'health') player.health = Math.min(100, player.health + p.amount);
      else if (p.kind === 'ammo') player.ammo = Math.min(120, player.ammo + p.amount);
      else if (p.kind === 'cash') {
        player.cash += p.amount;
        player.earned += p.amount;
      }
      state.pickups.splice(i, 1);
    }
  }
}

/** How many rivals are still standing. */
export function enemiesLeft(state) {
  return state.enemies.length;
}
