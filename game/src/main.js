// Main: the game itself. Boots the world, wires the keys, runs the loop, and owns the
// win/lose state. Everything the other modules know is assembled here — the city, the
// player, the traffic, the police, the missions, the stream, the radio, the saves —
// and every frame ticks through them in the same order.

import { createAudio, playCash, playCrash, playShot, playSuccess, setEngine, setSiren, startAudio, toggleMute } from './audio.js';
import { buildCity } from './city.js';
import { shootPlayer, spawnPickup, updateCombat } from './combat.js';
import { DEFAULT_SEED, PLAYER } from './config.js';
import { ACTION_ENTER, ACTION_MUTE, ACTION_RADIO_1, ACTION_RADIO_2, ACTION_RADIO_3, ACTION_RESTART, ACTION_SHOOT, createInput } from './input.js';
import { startMission, updateMissions } from './missions.js';
import { createPlayer, damageCar, damagePlayer, drivePlayerCar, enterCar, exitCar, nearestStealableCar, playerKmh, resetPlayer, walkPlayer } from './player.js';
import { addHeat, clearPolice, createPolice, updatePolice } from './police.js';
import { createRadio, setStation, updateRadio } from './radio.js';
import { animate, createRenderer, drawFrame, resizeRenderer, screenToWorld, updateHud, updateMinimap } from './render.js';
import { applySave, readSave, writeSave } from './save.js';
import { buyShop, nearestShop } from './shops.js';
import { updateStream } from './stream.js';
import { createTraffic, updateTraffic } from './traffic.js';

/** Build the whole game state from a seed: city, player, traffic, police, missions. */
export function createState(seed) {
  const city = buildCity(mulberry32(seed));
  const traffic = createTraffic(city, mulberry32(seed + 1));
  const player = createPlayer();
  const missions = {
    index: 0,
    phase: 'idle',
    step: 0,
    timer: 0,
    banner: '',
    bannerT: 0,
    carrying: false,
    escort: null,
    taxi: { active: false, phase: 'pickup', x: 0, y: 0, fare: 0, timer: 0 },
    delivery: { active: false, phase: 'pickup', x: 0, y: 0, fare: 0, timer: 0 },
    storyDone: false,
  };
  return {
    seed,
    random: mulberry32(seed + 2),
    time: 120,
    city,
    player,
    cars: traffic.cars,
    peds: traffic.peds,
    police: createPolice(),
    missions,
    stream: {
      live: false,
      missionName: '',
      viewers: 0,
      hype: 0,
      snitched: false,
      forceSnitch: false,
      chat: [],
      chatT: 0,
      donT: 0,
    },
    radio: createRadio(),
    audio: createAudio(),
    input: null,
    bullets: [],
    enemies: [],
    pickups: [],
    camera: { x: player.x, y: player.y },
    stats: { shotsFired: 0, kills: 0, missionsDone: 0, taxisDone: 0, deliveriesDone: 0, crashes: 0, cashEarned: 0 },
    toast: '',
    toastT: 0,
    lastCash: 0,
    shootT: 0,
    savedMissions: 0,
    view: null,
  };
}

/** A small deterministic PRNG, so the same seed always builds the same Solmar. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One frame of the game, in order: time, player, traffic, police, combat, missions, stream, radio, sound. */
export function update(state, dt) {
  const player = state.player;
  const input = state.input;
  state.time += dt;
  if (state.toastT > 0) state.toastT -= dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (state.shootT > 0) state.shootT -= dt;

  // One-shot presses, taken once per frame: enter, shoot, radio, mute, restart.
  // Any press also wakes the audio: browsers refuse sound before a gesture.
  const actions = input.takeActions();
  if (actions !== 0) startAudio(state.audio);
  if (actions & ACTION_ENTER) handleAction(state, 'enter');
  if (actions & ACTION_SHOOT) handleAction(state, 'shoot', mouseAim(state));
  if (actions & ACTION_MUTE) handleAction(state, 'mute');
  if (actions & ACTION_RADIO_1) setStation(state, 'sol');
  if (actions & ACTION_RADIO_2) setStation(state, 'barrio');
  if (actions & ACTION_RADIO_3) setStation(state, 'gold');
  if (actions & ACTION_RESTART) handleAction(state, 'restart');
  // Hold the mouse button to keep shooting toward the pointer.
  if (input.shooting() && state.shootT <= 0 && !player.dead && !player.busted) {
    handleAction(state, 'shoot', mouseAim(state));
    state.shootT = 0.28;
  }

  // Cash landing plays a chime: track it by watching the total.
  if (player.cash > state.lastCash) playCash(state.audio);
  state.lastCash = player.cash;
  // A finished mission autosaves: the next visit picks up where she left off.
  if (state.stats.missionsDone > state.savedMissions) {
    state.savedMissions = state.stats.missionsDone;
    writeSave(state);
  }

  if (!player.dead && !player.busted) {
    if (player.onFoot) {
      walkPlayer(state, dt, input);
    } else if (player.car !== null) {
      const before = player.car.health;
      drivePlayerCar(state, dt, input);
      if (player.car !== null && player.car.health < before) {
        playCrash(state.audio);
        state.stats.crashes += 1;
      }
    }
  }

  updateTraffic(state, dt);
  updatePolice(state, dt);
  updateCombat(state, dt);
  // Missions live in their own module, ticked here in the same order as everything else.
  updateMissions(state, dt);
  updateStream(state, dt);
  updateRadio(state, dt);
  setEngine(state.audio, player.speed);
  let nearestPolice = Infinity;
  for (let i = 0; i < state.cars.length; i += 1) {
    const car = state.cars[i];
    if (car.driver === 'police' && !car.wrecked) {
      nearestPolice = Math.min(nearestPolice, Math.hypot(car.x - player.x, car.y - player.y));
    }
  }
  setSiren(state.audio, player.wanted, nearestPolice);

  // Pickups the player walks over: the combat module already collects them.
  if (player.dead || player.busted) {
    // The world keeps moving while she is down; R restarts the run.
  }
}

