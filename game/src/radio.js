// The radio: three stations, synthesized live with WebAudio — no audio files, no network.
// Each station is a small step sequencer: SOL FM plays sunset synthwave arpeggios, Barrio
// Beats plays street percussion over a low bass, and Gold Talk plays news jingles between
// its talk-show murmur. Keys 1, 2, 3 switch stations; R cycles them.

import { RADIO } from './config.js';

const STEP_SECONDS = 0.3;

/** One short synth note: an oscillator with a fast attack and a falling tail. */
function blip(ctx, dest, freq, dur, type, gain) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(amp);
  amp.connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + dur + 0.05);
}

/** One drum hit: filtered noise for a hat, or a falling sine for a kick. */
function drum(ctx, dest, kind) {
  const t = ctx.currentTime;
  if (kind === 'kick') {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    amp.gain.setValueAtTime(0.5, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(amp);
    amp.connect(dest);
    osc.start();
    osc.stop(t + 0.2);
  } else {
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.18, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(dest);
    src.start();
  }
}

// SOL FM: A-minor synthwave arpeggio over a warm pad note.
const SOL_ARP = [110, 130.81, 164.81, 196, 220, 196, 164.81, 130.81];
// Barrio Beats: kick on 0 and 4, hats on the off-beats, bass bounces on 2 and 6.
const BARRIO_BASS = [0, 0, 82.41, 0, 0, 0, 98, 0];
// Gold Talk: a bright major jingle every eight steps.
const TALK_JINGLE = [523.25, 659.25, 783.99, 1046.5];

/** One step of the radio: schedule the next notes of the current station. */
export function updateRadio(state, dt) {
  const audio = state.audio;
  const radio = state.radio;
  if (audio.ctx === null || audio.master === null || radio.station === 'off') return;
  radio.t -= dt;
  if (radio.t > 0) return;
  radio.t = STEP_SECONDS;
  const station = RADIO.stations.find((s) => s.id === radio.station);
  const gainNode = audio.master;
  if (radio.station === 'sol') {
    const note = SOL_ARP[radio.step % SOL_ARP.length];
    blip(audio.ctx, gainNode, note, 0.4, 'sawtooth', 0.12);
    if (radio.step % 8 === 0) blip(audio.ctx, gainNode, note / 2, 1.8, 'sine', 0.06);
  } else if (radio.station === 'barrio') {
    if (radio.step % 4 === 0) drum(audio.ctx, gainNode, 'kick');
    if (radio.step % 2 === 1) drum(audio.ctx, gainNode, 'hat');
    const bass = BARRIO_BASS[radio.step % BARRIO_BASS.length];
    if (bass > 0) blip(audio.ctx, gainNode, bass, 0.25, 'square', 0.1);
  } else if (radio.station === 'gold') {
    if (radio.step % 8 === 0) {
      const jingle = TALK_JINGLE[radio.step % TALK_JINGLE.length];
      blip(audio.ctx, gainNode, jingle, 0.5, 'sine', 0.08);
    }
  }
  radio.step += 1;
}

/** A fresh radio: off until the player picks a station. */
export function createRadio() {
  return { station: 'off', step: 0, t: 0 };
}

/** Switch to a station by id (or 'off'), and restart its step counter. */
export function setStation(state, id) {
  state.radio.station = id;
  state.radio.step = 0;
  state.radio.t = 0;
}

/** The station's display name, or 'Radio off'. */
export function stationName(state) {
  const station = RADIO.stations.find((s) => s.id === state.radio.station);
  return station ? station.name : 'Radio off';
}
