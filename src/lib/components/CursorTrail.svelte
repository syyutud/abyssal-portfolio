<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { cursor } from '$lib/stores/cursor';

  let {
    intensity = 1.6,
    fade = 0.16,
    particleCount = 6,
    particleSize = 72,
    life = 36,
    spread = 10,
    blur = 1.2,
    opacity = 0.82,
    stretch = 2.4,
    thickness = 0.46,
    colorCore = '#e8fbff',
    colorMid = '#6ccfe8',
    colorDeep = '#0a3f56',
    shapeMode = 'ribbon',
    pointDensity = 2.4,
    headBulge = 1.25,
    tailThinness = 0.05,
    feather = 0.7,
    highlightStrength = 0.02
  } = $props();

  type TrailPoint = {
    x: number;
    y: number;
    age: number;
  };

  type Mist = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    age: number;
    life: number;
    size: number;
  };

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  let width = 0;
  let height = 0;
  let frame = 0;

  let mouseX = 0;
  let mouseY = 0;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let active = false;

  const points: TrailPoint[] = [];
  const mist: Mist[] = [];

  const unsubscribe = cursor.subscribe((state) => {
    mouseX = state.x;
    mouseY = state.y;
    active = state.active;
  });

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function hexToRgb(hex: string) {
    const clean = hex.replace('#', '');
    const value = parseInt(clean, 16);

    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255
    };
  }

  function rgba(hex: string, a: number) {
    const c = hexToRgb(hex);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
  }

  function resize() {
    const dpr = 1;

    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx = canvas.getContext('2d', { alpha: true });

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }

  function addPoint() {
    if (!active) return;

    const dx = mouseX - lastMouseX;
    const dy = mouseY - lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1.1 && points.length > 0) {
      points[points.length - 1].x = mouseX;
      points[points.length - 1].y = mouseY;
      return;
    }

    const steps = clamp(Math.floor(dist / 9), 1, 5);

    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const x = lastMouseX + dx * t;
      const y = lastMouseY + dy * t;

      points.push({ x, y, age: 0 });

      if (shapeMode !== 'ribbon' && Math.random() < particleCount / 42) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * spread;

        mist.push({
          x: x + Math.cos(a) * s,
          y: y + Math.sin(a) * s,
          vx: Math.cos(a) * 0.08 + (Math.random() - 0.5) * 0.14,
          vy: Math.sin(a) * 0.08 + (Math.random() - 0.5) * 0.14,
          age: 0,
          life: clamp(life * 0.55, 10, 32),
          size: particleSize * 0.16 + Math.random() * particleSize * 0.16
        });
      }
    }

    lastMouseX = mouseX;
    lastMouseY = mouseY;

    const maxPoints = clamp(Math.floor(life * 0.85), 14, 42);

    while (points.length > maxPoints) points.shift();
    while (mist.length > 28) mist.shift();
  }

  function getWidthFromT(t: number) {
    const smoothT = t * t * (3 - 2 * t);

    if (shapeMode === 'droplet') {
      return particleSize * (tailThinness + Math.pow(smoothT, 2.6) * headBulge) * thickness;
    }

    if (shapeMode === 'ink') {
      return (
        particleSize *
        (tailThinness * 1.8 + Math.pow(smoothT, 1.8) * (headBulge * 0.9)) *
        thickness
      );
    }

    return (
      particleSize *
      (tailThinness * 1.2 + Math.pow(smoothT, 1.35) * (headBulge * 0.58)) *
      thickness
    );
  }

  function catmullRom(
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number
  ) {
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x:
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y:
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
  }

  function buildSmoothTrail(raw: TrailPoint[]) {
    if (raw.length < 2) return raw.map((p) => ({ x: p.x, y: p.y }));

    const result: { x: number; y: number }[] = [];
    const segments = clamp(Math.round(pointDensity * 1.35), 3, 7);

    for (let i = 0; i < raw.length - 1; i += 1) {
      const p0 = raw[Math.max(0, i - 1)];
      const p1 = raw[i];
      const p2 = raw[i + 1];
      const p3 = raw[Math.min(raw.length - 1, i + 2)];

      for (let j = 0; j < segments; j += 1) {
        const t = j / segments;
        result.push(catmullRom(p0, p1, p2, p3, t));
      }
    }

    const last = raw[raw.length - 1];
    result.push({ x: last.x, y: last.y });

    if (result.length > 140) {
      const reduced: { x: number; y: number }[] = [];
      const step = Math.ceil(result.length / 140);

      for (let i = 0; i < result.length; i += step) {
        reduced.push(result[i]);
      }

      return reduced;
    }

    return result;
  }

  function strokeSmoothLine(
    smooth: { x: number; y: number }[],
    widthScale: number,
    alphaScale: number,
    colorA: string,
    colorB: string,
    skip = 1
  ) {
    if (!ctx || smooth.length < 2) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < smooth.length; i += skip) {
      const p0 = smooth[i - 1];
      const p1 = smooth[i];

      const t = i / Math.max(1, smooth.length - 1);
      const w = getWidthFromT(t) * widthScale;
      const alpha = Math.pow(t, 1.45) * alphaScale * opacity * intensity;
      const color = t < 0.55 ? colorB : colorA;

      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = Math.max(0.8, w);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);

      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);

      ctx.stroke();
    }
  }

  function drawRibbon() {
    if (!ctx || points.length < 2) return;

    const smooth = buildSmoothTrail(points);
    if (smooth.length < 2) return;

    const head = smooth[smooth.length - 1];

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    ctx.filter = `blur(${clamp(blur * 0.95, 0, 1.8)}px)`;
    strokeSmoothLine(smooth, 2.35 + feather * 0.45, 0.04, colorCore, colorDeep, 2);

    ctx.filter = `blur(${clamp(blur * 0.55, 0, 1.1)}px)`;
    strokeSmoothLine(smooth, 1.55, 0.075, colorCore, colorMid, 1);

    ctx.filter = `blur(${clamp(blur * 0.18, 0, 0.45)}px)`;
    strokeSmoothLine(smooth, 0.9, 0.095, colorCore, colorMid, 1);

    if (highlightStrength > 0.001) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = `blur(${clamp(blur * 0.08, 0, 0.22)}px)`;
      strokeSmoothLine(smooth, 0.18, highlightStrength * 0.5, colorCore, colorCore, 2);
    }

    if (shapeMode === 'droplet' || shapeMode === 'ink') {
      const headWidth = getWidthFromT(1) * (shapeMode === 'droplet' ? 1.65 : 1.25);

      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, headWidth * 1.85);
      g.addColorStop(0, rgba(colorCore, 0.18 * opacity * intensity));
      g.addColorStop(0.34, rgba(colorMid, 0.12 * opacity * intensity));
      g.addColorStop(0.76, rgba(colorDeep, 0.045 * opacity));
      g.addColorStop(1, rgba(colorDeep, 0));

      ctx.filter = `blur(${clamp(blur * 0.55, 0, 1.1)}px)`;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(head.x, head.y, headWidth * 1.85, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawMist() {
    if (!ctx || mist.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = `blur(${Math.max(0.2, clamp(blur, 0, 1.8) * 0.45)}px)`;

    for (let i = mist.length - 1; i >= 0; i -= 1) {
      const m = mist[i];
      const t = m.age / m.life;
      const a = Math.max(0, 1 - t);
      const size = m.size * (1 + t * stretch * 0.35);

      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, size);
      g.addColorStop(0, rgba(colorCore, 0.026 * a * opacity));
      g.addColorStop(0.42, rgba(colorMid, 0.044 * a * opacity));
      g.addColorStop(0.82, rgba(colorDeep, 0.032 * a * opacity));
      g.addColorStop(1, rgba(colorDeep, 0));

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, size * 1.1, size * 0.45, m.age * 0.01, 0, Math.PI * 2);
      ctx.fill();

      m.x += m.vx;
      m.y += m.vy;
      m.vx *= 0.98;
      m.vy *= 0.98;
      m.age += 1;

      if (m.age >= m.life) {
        mist.splice(i, 1);
      }
    }

    ctx.restore();
  }

  function draw() {
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = `rgba(5, 7, 11, ${fade})`;
    ctx.fillRect(0, 0, width, height);

    addPoint();

    for (let i = points.length - 1; i >= 0; i -= 1) {
      points[i].age += 1;

      if (points[i].age > life) {
        points.splice(i, 1);
      }
    }

    drawRibbon();
    drawMist();

    frame = requestAnimationFrame(draw);
  }

  onMount(() => {
    resize();

    mouseX = window.innerWidth / 2;
    mouseY = window.innerHeight / 2;
    lastMouseX = mouseX;
    lastMouseY = mouseY;

    window.addEventListener('resize', resize);
    frame = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame);
    };
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

<canvas bind:this={canvas} class="cursor-trail" style="opacity: {opacity};" aria-hidden="true"></canvas>

<style>
  .cursor-trail {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 18;
    mix-blend-mode: screen;
  }
</style>