/** Where the mouse points on the ground plane, for aiming on foot — or null. */
function mouseAim(state) {
  if (state.view === null || state.input === null) return null;
  const p = state.input.pointer();
  return screenToWorld(state.view, p.x, p.y);
}

/** The one-shot actions: E, F, Space, R, and the number keys. */
export function handleAction(state, action, aim) {
  const player = state.player;
  if (action === 'restart') {
    restartRun(state);
    return;
  }
  if (player.dead || player.busted) return;
  if (action === 'enter') {
    const shop = nearestShop(state);
    if (shop !== null) {
      state.missions.banner = buyShop(state, shop);
      state.missions.bannerT = 3;
      return;
    }
    if (player.onFoot) {
      const car = nearestStealableCar(state);
      if (car !== null) {
        enterCar(state, car);
        if (car.driver !== 'parked') addHeat(state, 15);
        state.missions.banner = 'Car stolen — the owner will not miss it. Probably.';
        state.missions.bannerT = 2.5;
      }
    } else {
      exitCar(state);
    }
  } else if (action === 'shoot') {
    if (player.onFoot) {
      const angle = aim !== null && aim !== undefined ? Math.atan2(aim.y - player.y, aim.x - player.x) : player.angle;
      if (shootPlayer(state, angle)) playShot(state.audio);
    } else if (player.car !== null) {
      // Drive-by: the shot goes where the car points.
      if (shootPlayer(state, player.angle)) playShot(state.audio);
    }
  } else if (action === 'save') {
    if (writeSave(state)) {
      state.toast = 'Game saved';
      state.toastT = 2;
    }
  } else if (action === 'mute') {
    const muted = toggleMute(state.audio);
    state.toast = muted ? 'Muted' : 'Sound on';
    state.toastT = 2;
  }
}

/** Restart the run: a fresh Rae, a fresh mission book, the same city. */
function restartRun(state) {
  const fresh = createPlayer();
  Object.assign(state.player, fresh);
  state.missions.index = 0;
  state.missions.phase = 'idle';
  state.missions.step = 0;
  state.missions.carrying = false;
  state.missions.escort = null;
  state.missions.storyDone = false;
  state.enemies.length = 0;
  state.bullets.length = 0;
  state.pickups.length = 0;
  state.stream.live = false;
  state.stream.viewers = 0;
  state.stream.hype = 0;
  state.stream.chat = [];
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
  clearPolice(state);
  state.toast = 'New run — Solmar is yours';
  state.toastT = 3;
}

/** Boot the game into the page: build the state, the renderer, the keys, the loop. */
export function bootGame() {
  const gameEl = document.getElementById('game');
  if (!gameEl) throw new Error('no #game element');
  const state = createState(DEFAULT_SEED);
  const saved = readSave();
  if (saved !== null) applySave(state, saved);
  const view = createRenderer(gameEl, state);
  state.view = view;
  state.input = createInput(gameEl);
  window.addEventListener('resize', () => resizeRenderer(view));
  window.addEventListener('keydown', (event) => {
    // F5 saves instead of reloading: the save is local, the reload would lose the run.
    if (event.key === 'F5') {
      event.preventDefault();
      if (writeSave(state)) {
        state.toast = 'Game saved';
        state.toastT = 2;
      }
    }
  });
  // Screenshot mode (?shot=chase&seed=7): stage the scene, play it forward a second and a
  // half so the police and the traffic settle, paint twice, then tell the driver it is ready.
  const params = new URLSearchParams(window.location.search);
  const shotName = params.get('shot');
  if (shotName) {
    state.time = 120;
    import('./shots.js').then(({ setupShot, SHOT_SETTLE, clearHeliCorridor }) => {
      setupShot(state, shotName);
      // Hold the throttle while the scene settles, so the car is still moving — a parked
      // chase is no chase. On foot the throttle stays off, so Rae stays at the marker.
      // The real input comes back right after.
      const realThrottle = state.input.throttle.bind(state.input);
      state.input.throttle = () => (state.player.car !== null ? 1 : 0);
      const steps = SHOT_SETTLE[shotName] ?? 60;
      for (let i = 0; i < steps; i += 1) {
        update(state, 1 / 60);
        // The heli shot keeps its road clear for the whole settle: traffic turns in.
        if (shotName === 'heli') clearHeliCorridor(state);
      }
      state.input.throttle = realThrottle;
      drawFrame(view, state);
      updateHud(state);
      updateMinimap(state);
      drawFrame(view, state);
      window.__shotReady = true;
    });
    return { state, view };
  }
  animate(view, state, update);
  return { state, view };
}

// Boot on load, and expose the pieces the dossier and the tests need.
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    try {
      const game = bootGame();
      window.__game = game;
      window.__state = game.state;
    } catch (err) {
      const el = document.getElementById('game');
      if (el) el.textContent = `Failed to start: ${err.message}`;
      throw err;
    }
  });
}
