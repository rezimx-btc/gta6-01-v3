// SOLMAR LIVE: every heist is streamed to the whole city, and the chat is watching.
// Viewers grow with the drama, hype grows with the danger, and when the chat gets too hot
// someone always snitches: the stream leaks Rae's position and the heat jumps. Donations
// trickle in while the stream is live. This is a real mechanic, not a label — the snitch
// spawns police attention, and the helicopter makes it worse.

import { STREAM } from './config.js';
import { addHeat } from './police.js';

const CHAT_NAMES = [
  'goldhunter', 'vice_vic', 'marina_moe', 'dario_fan', 'solmar_sue', 'neon_nia',
  'kingpin_kid', 'barrio_ben', 'copwatcher', 'turbo_tess', 'dock_dan', 'luna_live',
];

const CHAT_CHEER = [
  'LETS GOOO 🔥', 'she never misses', 'that drift was clean', 'clip it!!',
  'Rae is HIM (her)', 'best driver in Solmar', 'the gold run is ON',
  'chat is going crazy rn', 'W in the chat', 'she makes it look easy',
];

const CHAT_CHASE = [
  'COPS EVERYWHERE', 'three stars and counting', 'heli is up!!',
  'she is NOT getting away with this one', 'that was so close',
  'the whole city is watching', 'RUN RAE RUN', 'they are right behind her',
];

const CHAT_MISSION = [
  'new job just dropped', 'Mama Luz sends her regards', 'the Broker is watching',
  'this payout is huge', 'she is going for Kingpin', 'act 5 energy',
];

/** A fresh stream: off air, no viewers, no hype, nobody snitched yet. */
export function createStream() {
  return {
    live: false,
    missionName: '',
    viewers: 0,
    hype: 0,
    snitched: false,
    forceSnitch: false,
    chat: [],
    chatT: 0,
    donT: 0,
  };
}

/** Go live for a mission: the city tunes in, the hype starts warm. */
export function startMissionStream(state, name) {
  const s = state.stream;
  s.live = true;
  s.missionName = name;
  s.viewers = STREAM.baseViewers + STREAM.perMission;
  s.hype = 25;
  s.snitched = false;
  s.forceSnitch = name === "Kingpin's Gambit";
  s.chat = [
    { kind: 'sys', text: `🔴 LIVE — ${name}` },
    { kind: 'msg', text: `${pickName(state)}: here we goooo` },
    { kind: 'msg', text: `${pickName(state)}: first one here, hi chat` },
  ];
  s.chatT = 0;
  s.donT = 0;
}

/** The stream ends: the job is done or failed, the chat keeps the last lines. */
export function endMissionStream(state, done) {
  const s = state.stream;
  s.live = false;
  s.chat.push({ kind: 'sys', text: done ? '✅ Stream ended — job done' : '❌ Stream ended — job failed' });
  if (s.chat.length > 6) s.chat.splice(0, s.chat.length - 6);
}

/** One random chatter's name, from the seeded pool. */
function pickName(state) {
  return CHAT_NAMES[Math.floor(state.random() * CHAT_NAMES.length)];
}

/** Push one chat line, keeping only the last six. */
function pushChat(state, line) {
  const s = state.stream;
  s.chat.push(line);
  if (s.chat.length > 6) s.chat.splice(0, s.chat.length - 6);
}

/** One step of the stream: viewers, hype, chat, donations, and the snitch. */
export function updateStream(state, dt) {
  const s = state.stream;
  const player = state.player;
  if (!s.live) return;

  // Viewers drift toward the drama: base, plus wanted stars, plus the mission itself.
  const target = STREAM.baseViewers + STREAM.perWanted * player.wanted + STREAM.perMission;
  s.viewers += Math.round((target - s.viewers) * Math.min(1, dt * 0.5) + (state.random() - 0.5) * 8);
  s.viewers = Math.max(0, s.viewers);

  // Hype climbs with danger and cools when things go quiet.
  const drama = 0.4 + player.wanted * 0.5 + (Math.abs(player.speed) > 200 ? 0.4 : 0);
  s.hype += (STREAM.hypePerSecond * drama - STREAM.hypeDecay) * dt;
  s.hype = Math.max(0, Math.min(100, s.hype));

  // Chat keeps talking: chase lines when the law is close, mission lines otherwise.
  s.chatT -= dt;
  if (s.chatT <= 0) {
    s.chatT = 2.2 + state.random() * 1.6;
    const pool = player.wanted > 0 ? CHAT_CHASE : (state.random() < 0.5 ? CHAT_CHEER : CHAT_MISSION);
    pushChat(state, { kind: 'msg', text: `${pickName(state)}: ${pool[Math.floor(state.random() * pool.length)]}` });
  }

  // Donations trickle in while the stream is live.
  s.donT -= dt;
  if (s.donT <= 0) {
    s.donT = 6 + state.random() * 10;
    if (state.random() < 0.35) {
      const amount = STREAM.donationMin + Math.floor(state.random() * (STREAM.donationMax - STREAM.donationMin + 1));
      player.cash += amount;
      player.earned += amount;
      pushChat(state, { kind: 'don', text: `💰 ${pickName(state)} donated $${amount}` });
    }
  }

  // The snitch: once the hype crosses the line, one viewer leaks Rae's spot.
  const line = s.forceSnitch ? 40 : STREAM.snitchAt;
  if (!s.snitched && s.hype >= line) {
    s.snitched = true;
    const name = pickName(state);
    pushChat(state, { kind: 'snitch', text: `🚨 @${name} leaked your location to the cops!` });
    state.missions.banner = `@${name} snitched — the cops know where you are!`;
    state.missions.bannerT = 4;
    addHeat(state, 60);
  }
}
