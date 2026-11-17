// The police helicopter: the sky's answer to three stars. One bird circles Rae from three
// stars up, a second joins at five. It never lands and never shoots — its searchlight pins
// her in place, and while it watches, the heat barely cools. The rotor is pure theatre,
// but the watching is a real mechanic: see police.js.

import { HELI } from './config.js';

/** Two birds, both parked until the wanted level calls them up. */
export function createHelis() {
  return [
    { active: false, angle: 0, x: 0, y: 0, rotor: 0 },
    { active: false, angle: Math.PI, x: 0, y: 0, rotor: 0 },
  ];
}

/** How high a bird flies, for the renderer and the searchlight. */
export function heliHeight() {
  return HELI.height;
}

/** True while at least one bird is watching Rae — the HUD's LIVE panel shows it. */
export function anyHeliActive(state) {
  return state.police.helis.some((h) => h.active);
}

/** One step of the sky: match the birds to the wanted level, then circle Rae. The two
 * birds start opposite each other so the second never stacks on the first. */
export function updateHelis(state, dt) {
  const player = state.player;
  const helis = state.police.helis;
  const want = player.wanted >= HELI.secondAt ? 2 : (player.wanted >= HELI.minWanted ? 1 : 0);
  for (let i = 0; i < helis.length; i += 1) {
    const heli = helis[i];
    heli.active = i < want;
    if (!heli.active) continue;
    heli.angle += HELI.orbitSpeed * dt;
    heli.x = player.x + Math.cos(heli.angle) * HELI.orbitRadius;
    heli.y = player.y + Math.sin(heli.angle) * HELI.orbitRadius;
    heli.rotor += dt * 28;
  }
}
