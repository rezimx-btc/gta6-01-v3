// Keyboard and mouse input. Held keys give steering and throttle; one-shot presses (start,
// pause, enter a car, shoot, honk, switch radio station) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_SHOOT = 8;
export const ACTION_HORN = 16;
export const ACTION_RADIO_1 = 32;
export const ACTION_RADIO_2 = 64;
export const ACTION_RADIO_3 = 128;
export const ACTION_RADIO_NEXT = 256;
export const ACTION_MUTE = 512;
export const ACTION_RESTART = 1024;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const SHOOT = new Set(['Space', 'KeyF']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const HORN = new Set(['KeyH']);

/** A live snapshot of the held keys, for the loop to steer with. */
export function createInput(target) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let run = false;
  let actions = 0;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') run = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (ENTER.has(event.code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (HORN.has(event.code)) {
      if (!event.repeat) actions |= ACTION_HORN;
    } else if (SHOOT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SHOOT;
    } else if (event.code === 'Digit1') {
      if (!event.repeat) actions |= ACTION_RADIO_1;
    } else if (event.code === 'Digit2') {
      if (!event.repeat) actions |= ACTION_RADIO_2;
    } else if (event.code === 'Digit3') {
      if (!event.repeat) actions |= ACTION_RADIO_3;
    } else if (event.code === 'KeyR') {
      // R restarts the run: a fresh Rae, the same city.
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (event.code === 'KeyM') {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') run = false;
  });

  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    run = false;
    mouseDown = false;
  });

  target.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  target.addEventListener('pointermove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  return {
    /** -1/0/1 throttle (W/S or up/down), and -1/0/1 steering (A/D or left/right). */
    throttle() {
      return (up ? 1 : 0) - (down ? 1 : 0);
    },
    steer() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** True while Shift is held: run on foot, or just a little more nerve in a car. */
    running() {
      return run;
    },
    /** True while the mouse button is held: aim and shoot toward the pointer. */
    shooting() {
      return mouseDown;
    },
    /** The pointer's last position on the screen, in CSS pixels. */
    pointer() {
      return { x: mouseX, y: mouseY };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
