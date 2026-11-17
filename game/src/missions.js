// Missions and side work: twelve jobs in five acts, from courier to kingpin, plus the taxi
// fares and package runs that pay the rent between them. Each mission is a short list of
// steps — go here, pick this up, lose those men, survive the heat — and each step puts one
// marker on the map and one line on the HUD. Every job is streamed live on SOLMAR LIVE,
// and the chat is watching: hype the stream up and someone snitches your spot to the cops.

import { RANKS, SHOPS } from './config.js';
import { randomRoadPoint } from './city.js';
import { makeCar } from './traffic.js';
import { spawnEnemies, spawnPickup } from './combat.js';
import { addHeat } from './police.js';
import { endMissionStream, startMissionStream } from './stream.js';

/** The story: twelve jobs, five acts, one rise through Solmar. */
export const MISSIONS = [
  {
    act: 1, name: 'First Delivery', giver: 'Mama Luz', payout: 300,
    brief: 'A package for the marina. No questions, no stops, no cops.',
    steps: [
      { type: 'goto', x: 300, y: 1300, label: 'Pick up the package — Old Port depot' },
      { type: 'dropoff', x: 2700, y: 2300, label: 'Deliver the package — Marina Bay' },
    ],
  },
  {
    act: 1, name: 'Cab Fare', giver: 'Mama Luz', payout: 450,
    brief: 'Three fares across town. A cab pays double — borrow one.',
    steps: [
      { type: 'fare', x: 900, y: 800, label: 'Fare 1: pick up at Downtown' },
      { type: 'fare', x: 2100, y: 1300, label: 'Fare 1: drop off at Barrio Sol' },
      { type: 'fare', x: 1500, y: 1800, label: 'Fare 2: pick up at the market' },
      { type: 'fare', x: 300, y: 300, label: 'Fare 2: drop off at The Hills' },
      { type: 'fare', x: 2700, y: 800, label: 'Fare 3: pick up at Barrio Sol' },
      { type: 'fare', x: 1500, y: 2300, label: 'Fare 3: drop off at Marina Bay' },
    ],
  },
  {
    act: 2, name: 'The Exchange', giver: 'Dario', payout: 1200,
    brief: 'The Port crew wants the money and the merchandise. Give them neither.',
    steps: [
      { type: 'goto', x: 600, y: 1500, label: 'Meet the crew — Old Port docks' },
      { type: 'kill', x: 600, y: 1500, count: 4, label: 'Deal with the crew — 4 left' },
      { type: 'goto', x: 1500, y: 2300, label: 'Walk away clean — Marina Bay' },
    ],
  },
  {
    act: 2, name: 'Lose the Heat', giver: 'Dario', payout: 800,
    brief: 'Three stars and the whole city watching. Stay free for 54 seconds.',
    steps: [
      { type: 'survive', seconds: 54, wanted: 3, label: 'Lose the heat — survive 54 seconds' },
      { type: 'goto', x: 900, y: 300, label: 'Reach the safehouse — The Hills' },
    ],
  },
  {
    act: 3, name: 'Convoy Hit', giver: 'The Broker', payout: 2000,
    brief: 'Three vans, one shipment, no witnesses. Wreck them all.',
    steps: [
      { type: 'ram', count: 3, label: 'Wreck the convoy vans — 3 left' },
      { type: 'goto', x: 2100, y: 1800, label: 'Lay low — Barrio Sol' },
    ],
  },
  {
    act: 3, name: 'The Gold Run', giver: 'The Broker', payout: 5000,
    brief: 'Gold from the Hills to the marina. Five stars the whole way. Do not stop.',
    steps: [
      { type: 'goto', x: 1500, y: 300, label: 'Collect the gold — The Hills' },
      { type: 'dropoff', x: 3300, y: 2300, label: 'Deliver the gold — Marina Bay', timer: 120, wanted: 5 },
    ],
  },
  {
    act: 4, name: 'Harbor Heist', giver: 'Dario', payout: 2500,
    brief: 'A shipment at the docks, guarded by the Port crew. Take it all.',
    steps: [
      { type: 'goto', x: 300, y: 900, label: 'Reach the docks — Old Port' },
      { type: 'kill', x: 300, y: 900, count: 5, label: 'Clear the guards — 5 left' },
      { type: 'dropoff', x: 2700, y: 1300, label: 'Stash the shipment — Barrio Sol' },
    ],
  },
  {
    act: 4, name: 'Air Support', giver: 'The Broker', payout: 1500,
    brief: 'Four stars and a helicopter overhead. Stay free for 60 seconds.',
    steps: [
      { type: 'survive', seconds: 60, wanted: 4, label: 'Outlast the helicopter — survive 60 seconds' },
      { type: 'goto', x: 900, y: 300, label: 'Reach the safehouse — The Hills' },
    ],
  },
  {
    act: 4, name: 'Radio Run', giver: 'Mama Luz', payout: 1800,
    brief: 'The DJ of Barrio Beats needs a ride to the tower, live on air. Keep his cab alive.',
    steps: [
      { type: 'escort', x: 2700, y: 1800, label: 'Escort the DJ cab to the radio tower — keep it alive' },
      { type: 'goto', x: 1500, y: 1300, label: 'Collect the appearance fee — Downtown' },
    ],
  },
  {
    act: 5, name: 'Buy the Block', giver: 'The Broker', payout: 3000,
    brief: 'Three shops, three payoffs. Solmar is for sale, one storefront at a time.',
    steps: [
      { type: 'shop', x: 1500, y: 800, shop: 'guns', label: 'Pay off GOLD & GUN — Downtown' },
      { type: 'shop', x: 900, y: 1300, shop: 'clinic', label: "Pay off DOC'S CLINIC — Old Port" },
      { type: 'shop', x: 2100, y: 1300, shop: 'armor', label: 'Pay off ARMOR UP — Barrio Sol' },
    ],
  },
  {
    act: 5, name: 'Gold Standard', giver: 'The Broker', payout: 3500,
    brief: 'Four armored vans, one gold shipment, no witnesses. Wreck them all.',
    steps: [
      { type: 'ram', count: 4, label: 'Wreck the armored vans — 4 left' },
      { type: 'goto', x: 300, y: 1800, label: 'Lay low — Old Port' },
    ],
  },
  {
    act: 5, name: "Kingpin's Gambit", giver: 'The Broker', payout: 8000,
    brief: 'The last gold run, live to the whole city. Five stars, a helicopter, and a chat full of snitches. Do not stop.',
    steps: [
      { type: 'goto', x: 1500, y: 300, label: 'Collect the gold — The Hills' },
      { type: 'dropoff', x: 3300, y: 2300, label: 'Deliver the gold — Marina Bay', timer: 150, wanted: 5 },
    ],
  },
];

