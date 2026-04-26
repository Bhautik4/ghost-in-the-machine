/**
 * Web Audio API sound effects engine.
 * Generates all sounds procedurally — no audio files needed.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/** Short "ding" when a task is fixed */
export function playTaskFixed() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain).connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

/** Low rumble for blackout */
export function playBlackout() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain).connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(60, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 1.5);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 2);
}

/** Alert chime for vote called */
export function playVoteCalled() {
  const ctx = getCtx();
  [660, 880, 1100].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

/** Urgent beep for time warning (< 30s) */
export function playTimeWarning() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain).connect(ctx.destination);
  osc.type = "square";
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

/** Dramatic game over sound */
export function playGameOver() {
  const ctx = getCtx();
  [440, 370, 311, 261].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.25;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

/** Ambient creepy drone — returns a stop function */
export function startAmbientDrone(): () => void {
  const ctx = getCtx();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const masterGain = ctx.createGain();

  osc1.type = "sine";
  osc1.frequency.value = 55;
  osc2.type = "sine";
  osc2.frequency.value = 57; // slight detune for beating

  lfo.type = "sine";
  lfo.frequency.value = 0.3;
  lfoGain.gain.value = 0.05;

  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain);

  osc1.connect(masterGain);
  osc2.connect(masterGain);
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.04;

  osc1.start();
  osc2.start();
  lfo.start();

  return () => {
    osc1.stop();
    osc2.stop();
    lfo.stop();
  };
}

/** Increase drone intensity based on paranoia (0-100) */
export function updateDroneIntensity(paranoia: number) {
  // This is handled by the component that manages the drone
}

/** Play a sound by name */
export function playSfx(sound: string) {
  switch (sound) {
    case "task-fixed":
      playTaskFixed();
      break;
    case "blackout":
      playBlackout();
      break;
    case "vote-called":
      playVoteCalled();
      break;
    case "time-warning":
      playTimeWarning();
      break;
    case "game-over":
      playGameOver();
      break;
  }
}
