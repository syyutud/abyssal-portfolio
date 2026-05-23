<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { cursor } from '$lib/stores/cursor';
  import { pulse } from '$lib/stores/pulse';

  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;
  let angle = 0;
  let active = false;
  let frame = 0;

  let pulseScale = 1;
  let colorCore = '#e8fbff';

  let cursorEl: HTMLDivElement;

  const unsubscribeCursor = cursor.subscribe((state) => {
    targetX = state.x;
    targetY = state.y;
    active = state.active;

    if (Math.abs(state.vx) + Math.abs(state.vy) > 0.6) {
      angle = Math.atan2(state.vy, state.vx);
    }
  });

  const unsubscribePulse = pulse.subscribe((state) => {
    pulseScale = state.pulseScale;
    colorCore = state.core;
  });

  onMount(() => {
    const tick = () => {
      x = targetX;
      y = targetY;

      if (cursorEl) {
        cursorEl.style.setProperty('--core-color', colorCore);
        cursorEl.style.setProperty('--pulse', `${pulseScale}`);
        cursorEl.style.transform = `
          translate3d(${x}px, ${y}px, 0)
          translate(-50%, -50%)
          rotate(${angle}rad)
        `;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  });

  onDestroy(() => {
    unsubscribeCursor();
    unsubscribePulse();
  });
</script>

<div bind:this={cursorEl} class:active class="abyss-cursor" aria-hidden="true">
  <div class="breath"></div>
  <div class="core"></div>
  <div class="front-glow"></div>
</div>

<style>
  .abyss-cursor {
    position: fixed;
    left: 0;
    top: 0;
    width: 120px;
    height: 86px;
    pointer-events: none;
    z-index: 90;
    opacity: 0;
    will-change: transform;
    transition: opacity 0.2s ease;
    mix-blend-mode: screen;
  }

  .abyss-cursor.active {
    opacity: 1;
  }

  .breath {
    position: absolute;
    left: 48%;
    top: 50%;
    width: 112px;
    height: 72px;
    border-radius: 999px;
    transform: translate(-50%, -50%) scale(calc(0.72 + var(--pulse) * 0.46));
    background:
      radial-gradient(
        ellipse at 62% 50%,
        color-mix(in srgb, var(--core-color) 34%, transparent),
        transparent 32%
      ),
      radial-gradient(
        ellipse at 42% 50%,
        color-mix(in srgb, var(--core-color) 18%, transparent),
        transparent 72%
      );
    filter: blur(18px);
    opacity: 0.82;
  }

  .core {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 68px;
    height: 44px;
    transform: translate(-50%, -50%) scale(calc(0.9 + var(--pulse) * 0.12));
    border-radius: 62% 48% 48% 62%;
    background:
      radial-gradient(
        ellipse at 58% 48%,
        color-mix(in srgb, var(--core-color) 88%, white 12%),
        transparent 36%
      ),
      radial-gradient(
        ellipse at 42% 55%,
        color-mix(in srgb, var(--core-color) 62%, #061019 38%),
        rgba(4, 10, 16, 0.68) 74%,
        transparent 100%
      );
    filter:
      drop-shadow(0 0 5px color-mix(in srgb, var(--core-color) 48%, transparent))
      drop-shadow(0 0 14px color-mix(in srgb, var(--core-color) 32%, transparent));
  }

  .front-glow {
    position: absolute;
    left: 70%;
    top: 50%;
    width: 18px;
    height: 18px;
    transform: translate(-50%, -50%) scale(calc(0.82 + var(--pulse) * 0.18));
    border-radius: 999px;
    background:
      radial-gradient(
        circle,
        rgba(255, 255, 255, 0.16),
        color-mix(in srgb, var(--core-color) 30%, transparent) 34%,
        transparent 78%
      );
    filter: blur(5px);
    opacity: 0.30;
  }
</style>