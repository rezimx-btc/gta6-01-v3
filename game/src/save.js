// Saves: one key per save slot, one record per slot. Each save stores what Rae has (cash,
// earned, health, ammo, armour), where she is, which mission she is on, and how far the
// story has gone. Autosave writes on every mission completion; the player can also save
// manually with F5. Loading restores the record, and the world re-seeds itself from it.

import { SAVE_KEY } from './config.js';
import { createPlayer } from './player.js';

/** A fresh save record: everything the player owns, and where the story stands. */
export function makeSaveData(state) {
  const player = state.player;
  return {
    version: 1,
    savedAt: Date.now(),
    cash: player.cash,
    earned: player.earned,
    health: player.health,
    armor: player.armor,
    ammo: player.ammo,
    missionIndex: state.missions.index,
    missionsDone: state.stats.missionsDone,
    x: player.x,
    y: player.y,
  };
}

/** Write a save record to localStorage. Returns true when it stuck. */
export function writeSave(state) {
  try {
    const data = makeSaveData(state);
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Read a save record back, or null when there is nothing saved or it is broken. */
export function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw === null) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    if (data.version !== 1) return null;
    if (typeof data.cash !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

/** Apply a save record to a fresh player and mission book. The world is rebuilt from the
 * seed, so the buildings and roads are the same; only Rae and her progress move. */
export function applySave(state, data) {
  const player = state.player;
  player.cash = data.cash;
  player.earned = data.earned;
  player.health = data.health;
  player.armor = data.armor;
  player.ammo = data.ammo;
  player.x = data.x;
  player.y = data.y;
  player.onFoot = true;
  player.car = null;
  player.wanted = 0;
  player.heat = 0;
  player.dead = false;
  player.busted = false;
  state.missions.index = data.missionIndex;
  state.missions.phase = 'idle';
  state.missions.step = 0;
  state.stats.missionsDone = data.missionsDone;
}