/** A fresh mission book: nothing started, the first job waiting at the depot. */
export function createMissions() {
  return {
    index: 0,
    phase: 'idle',
    step: 0,
    timer: 0,
    banner: '',
    bannerT: 0,
    carrying: false,
    escort: null,
    taxi: { active: false, phase: 'pickup', x: 0, y: 0, fare: 0, timer: 0 },
    delivery: { active: false, phase: 'pickup', x: 0, y: 0, pay: 0, timer: 0 },
    storyDone: false,
  };
}

/** The marker the HUD and the minimap point at right now, or null. */
export function currentMarker(state) {
  const m = state.missions;
  if (m.phase !== 'active') return null;
  const def = MISSIONS[m.index];
  if (!def) return null;
  const step = def.steps[m.step];
  if (!step) return null;
  if (step.type === 'survive') return null;
  if (step.type === 'escort') return { x: step.x, y: step.y, label: step.label };
  return { x: step.x, y: step.y, label: step.label };
}

/** The objective line the HUD shows right now. */
export function currentObjective(state) {
  const m = state.missions;
  if (m.phase === 'idle') {
    if (m.delivery.active) return m.delivery.phase === 'pickup' ? 'Package run — collect the box' : 'Package run — deliver to Marina Bay';
    if (m.taxi.active) return m.taxi.phase === 'pickup' ? 'Taxi job — pick up the fare' : 'Taxi job — drop off the fare';
    if (m.index >= MISSIONS.length) return 'Story complete — Solmar is yours.';
    return `Next job: ${MISSIONS[m.index].name} — go to the marker`;
  }
  const def = MISSIONS[m.index];
  if (!def) return 'Story complete — Solmar is yours.';
  const step = def.steps[m.step];
  if (!step) return def.brief;
  if (step.type === 'kill') return `Deal with the crew — ${state.enemies.length} left`;
  if (step.type === 'ram') return `Wreck the convoy vans — ${convoyLeft(state)} left`;
  if (step.type === 'survive') return `Lose the heat — survive ${Math.ceil(m.timer)} seconds`;
  if (step.type === 'escort') return 'Escort the DJ cab — keep it alive';
  return step.label;
}

/** How many convoy vans are still rolling. */
export function convoyLeft(state) {
  let n = 0;
  for (let i = 0; i < state.cars.length; i += 1) {
    if (state.cars[i].convoy && !state.cars[i].wrecked) n += 1;
  }
  return n;
}

