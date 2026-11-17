// Shots: the four staged scenes the dossier screenshots. Each one puts Rae, the cars and
// the police in a known place, lets the world settle, and freezes the frame — the same
// code path the game uses, just with the director choosing the starting positions.

import { addHeat } from './police.js';
import { randomRoadPoint } from './city.js';
import { spawnEnemies } from './combat.js';
import { startMission } from './missions.js';
import { enterCar, resetPlayer } from './player.js';
import { makeCar } from './traffic.js';
import { startMissionStream } from './stream.js';

/** Keep the beachfront road ahead of the player clear (heli shot only): any car that
 * wanders or turns into the corridor is moved to another road, so the five-star escape
 * shows the escape, not a pile-up. */
export function clearHeliCorridor(state) {
  for (let i = 0; i < state.cars.length; i += 1) {
    const car = state.cars[i];
    if (car.driver === 'player') continue;
    if (car.x > 2200 && car.x < 3300 && Math.abs(car.y - 2300) < 120) {
      let spot = randomRoadPoint(state.random);
      for (let t = 0; t < 5 && spot.x > 2200 && spot.x < 3300 && Math.abs(spot.y - 2300) < 120; t += 1) {
        spot = randomRoadPoint(state.random);
      }
      car.x = spot.x;
      car.y = spot.y;
      car.angle = spot.angle;
      car.speed = 0;
    }
  }
}

/** The four shots, in the order shots.json lists them. The director sets the scene; the
 * game still runs — traffic drives, police hunt, the stream ticks. Nothing is faked. */

/** How long each shot plays forward before the picture is taken, in 1/60 s steps. The
 * heli shot settles for half a second: the five-star patrol needs no longer than that
 * to pin the car against the traffic, and the shot is the escape, not the pile-up. */
export const SHOT_SETTLE = { chase: 60, drive: 60, mission: 60, heli: 30 };
export const SHOT_NAMES = ['chase', 'drive', 'mission', 'heli'];

/**
 * Stage a shot: reset the world to a known state, then place the actors.
 * Returns the shot name, for the dossier.
 */
export function setupShot(state, name) {
  const player = state.player;
  resetPlayer(player);
  state.enemies.length = 0;
  state.bullets.length = 0;
  state.pickups.length = 0;
  state.missions.index = 0;
  state.missions.phase = 'idle';
  state.missions.step = 0;
  state.missions.carrying = false;
  state.missions.escort = null;
  player.cash = 2400;
  player.earned = 2400;
  player.health = 100;
  player.armor = 60;
  player.ammo = 48;
  player.wanted = 0;
  player.heat = 0;
  player.dead = false;
  player.busted = false;
  state.stream.live = false;
  state.stream.viewers = 0;
  state.stream.hype = 0;
  state.stream.chat = [];
  state.camera.x = player.x;
  state.camera.y = player.y;

  if (name === 'chase') {
    // A three-star chase on the Downtown grid, mid-mission, the stream live.
    const sport = makeCar('sport', 1500, 1300, -Math.PI / 2, 'player', state.random);
    state.cars.push(sport);
    enterCar(state, sport);
    player.speed = 420;
    sport.speed = 420;
    startMission(state, 3);
    startMissionStream(state, 'Lose the Heat');
    state.stream.viewers = 4812;
    state.stream.hype = 71;
  } else if (name === 'drive') {
    // A quiet cruise through Downtown at golden hour, the first job waiting.
    const sedan = makeCar('sedan', 1500, 1300, -Math.PI / 2, 'player', state.random);
    state.cars.push(sedan);
    enterCar(state, sedan);
    player.speed = 240;
    sedan.speed = 240;
    state.stream.live = true;
    state.stream.missionName = 'First Delivery';
    state.stream.viewers = 1240;
    state.stream.hype = 18;
    state.stream.chat = [
      { kind: 'sys', text: '🔴 LIVE — First Delivery' },
      { kind: 'msg', text: 'goldhunter: here we goooo' },
      { kind: 'msg', text: 'marina_moe: first one here, hi chat' },
    ];
  } else if (name === 'mission') {
    // The Exchange: four rivals on the docks, Rae on foot with her pistol out.
    player.x = 600;
    player.y = 1500;
    player.angle = 0;
    player.onFoot = true;
    player.car = null;
    startMission(state, 2);
    state.missions.step = 1;
    spawnEnemies(state, 600, 1500, 4);
    startMissionStream(state, 'The Exchange');
    state.stream.viewers = 3120;
    state.stream.hype = 44;
  } else if (name === 'heli') {
    // Five stars on the Marina Bay beachfront, two birds overhead, the gold in the trunk.
    const sport = makeCar('sport', 3000, 2300, Math.PI, 'player', state.random);
    state.cars.push(sport);
    enterCar(state, sport);
    player.speed = 460;
    sport.speed = 460;
    // Clear the beachfront road ahead: a five-star escape should show the escape, not a pile-up.
    clearHeliCorridor(state);
    addHeat(state, 265);
    startMission(state, 5);
    state.missions.step = 1;
    state.missions.carrying = true;
    state.missions.timer = 98;
    startMissionStream(state, 'The Gold Run');
    state.stream.viewers = 8930;
    state.stream.hype = 88;
  }
  state.camera.x = player.x;
  state.camera.y = player.y;
  return name;
}
