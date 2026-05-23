import { writable } from 'svelte/store';

export type CursorState = {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  speed: number;
  active: boolean;
};

const initialState: CursorState = {
  x: 0,
  y: 0,
  px: 0,
  py: 0,
  vx: 0,
  vy: 0,
  speed: 0,
  active: false
};

export const cursor = writable<CursorState>(initialState);

export function updateCursor(x: number, y: number) {
  cursor.update((current) => {
    const vx = x - current.x;
    const vy = y - current.y;
    const speed = Math.sqrt(vx * vx + vy * vy);

    return {
      x,
      y,
      px: current.x,
      py: current.y,
      vx,
      vy,
      speed,
      active: true
    };
  });
}