/** Start the next mission: set its first step up, and stage whatever it needs. */
export function startMission(state, index) {
  const m = state.missions;
  const def = MISSIONS[index];
  if (!def) return;
  m.index = index;
  m.phase = 'active';
  m.step = 0;
  m.timer = 0;
  m.carrying = false;
  m.escort = null;
  m.banner = `Job: ${def.name} — ${def.giver}`;
  m.bannerT = 3.5;
  startMissionStream(state, def.name);
  enterStep(state);
}

/** Stage the current step: spawn its enemies, vans, heat or escort cab. */
function enterStep(state) {
  const m = state.missions;
  const def = MISSIONS[m.index];
  const step = def.steps[m.step];
  if (!step) return;
  if (step.type === 'kill') {
    spawnEnemies(state, step.x, step.y, step.count);
  } else if (step.type === 'survive') {
    m.timer = step.seconds;
    addHeat(state, step.wanted >= 4 ? 180 : 115);
  } else if (step.type === 'ram') {
    for (let i = 0; i < step.count; i += 1) {
      const spot = randomRoadPoint(state.random);
      const van = makeCar('van', spot.x, spot.y, spot.angle, 'traffic', state.random);
      van.convoy = true;
      van.health = 500;
      van.cruise = 190;
      state.cars.push(van);
    }
  } else if (step.type === 'dropoff' && step.wanted) {
    addHeat(state, 265);
    m.timer = step.timer;
  } else if (step.type === 'escort') {
    const cab = makeCar('taxi', state.player.x + 60, state.player.y + 40, state.player.angle, 'escort', state.random);
    cab.health = 500;
    cab.cruise = 200;
    state.cars.push(cab);
    m.escort = cab;
    m.banner = 'Escort the DJ cab — if it burns, the job fails.';
    m.bannerT = 4;
  }
}

/** Advance one step, or finish the mission when the list runs out. */
function advanceStep(state) {
  const m = state.missions;
  const def = MISSIONS[m.index];
  m.step += 1;
  if (m.step >= def.steps.length) {
    finishMission(state);
    return;
  }
  enterStep(state);
}

/** Fail the mission: the job is lost, the stream watches it happen. */
function failMission(state, reason) {
  const m = state.missions;
  m.banner = reason;
  m.bannerT = 4;
  m.phase = 'idle';
  m.carrying = false;
  m.escort = null;
  endMissionStream(state, false);
}

/** Pay out, celebrate, and open the next job. */
function finishMission(state) {
  const m = state.missions;
  const def = MISSIONS[m.index];
  const player = state.player;
  let pay = def.payout;
  if (player.car !== null && player.car.kind === 'taxi') pay = Math.round(pay * 1.25);
  player.cash += pay;
  player.earned += pay;
  state.stats.missionsDone += 1;
  m.banner = `Job done: ${def.name} +$${pay}`;
  m.bannerT = 4;
  m.phase = 'idle';
  m.index += 1;
  m.carrying = false;
  m.escort = null;
  endMissionStream(state, true);
  spawnPickup(state, player.x + 30, player.y, 'health', 40);
  if (m.index >= MISSIONS.length) {
    m.storyDone = true;
    m.banner = 'KINGPIN — Solmar is yours. Story complete.';
    m.bannerT = 6;
  }
}

/** Rae's rank, from everything she has ever earned. */
export function rankOf(state) {
  let rank = RANKS[0].name;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (state.player.earned >= RANKS[i].at) rank = RANKS[i].name;
  }
  return rank;
}

