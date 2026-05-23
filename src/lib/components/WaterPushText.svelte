<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { cursor } from '$lib/stores/cursor';

  let {
    text = '',
    tag = 'div',
    className = '',
    splitMode = 'word',

    // collider shape
    headRadius = 145,
    tailLength = 360,
    tailRadius = 42,

    // displacement
    pushStrength = 1.45,
    extraPush = 22,
    tangent = 0.12,

    // spring return
    stiffness = 0.075,
    damping = 0.84,

    // visual motion
    maxRotate = 4,
    maxScaleBoost = 0.02,

    // recovery visual
    minOpacity = 0.82,
    maxBlur = 0.7,

    // safety for paragraph text
    maxDisplacement = 120
  }: {
    text?: string;
    tag?: 'h1' | 'h2' | 'p' | 'div' | 'span';
    className?: string;
    splitMode?: 'word' | 'letter';

    headRadius?: number;
    tailLength?: number;
    tailRadius?: number;

    pushStrength?: number;
    extraPush?: number;
    tangent?: number;

    stiffness?: number;
    damping?: number;

    maxRotate?: number;
    maxScaleBoost?: number;

    minOpacity?: number;
    maxBlur?: number;
    maxDisplacement?: number;
  } = $props();

  type UnitToken = {
    text: string;
    movable: boolean;
    key: string;
  };

  type UnitState = {
    el: HTMLSpanElement | null;
    movable: boolean;
    baseX: number;
    baseY: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    influence: number;
    displayOpacity: number;
    displayBlur: number;
  };

  let unitEls: HTMLSpanElement[] = [];
  let states: UnitState[] = [];

  let pointer = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    active: false
  };

  let raf = 0;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  const unsubscribe = cursor.subscribe((state) => {
    pointer = {
      x: state.x,
      y: state.y,
      vx: state.vx,
      vy: state.vy,
      speed: state.speed,
      active: state.active
    };
  });

  function buildTokens(input: string, mode: 'word' | 'letter'): UnitToken[] {
    if (mode === 'letter') {
      return input.split('').map((ch, i) => ({
        text: ch === ' ' ? '\u00A0' : ch,
        movable: ch.trim().length > 0,
        key: `l-${i}-${ch}`
      }));
    }

    return input
      .split(/(\s+)/)
      .filter(Boolean)
      .map((part, i) => ({
        text: /^\s+$/.test(part) ? part.replace(/ /g, '\u00A0') : part,
        movable: !/^\s+$/.test(part),
        key: `w-${i}-${part}`
      }));
  }

  let tokens = $derived(buildTokens(text, splitMode));

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function rebuildStates() {
    states = unitEls.map((el, i) => {
      const prev = states[i];
      const token = tokens[i];

      return {
        el,
        movable: token?.movable ?? false,
        baseX: prev?.baseX ?? 0,
        baseY: prev?.baseY ?? 0,
        x: prev?.x ?? 0,
        y: prev?.y ?? 0,
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
        influence: prev?.influence ?? 0,
        displayOpacity: prev?.displayOpacity ?? 1,
        displayBlur: prev?.displayBlur ?? 0
      };
    });
  }

  function measureUnits() {
    if (!unitEls.length) return;

    unitEls.forEach((el, i) => {
      if (el && states[i]?.movable) {
        el.style.transform = '';
        el.style.opacity = '';
        el.style.filter = '';
      }
    });

    requestAnimationFrame(() => {
      states.forEach((state, i) => {
        const el = unitEls[i];
        if (!el) return;

        const rect = el.getBoundingClientRect();
        state.baseX = rect.left + rect.width / 2;
        state.baseY = rect.top + rect.height / 2;
      });
    });
  }

  function getClosestPointOnSegment(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number
  ) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;

    const abLenSq = abx * abx + aby * aby || 0.0001;
    const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);

    return {
      x: ax + abx * t,
      y: ay + aby * t,
      t
    };
  }

  function loop() {
    const speed = Math.max(1, pointer.speed);
    const dirLen = Math.sqrt(pointer.vx * pointer.vx + pointer.vy * pointer.vy) || 1;

    const dirX = pointer.vx / dirLen;
    const dirY = pointer.vy / dirLen;

    const dynamicTailLength = tailLength + clamp(speed * 3.2, 0, 180);
    const headX = pointer.x;
    const headY = pointer.y;
    const tailX = pointer.x - dirX * dynamicTailLength;
    const tailY = pointer.y - dirY * dynamicTailLength;

    for (let i = 0; i < states.length; i += 1) {
      const state = states[i];
      if (!state.el || !state.movable) continue;

      let tx = 0;
      let ty = 0;
      let influence = 0;

      if (pointer.active) {
        const closest = getClosestPointOnSegment(
          state.baseX,
          state.baseY,
          tailX,
          tailY,
          headX,
          headY
        );

        const localRadius =
          tailRadius + Math.pow(closest.t, 2.4) * (headRadius - tailRadius);

        const dx = state.baseX - closest.x;
        const dy = state.baseY - closest.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

        if (dist < localRadius) {
  const nx = dx / dist;
  const ny = dy / dist;

  const penetration = localRadius - dist;
  const softFalloff = Math.pow(1 - dist / localRadius, 1.35);
  const push = penetration * pushStrength + extraPush * softFalloff;

  tx += nx * push;
  ty += ny * push;

  tx += -ny * push * tangent;
  ty += nx * push * tangent;

  const displacement = Math.sqrt(tx * tx + ty * ty);

  if (displacement > maxDisplacement) {
    const scale = maxDisplacement / displacement;
    tx *= scale;
    ty *= scale;
  }

  influence = clamp(softFalloff + penetration / localRadius, 0, 1);
}
      }

      state.vx += (tx - state.x) * stiffness;
      state.vy += (ty - state.y) * stiffness;

      state.vx *= damping;
      state.vy *= damping;

      state.x += state.vx;
      state.y += state.vy;

      state.influence += (influence - state.influence) * 0.16;

      const targetOpacity = 1 - state.influence * (1 - minOpacity);
      const targetBlur = state.influence * maxBlur;

      state.displayOpacity += (targetOpacity - state.displayOpacity) * 0.12;
      state.displayBlur += (targetBlur - state.displayBlur) * 0.16;

      const rotate = clamp(state.x * 0.14, -maxRotate, maxRotate);
      const scale = 1 + state.influence * maxScaleBoost;

      state.el.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${rotate}deg) scale(${scale})`;
      state.el.style.opacity = `${state.displayOpacity}`;
      state.el.style.filter = `blur(${state.displayBlur}px)`;
    }

    raf = requestAnimationFrame(loop);
  }

  function handleResize() {
    if (resizeTimer) clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      measureUnits();
    }, 100);
  }

  onMount(async () => {
    await tick();
    rebuildStates();
    measureUnits();

    window.addEventListener('resize', handleResize);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(raf);

      if (resizeTimer) clearTimeout(resizeTimer);
    };
  });

  $effect(() => {
    text;
    splitMode;

    tick().then(() => {
      rebuildStates();
      measureUnits();
    });
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

<svelte:element this={tag} class={`water-push-text ${className}`}>
  {#each tokens as token, i (token.key)}
    <span
      class:movable={token.movable}
      class:spacer={!token.movable}
      class="unit"
      bind:this={unitEls[i]}
      aria-hidden="true"
    >
      {token.text}
    </span>
  {/each}
</svelte:element>

<style>
  .water-push-text {
    display: inline-block;
    white-space: pre-wrap;
  }

  .unit {
    display: inline-block;
    will-change: transform, opacity, filter;
    transform-origin: center center;
    backface-visibility: hidden;
  }

  .spacer {
    will-change: auto;
  }
</style>