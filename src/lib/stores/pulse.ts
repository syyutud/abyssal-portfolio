import { writable } from 'svelte/store';

export type PulseState = {
  time: number;
  pulseScale: number;
  trailScale: number;
  core: string;
  mid: string;
  deep: string;
};

const initial: PulseState = {
  time: 0,
  pulseScale: 1,
  trailScale: 1,
  core: '#ff2a2a',
  mid: '#2bdc62',
  deep: '#2358ff'
};

export const pulse = writable<PulseState>(initial);

let raf = 0;
let started = false;

const PULSE_STRENGTH = 0.42;
const PULSE_SPEED = 1.12;
const COLOR_SPEED = 68;

function hslToHex(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getPulseScale(time: number) {
  const raw = (Math.sin(time * Math.PI * 2 * PULSE_SPEED) + 1) / 2;
  const wave = raw * raw * (3 - 2 * raw);

  // 0.86 -> 1.28 -> 0.86
  return 0.86 + wave * PULSE_STRENGTH;
}

function getTrailScale(pulseScale: number) {
  // trail 轻微跟随，不要大幅闪烁
  return 0.88 + (pulseScale - 0.86) * 0.36;
}

function getColors(time: number) {
  const baseHue = (time * COLOR_SPEED) % 360;

  return {
    // core 从红色起步
    core: hslToHex(baseHue + 8, 82, 56),

    // mid 从绿色起步
    mid: hslToHex(baseHue + 135, 64, 42),

    // deep 从蓝色起步
    deep: hslToHex(baseHue + 235, 80, 32)
  };
}

export function startPulseSystem() {
  if (typeof window === 'undefined') return () => {};
  if (started) return () => {};

  started = true;
  const start = performance.now();

  const tick = () => {
    const time = (performance.now() - start) / 1000;
    const pulseScale = getPulseScale(time);
    const trailScale = getTrailScale(pulseScale);
    const colors = getColors(time);

    pulse.set({
      time,
      pulseScale,
      trailScale,
      core: colors.core,
      mid: colors.mid,
      deep: colors.deep
    });

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    started = false;
  };
}