/** Drive the escort cab toward its destination, on the roads, at its cruise speed. */
function driveEscort(state, dt) {
  const m = state.missions;
  const car = m.escort;
  if (car === null || car.wrecked) return;
  const def = MISSIONS[m.index];
  const step = def.steps[m.step];
  if (!step || step.type !== 'escort') return;
  const dx = step.x - car.x;
  const dy = step.y - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 70) {
    advanceStep(state);
    return;
  }
  const want = Math.atan2(dy, dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  car.speed += Math.max(-260 * dt, Math.min(200 * dt, car.cruise - car.speed));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

/** One step of the mission book and the side jobs. */
export function updateMissions(state, dt) {
  const m = state.missions;
  const player = state.player;
  if (m.bannerT > 0) m.bannerT -= dt;

  if (m.phase === 'active') {
    const def = MISSIONS[m.index];
    const step = def.steps[m.step];
    if (step) {
      if (step.type === 'goto' || step.type === 'dropoff' || step.type === 'fare' || step.type === 'shop') {
        if (Math.hypot(player.x - step.x, player.y - step.y) < 70) {
          if (step.type === 'goto' && m.step === 0 && def.steps[1] && def.steps[1].type === 'dropoff') m.carrying = true;
          if (step.type === 'shop') {
            const shop = SHOPS.find((s) => s.id === step.shop);
            m.banner = shop ? `Paid off ${shop.name} — the block is yours.` : 'Shop paid off.';
            m.bannerT = 3;
          }
          advanceStep(state);
        }
        if (step.type === 'dropoff' && step.timer) {
          m.timer -= dt;
          if (m.timer <= 0) {
            failMission(state, 'Too slow — the gold went cold. Job failed.');
          }
        }
      } else if (step.type === 'kill') {
        if (state.enemies.length === 0) advanceStep(state);
      } else if (step.type === 'survive') {
        m.timer -= dt;
        if (player.wanted < step.wanted) addHeat(state, 30 * dt);
        if (m.timer <= 0) advanceStep(state);
      } else if (step.type === 'ram') {
        if (convoyLeft(state) === 0) advanceStep(state);
      } else if (step.type === 'escort') {
        if (m.escort !== null && m.escort.wrecked) {
          failMission(state, 'The DJ cab burned — the job failed.');
        } else {
          driveEscort(state, dt);
        }
      }
    }
  } else if (m.phase === 'idle' && !m.storyDone) {
    // The next job starts at its first marker: walk or drive into it.
    const def = MISSIONS[m.index];
    if (def) {
      const first = def.steps[0];
      if (first && first.x !== undefined && Math.hypot(player.x - first.x, player.y - first.y) < 80) {
        startMission(state, m.index);
      }
    }
  }

  updateTaxiJob(state, dt);
  updateDeliveryJob(state, dt);
}

/** A taxi fare: flag a cab down by driving one, or take the stand in Downtown. */
function updateTaxiJob(state, dt) {
  const m = state.missions;
  const player = state.player;
  const job = m.taxi;
  if (!job.active) {
    // Side work waits while a story mission is running — one job at a time.
    if (m.phase === 'active') return;
    const inTaxi = player.car !== null && player.car.kind === 'taxi';
    const atStand = Math.hypot(player.x - 1500, player.y - 800) < 80;
    if (inTaxi || atStand) {
      const spot = randomRoadPoint(state.random);
      job.active = true;
      job.phase = 'pickup';
      job.x = spot.x;
      job.y = spot.y;
      job.fare = 60 + Math.floor(state.random() * 90);
      job.timer = 75;
      m.banner = 'Taxi job — pick up the fare';
      m.bannerT = 3;
    }
    return;
  }
  job.timer -= dt;
  if (job.timer <= 0) {
    job.active = false;
    m.banner = 'Fare cancelled — too slow.';
    m.bannerT = 3;
    return;
  }
  if (Math.hypot(player.x - job.x, player.y - job.y) < 70) {
    if (job.phase === 'pickup') {
      const spot = randomRoadPoint(state.random);
      job.phase = 'dropoff';
      job.x = spot.x;
      job.y = spot.y;
      job.timer = 75;
    } else {
      const pay = player.car !== null && player.car.kind === 'taxi' ? job.fare * 2 : job.fare;
      player.cash += pay;
      player.earned += pay;
      state.stats.taxisDone += 1;
      job.active = false;
      m.banner = `Fare paid +$${pay}`;
      m.bannerT = 3;
    }
  }
}

/** A package run: the depot at Old Port always has one more box. */
function updateDeliveryJob(state, dt) {
  const m = state.missions;
  const player = state.player;
  const job = m.delivery;
  if (!job.active) {
    // Side work waits while a story mission is running — one job at a time.
    if (m.phase === 'active') return;
    if (Math.hypot(player.x - 300, player.y - 1300) < 80) {
      const spot = randomRoadPoint(state.random);
      job.active = true;
      job.phase = 'pickup';
      job.x = spot.x;
      job.y = spot.y;
      job.pay = 120;
      job.timer = 90;
      m.banner = 'Package run — collect the box';
      m.bannerT = 3;
    }
    return;
  }
  job.timer -= dt;
  if (job.timer <= 0) {
    job.active = false;
    m.banner = 'Package run expired.';
    m.bannerT = 3;
    return;
  }
  if (Math.hypot(player.x - job.x, player.y - job.y) < 70) {
    if (job.phase === 'pickup') {
      const spot = randomRoadPoint(state.random);
      job.phase = 'dropoff';
      job.x = spot.x;
      job.y = spot.y;
      job.timer = 90;
    } else {
      player.cash += job.pay;
      player.earned += job.pay;
      state.stats.deliveriesDone += 1;
      job.active = false;
      m.banner = `Package delivered +$${job.pay}`;
      m.bannerT = 3;
    }
  }
}
