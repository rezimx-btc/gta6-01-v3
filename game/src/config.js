// SOLMAR LIVE — Streets of Gold, in 3D. Every tuning number, colour and place name in
// one place. The simulation still runs in the flat 2D world the first game used (the same
// 3600 by 2600 city, the same road grid, the same mission coordinates), and the renderer
// lifts that world into Three.js: one world unit is one metre of the 3D scene, so every
// speed, distance and threshold below behaves exactly as it did on foot and by car.

/** The logical view the HUD is laid out against. */
export const VIEW = { width: 1280, height: 720 };

/** The whole city, in world units. Roads run inside it; the sea borders the south. */
export const WORLD = { width: 3600, height: 2600 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Roads: wide avenues with lane paint. Vertical avenues at these x, horizontal at these y. */
export const ROADS = {
  width: 110,
  vertical: [300, 900, 1500, 2100, 2700, 3300],
  horizontal: [300, 800, 1300, 1800, 2300],
  laneDash: 26,
};

/** The five districts of Solmar, each with its own palette and flavour. */
export const DISTRICTS = [
  { name: 'The Hills', x: 0, y: 0, width: 3600, height: 300, tint: '#8fae7a', blurb: 'Mansions above the smog.' },
  { name: 'Downtown', x: 1200, y: 300, width: 1200, height: 1000, tint: '#c9b458', blurb: 'Glass towers and gold.' },
  { name: 'Old Port', x: 0, y: 300, width: 1200, height: 2000, tint: '#7a8fae', blurb: 'Cranes, crates and old debts.' },
  { name: 'Barrio Sol', x: 2400, y: 300, width: 1200, height: 2000, tint: '#d08a4e', blurb: 'Neon, music and markets.' },
  { name: 'Marina Bay', x: 0, y: 2300, width: 3600, height: 300, tint: '#4e9fb0', blurb: 'Sand, sea and fast boats.' },
];

/** Sun-soaked palette: hot light, warm tarmac, pastel blocks, blue water. */
export const PALETTE = {
  backdrop: '#10141c',
  grass: '#7fae5a',
  sand: '#e8d29a',
  water: '#2e7f9e',
  waterDeep: '#22627e',
  road: '#3a3f4a',
  roadEdge: '#565c68',
  lane: '#e8d98a',
  sidewalk: '#b8a88f',
  buildingRoof: '#8a6f5c',
  buildingEdge: '#5c4a3e',
  park: '#5d9150',
  text: '#f5efe0',
  muted: '#b9b09a',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#4fc3f7',
  panel: '#1c2230',
  panelEdge: '#3a4356',
  minimap: '#141a26',
  minimapRoad: '#7d8390',
  minimapWater: '#2e7f9e',
  star: '#ffd94a',
  health: '#58d68d',
  healthLow: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Rae Vega on foot: walk speed, health, armour, and how long a hit leaves her untouchable. */
export const PLAYER = {
  radius: 13,
  walkSpeed: 175,
  runSpeed: 265,
  health: 100,
  armor: 0,
  invulnerable: 1.2,
  startAmmo: 24,
  maxAmmo: 120,
};

/** Car kinds: size, top speed, acceleration and how much punishment they take. */
export const CAR_KINDS = {
  sedan: { length: 52, width: 26, topSpeed: 310, accel: 330, brake: 520, health: 100, colors: ['#c94f4f', '#4f7ec9', '#c9c9c9', '#5a6b7d'] },
  taxi: { length: 52, width: 26, topSpeed: 330, accel: 350, brake: 540, health: 100, colors: ['#f2a71b'] },
  sport: { length: 54, width: 26, topSpeed: 440, accel: 470, brake: 600, health: 90, colors: ['#e5534b', '#f2c94c', '#2ecc71'] },
  truck: { length: 66, width: 30, topSpeed: 240, accel: 240, brake: 420, health: 220, colors: ['#8a6f5c', '#6b7d5a'] },
  police: { length: 54, width: 26, topSpeed: 390, accel: 430, brake: 620, health: 160, colors: ['#20242e'] },
  van: { length: 60, width: 28, topSpeed: 270, accel: 280, brake: 460, health: 180, colors: ['#7a8fae', '#c9b458'] },
};

/** Traffic: how many cars and pedestrians the city keeps near the camera. */
export const TRAFFIC = {
  cars: 26,
  parked: 14,
  peds: 34,
  carSpeed: 150,
  carSpeedJitter: 45,
  pedSpeed: 42,
  pedSpeedJitter: 18,
  despawn: 1500,
  spawn: 1150,
};

/** Wanted levels 0-5: heat thresholds, how many police hunt, and how fast heat cools. */
export const WANTED = {
  max: 5,
  thresholds: [0, 25, 60, 110, 175, 260],
  policeCars: [0, 1, 2, 3, 4, 6],
  policeFoot: [0, 0, 1, 2, 3, 4],
  heatDecay: 4.5,
  heatDecayHidden: 9,
  crimeSteal: 30,
  crimeHitPed: 45,
  crimeShoot: 35,
  crimeRam: 12,
  bustRadius: 26,
};

/** The police helicopter: one bird at three stars, a second at five. It circles Rae with a
 * searchlight, and while it watches, the heat barely cools — you cannot hide from the sky. */
export const HELI = {
  minWanted: 3,
  secondAt: 5,
  height: 130,
  orbitRadius: 170,
  orbitSpeed: 0.35,
  heatDecayWhileWatched: 1.2,
  lightColor: '#fff6c8',
};

/** Rank ladder: money earned total unlocks the next name. */
export const RANKS = [
  { name: 'Courier', at: 0 },
  { name: 'Runner', at: 750 },
  { name: 'Fixer', at: 2000 },
  { name: 'Lieutenant', at: 4000 },
  { name: 'Boss', at: 7000 },
  { name: 'Kingpin', at: 12000 },
];

/** World speed in units/s shown as km/h on the HUD, in a car. */
export const KMH = 0.45;

/** World speed in units/s shown as km/h on the HUD, on foot: a walk reads about 5 km/h,
 * a run about 8 — the old single factor showed 79 km/h on foot, which looked broken. */
export const WALK_KMH = 0.03;

/** The chase camera: how far behind and above Rae it hangs, in a car and on foot. */
export const CAMERA = {
  carDistance: 95,
  carHeight: 52,
  footDistance: 58,
  footHeight: 36,
  lookAhead: 46,
  smooth: 5,
};

/** Shops: where they stand, what they sell, and what it costs. */
export const SHOPS = [
  { id: 'guns', name: 'GOLD & GUN', x: 1500, y: 800, sell: 'ammo', price: 150, amount: 48, blurb: 'Ammo +48 — $150' },
  { id: 'clinic', name: "DOC'S CLINIC", x: 900, y: 1300, sell: 'health', price: 100, amount: 100, blurb: 'Full health — $100' },
  { id: 'armor', name: 'ARMOR UP', x: 2100, y: 1300, sell: 'armor', price: 200, amount: 100, blurb: 'Full armor — $200' },
];

/** The radio: three stations, each with its own synth pattern. Keys 1, 2, 3 switch. */
export const RADIO = {
  stations: [
    { id: 'sol', name: 'SOL FM 101.1', style: 'Sunset synthwave — slow arpeggios over a warm pad.' },
    { id: 'barrio', name: 'BARRIO BEATS 88.4', style: 'Street percussion and a low bass bounce.' },
    { id: 'gold', name: 'GOLD TALK 1220', style: 'The city talking to itself — news stings and jingles.' },
  ],
};

/** SOLMAR LIVE: the stream that follows every heist. Viewers grow with the drama, hype
 * with the danger, and one of them always snitches when the chat gets too hot. */
export const STREAM = {
  baseViewers: 120,
  perWanted: 260,
  perMission: 480,
  hypePerSecond: 6,
  hypeDecay: 3,
  snitchAt: 70,
  donationChance: 0.02,
  donationMin: 5,
  donationMax: 25,
};

/** Where the save is kept between visits (this browser only). */
export const SAVE_KEY = 'solmar-live.save.v3';

/** The seed every fresh game and every screenshot uses: the same Solmar, every time. */
export const DEFAULT_SEED = 7;
