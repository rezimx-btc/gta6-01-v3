// A small seeded random number generator (mulberry32): the same seed gives the same city,
// the same traffic and the same screenshots, which is what makes the shot scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number in [min, max). */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min));
}

/** One item of an array, picked uniformly. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}

/** A number in [min, max). */
export function randomRange(random, min, max) {
  return min + random() * (max - min);
}

/** A small angle nudge, for wandering pedestrians and wobbling drivers. */
export function randomTurn(random, spread) {
  return (random() - 0.5) * spread;
}
