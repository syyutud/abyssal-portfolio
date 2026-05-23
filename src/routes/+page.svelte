<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  import { updateCursor } from '$lib/stores/cursor';
  import AbyssCursor from '$lib/components/AbyssCursor.svelte';
  import CursorTrail from '$lib/components/CursorTrail.svelte';
  import WaterPushText from '$lib/components/WaterPushText.svelte';

  let intensity = $state(1.75);
  let fade = $state(0.105);
  let particleCount = $state(14);
  let particleSize = $state(84);
  let life = $state(78);
  let spread = $state(36);
  let blur = $state(2.4);
  let opacity = $state(0.82);
  let stretch = $state(3.05);
  let thickness = $state(0.64);

  let colorCore = $state('#ff2a2a');
  let colorMid = $state('#2bdc62');
  let colorDeep = $state('#2358ff');

  let shapeMode = $state('droplet');
  let pointDensity = $state(2.4);
  let headBulge = $state(1.25);
  let tailThinness = $state(0.05);
  let feather = $state(0.7);
  let highlightStrength = $state(0.01);

  let debugOpen = $state(false);
  let hasLoadedSettings = $state(false);

  let motionTime = $state(0);
  let pulseScale = $state(1);

  const COLOR_CYCLE_ENABLED = true;
  const PULSE_ENABLED = true;

  // 不再缩到 0.5 以下，而是在 0.86 - 1.32 之间呼吸
  const PULSE_STRENGTH = 0.5;
  const PULSE_SPEED = 1.0;

  const SETTINGS_KEY = 'abyssal-trail-settings-v1';

  function toggleDebug() {
    debugOpen = !debugOpen;
  }

  function presetInk() {
    intensity = 1.45;
    fade = 0.16;
    particleCount = 6;
    particleSize = 72;
    life = 42;
    spread = 12;
    blur = 1.6;
    opacity = 0.78;
    stretch = 2.6;
    thickness = 0.42;

    colorCore = '#ff2a2a';
    colorMid = '#2bdc62';
    colorDeep = '#2358ff';

    shapeMode = 'droplet';
    pointDensity = 2.4;
    headBulge = 1.25;
    tailThinness = 0.05;
    feather = 0.7;
    highlightStrength = 0.01;
  }

  function presetGlow() {
    intensity = 1.75;
    fade = 0.105;
    particleCount = 8;
    particleSize = 78;
    life = 56;
    spread = 18;
    blur = 1.8;
    opacity = 0.82;
    stretch = 2.8;
    thickness = 0.46;

    colorCore = '#ff2a2a';
    colorMid = '#2bdc62';
    colorDeep = '#2358ff';

    shapeMode = 'ribbon';
    pointDensity = 2.6;
    headBulge = 1.15;
    tailThinness = 0.05;
    feather = 0.7;
    highlightStrength = 0.01;
  }

  function presetShort() {
    intensity = 1.25;
    fade = 0.22;
    particleCount = 5;
    particleSize = 54;
    life = 30;
    spread = 8;
    blur = 1.1;
    opacity = 0.72;
    stretch = 2.2;
    thickness = 0.4;

    colorCore = '#ff2a2a';
    colorMid = '#2bdc62';
    colorDeep = '#2358ff';

    shapeMode = 'droplet';
    pointDensity = 2.1;
    headBulge = 1.1;
    tailThinness = 0.05;
    feather = 0.55;
    highlightStrength = 0;
  }

  function resetSavedSettings() {
    if (browser) localStorage.removeItem(SETTINGS_KEY);
    presetInk();
  }

  function loadTrailSettings() {
    if (!browser) return;

    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw);

      intensity = saved.intensity ?? intensity;
      fade = saved.fade ?? fade;
      particleCount = saved.particleCount ?? particleCount;
      particleSize = saved.particleSize ?? particleSize;
      life = saved.life ?? life;
      spread = saved.spread ?? spread;
      blur = saved.blur ?? blur;
      opacity = saved.opacity ?? opacity;
      stretch = saved.stretch ?? stretch;
      thickness = saved.thickness ?? thickness;

      colorCore = saved.colorCore ?? colorCore;
      colorMid = saved.colorMid ?? colorMid;
      colorDeep = saved.colorDeep ?? colorDeep;

      shapeMode = saved.shapeMode ?? shapeMode;
      pointDensity = saved.pointDensity ?? pointDensity;
      headBulge = saved.headBulge ?? headBulge;
      tailThinness = saved.tailThinness ?? tailThinness;
      feather = saved.feather ?? feather;
      highlightStrength = saved.highlightStrength ?? highlightStrength;
    } catch {
      localStorage.removeItem(SETTINGS_KEY);
    }
  }

  function saveTrailSettings() {
    if (!browser) return;

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        intensity,
        fade,
        particleCount,
        particleSize,
        life,
        spread,
        blur,
        opacity,
        stretch,
        thickness,
        colorCore,
        colorMid,
        colorDeep,
        shapeMode,
        pointDensity,
        headBulge,
        tailThinness,
        feather,
        highlightStrength
      })
    );
  }

  $effect(() => {
    if (!hasLoadedSettings) return;

    intensity;
    fade;
    particleCount;
    particleSize;
    life;
    spread;
    blur;
    opacity;
    stretch;
    thickness;
    colorCore;
    colorMid;
    colorDeep;
    shapeMode;
    pointDensity;
    headBulge;
    tailThinness;
    feather;
    highlightStrength;

    saveTrailSettings();
  });

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

  function getAnimatedColors() {
    if (!COLOR_CYCLE_ENABLED) {
      return {
        core: colorCore,
        mid: colorMid,
        deep: colorDeep
      };
    }

    // motionTime = 0:
    // core 红，mid 绿，deep 蓝
    // 平滑循环，不硬切。
    const baseHue = (motionTime * 72) % 360;

    return {
      core: hslToHex(baseHue + 0, 94, 54),
      mid: hslToHex(baseHue + 120, 86, 44),
      deep: hslToHex(baseHue + 240, 96, 34)
    };
  }

  function getPulseScale() {
    if (!PULSE_ENABLED) return 1;

    const raw = (Math.sin(motionTime * Math.PI * 2 * PULSE_SPEED) + 1) / 2;
    const wave = raw * raw * (3 - 2 * raw);

    // 0.86 -> 1.32 -> 0.86
    // 肉眼明显，但不会消失。
    return 0.86 + wave * PULSE_STRENGTH;
  }

  function getTrailPulseScale() {
    // trail 只轻微呼吸，不要跟 cursor 一样夸张。
    return 0.86 + (pulseScale - 0.86) * 0.38;
  }

  function getTitleTextProps() {
    const trailPulse = getTrailPulseScale();
    const visualHead = particleSize * trailPulse * thickness * Math.max(1, headBulge);
    const visualTail = particleSize * trailPulse * thickness * Math.max(0.22, tailThinness * 3.2);

    return {
      splitMode: 'word' as const,
      headRadius: Math.round(visualHead * 2.2 * (0.96 + pulseScale * 0.14)),
      tailLength: Math.round(Math.min(590, (life * 7.2 + particleSize * 1.35) * 1.02)),
      tailRadius: Math.round(visualTail * 1.55 * (0.96 + pulseScale * 0.12)),
      pushStrength: 1.28,
      extraPush: 22,
      tangent: 0.1,
      stiffness: 0.06,
      damping: 0.88,
      maxRotate: 2.6,
      maxScaleBoost: 0.012,
      minOpacity: 0.9,
      maxBlur: 0.32,
      maxDisplacement: 145
    };
  }

  function getBodyTextProps() {
    const trailPulse = getTrailPulseScale();
    const visualHead = particleSize * trailPulse * thickness * Math.max(1, headBulge);
    const visualTail = particleSize * trailPulse * thickness * Math.max(0.22, tailThinness * 3.2);

    return {
      splitMode: 'word' as const,
      headRadius: Math.round(visualHead * 1.36 * (0.98 + pulseScale * 0.08)),
      tailLength: Math.round(Math.min(440, (life * 5.8 + particleSize) * 1.01)),
      tailRadius: Math.round(visualTail * 1.08 * (0.98 + pulseScale * 0.08)),
      pushStrength: 0.72,
      extraPush: 8,
      tangent: 0.06,
      stiffness: 0.065,
      damping: 0.9,
      maxRotate: 1.1,
      maxScaleBoost: 0.004,
      minOpacity: 0.94,
      maxBlur: 0.18,
      maxDisplacement: 62
    };
  }

  onMount(() => {
    loadTrailSettings();
    hasLoadedSettings = true;

    let raf = 0;
    const start = performance.now();

    const tick = () => {
      motionTime = (performance.now() - start) / 1000;
      pulseScale = getPulseScale();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const handlePointerMove = (event: PointerEvent) => {
      updateCursor(event.clientX, event.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(raf);
    };
  });
</script>

<svelte:head>
  <title>Abyssal Portfolio</title>
  <meta
    name="description"
    content="An interactive portfolio shaped by abyssal cursor motion and responsive typography."
  />
</svelte:head>

<main class="page-shell">
  <CursorTrail
    {intensity}
    {fade}
    {particleCount}
    particleSize={Math.round(particleSize * getTrailPulseScale())}
    {life}
    {spread}
    {blur}
    {opacity}
    {stretch}
    {thickness}
    colorCore={getAnimatedColors().core}
    colorMid={getAnimatedColors().mid}
    colorDeep={getAnimatedColors().deep}
    {shapeMode}
    {pointDensity}
    {headBulge}
    {tailThinness}
    {feather}
    {highlightStrength}
  />

  <AbyssCursor {pulseScale} colorCore={getAnimatedColors().core} />

  <section class="hero">
    <WaterPushText
      tag="p"
      text="ABYSSAL CURSOR SYSTEM / PHASE 01"
      className="hero-eyebrow"
      {...getBodyTextProps()}
    />

    <WaterPushText
      tag="h1"
      text="VERONICA YU"
      className="hero-name"
      {...getTitleTextProps()}
    />

    <WaterPushText
      tag="p"
      text="Interactive systems, visual storytelling, and data interfaces shaped by motion."
      className="hero-subtitle"
      {...getBodyTextProps()}
    />

    <WaterPushText
      tag="p"
      text="MOVE YOUR CURSOR ACROSS THE DARK WATER, LET THE CURRENT OPEN A PATH THROUGH THE WORDS, AND WATCH THE SENTENCE DRIFT APART BEFORE IT SLOWLY GATHERS ITSELF INTO FORM AGAIN. MOVE YOUR CURSOR ACROSS THE DARK WATER, LET THE CURRENT OPEN A PATH THROUGH THE WORDS, AND WATCH THE SENTENCE DRIFT APART BEFORE IT SLOWLY GATHERS ITSELF INTO FORM AGAIN."
      className="hero-instruction long"
      {...getBodyTextProps()}
    />
  </section>

  <button class="debug-toggle" type="button" onclick={toggleDebug}>
    {debugOpen ? 'Hide Trail Lab' : 'Trail Lab'}
  </button>

  {#if debugOpen}
    <aside class="control-panel">
      <div class="panel-head">
        <div>
          <p class="panel-kicker">Trail Lab</p>
          <h2>Ink Parameters</h2>
        </div>
      </div>

      <div class="presets">
        <button type="button" onclick={presetInk}>Ink</button>
        <button type="button" onclick={presetGlow}>Glow</button>
        <button type="button" onclick={presetShort}>Short</button>
        <button type="button" onclick={resetSavedSettings}>Reset</button>
      </div>

      <label>
        <span>Intensity <b>{intensity.toFixed(2)}</b></span>
        <input type="range" min="0.2" max="3" step="0.05" bind:value={intensity} />
      </label>

      <label>
        <span>Fade speed <b>{fade.toFixed(3)}</b></span>
        <input type="range" min="0.04" max="0.38" step="0.005" bind:value={fade} />
      </label>

      <label>
        <span>Particle count <b>{particleCount}</b></span>
        <input type="range" min="1" max="16" step="1" bind:value={particleCount} />
      </label>

      <label>
        <span>Particle size <b>{particleSize}</b></span>
        <input type="range" min="12" max="120" step="1" bind:value={particleSize} />
      </label>

      <label>
        <span>Life <b>{life}</b></span>
        <input type="range" min="12" max="110" step="1" bind:value={life} />
      </label>

      <label>
        <span>Spread <b>{spread}</b></span>
        <input type="range" min="0" max="60" step="1" bind:value={spread} />
      </label>

      <label>
        <span>Blur <b>{blur.toFixed(1)}</b></span>
        <input type="range" min="0" max="5" step="0.1" bind:value={blur} />
      </label>

      <label>
        <span>Opacity <b>{opacity.toFixed(2)}</b></span>
        <input type="range" min="0.1" max="1" step="0.01" bind:value={opacity} />
      </label>

      <label>
        <span>Shape stretch <b>{stretch.toFixed(2)}</b></span>
        <input type="range" min="0.6" max="4" step="0.05" bind:value={stretch} />
      </label>

      <label>
        <span>Shape thickness <b>{thickness.toFixed(2)}</b></span>
        <input type="range" min="0.12" max="1.2" step="0.02" bind:value={thickness} />
      </label>

      <label>
        <span>Shape mode <b>{shapeMode}</b></span>
        <select bind:value={shapeMode}>
          <option value="droplet">droplet</option>
          <option value="ribbon">ribbon</option>
          <option value="ink">ink</option>
        </select>
      </label>

      <label>
        <span>Point density <b>{pointDensity.toFixed(2)}</b></span>
        <input type="range" min="0.8" max="4" step="0.1" bind:value={pointDensity} />
      </label>

      <label>
        <span>Head bulge <b>{headBulge.toFixed(2)}</b></span>
        <input type="range" min="0.4" max="2.2" step="0.05" bind:value={headBulge} />
      </label>

      <label>
        <span>Tail thinness <b>{tailThinness.toFixed(2)}</b></span>
        <input type="range" min="0.01" max="0.3" step="0.01" bind:value={tailThinness} />
      </label>

      <label>
        <span>Feather <b>{feather.toFixed(2)}</b></span>
        <input type="range" min="0" max="1.4" step="0.05" bind:value={feather} />
      </label>

      <label>
        <span>Highlight <b>{highlightStrength.toFixed(2)}</b></span>
        <input
          type="range"
          min="0"
          max="0.3"
          step="0.01"
          bind:value={highlightStrength}
        />
      </label>

      <div class="colors">
        <label>
          <span>Core fallback</span>
          <input type="color" bind:value={colorCore} />
        </label>

        <label>
          <span>Mid fallback</span>
          <input type="color" bind:value={colorMid} />
        </label>

        <label>
          <span>Deep fallback</span>
          <input type="color" bind:value={colorDeep} />
        </label>
      </div>

      <p class="hint">
        当前颜色自动循环：core 从红色开始，mid 从绿色开始，deep 从蓝色开始。面板颜色是备用色。
      </p>
    </aside>
  {/if}
</main>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #05070b;
  }

  :global(body) {
    cursor: none;
  }

  .page-shell {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    isolation: isolate;
    background:
      radial-gradient(circle at 50% 42%, rgba(34, 72, 96, 0.22), transparent 34%),
      radial-gradient(circle at 80% 20%, rgba(82, 33, 42, 0.12), transparent 24%),
      #05070b;
    color: rgba(240, 248, 255, 0.92);
  }

  .page-shell::before {
    content: '';
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(circle at 50% 50%, rgba(72, 146, 180, 0.12), transparent 28%),
      radial-gradient(circle at 40% 60%, rgba(208, 236, 255, 0.06), transparent 20%);
    filter: blur(40px);
    opacity: 0.9;
    z-index: -2;
  }

  .page-shell::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: radial-gradient(circle at center, black, transparent 68%);
    opacity: 0.22;
    z-index: -1;
  }

  .hero {
    position: absolute;
    left: 50%;
    top: 47%;
    width: min(980px, calc(100vw - 48px));
    transform: translate(-50%, -50%);
    text-align: center;
    padding: 32px;
    z-index: 30;
    pointer-events: none;
  }

  :global(.hero-eyebrow) {
    margin: 0 0 22px;
    font-size: 12px;
    letter-spacing: 0.32em;
    color: rgba(180, 224, 244, 0.66);
  }

  :global(.hero-name) {
    margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(54px, 11vw, 150px);
    font-weight: 500;
    line-height: 0.9;
    letter-spacing: -0.07em;
    color: rgba(238, 247, 255, 0.96);
    text-shadow:
      0 0 30px rgba(87, 175, 212, 0.16),
      0 0 80px rgba(87, 175, 212, 0.08);
  }

  :global(.hero-subtitle) {
    max-width: 680px;
    margin: 28px auto 0;
    font-size: clamp(16px, 2vw, 24px);
    line-height: 1.45;
    color: rgba(220, 236, 244, 0.74);
  }

  :global(.hero-instruction) {
    max-width: 760px;
    margin: 34px auto 0;
    font-size: 11px;
    line-height: 1.8;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(181, 216, 230, 0.36);
  }

  :global(.hero-instruction.long) {
    margin-top: 38px;
  }

  .debug-toggle {
    position: fixed;
    left: 18px;
    bottom: 18px;
    z-index: 160;
    border: 1px solid rgba(156, 220, 246, 0.2);
    border-radius: 999px;
    padding: 9px 14px;
    color: rgba(230, 247, 255, 0.86);
    background: rgba(3, 8, 13, 0.86);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
    cursor: pointer;
  }

  .debug-toggle:hover {
    background: rgba(28, 75, 94, 0.86);
  }

  .control-panel {
    position: fixed;
    left: 18px;
    bottom: 64px;
    z-index: 150;
    width: 310px;
    max-height: calc(100vh - 86px);
    overflow: auto;
    padding: 16px;
    border: 1px solid rgba(170, 222, 244, 0.18);
    border-radius: 18px;
    background: rgba(3, 8, 13, 0.94);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.32);
    color: rgba(232, 247, 255, 0.88);
    cursor: auto;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .panel-kicker {
    margin: 0 0 2px;
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(142, 205, 230, 0.62);
  }

  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 500;
  }

  .presets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }

  button {
    border: 1px solid rgba(156, 220, 246, 0.18);
    border-radius: 999px;
    padding: 7px 8px;
    color: rgba(230, 247, 255, 0.88);
    background: rgba(30, 78, 96, 0.26);
    cursor: pointer;
  }

  button:hover {
    background: rgba(58, 132, 160, 0.38);
  }

  label {
    display: grid;
    gap: 5px;
    margin: 10px 0;
    font-size: 12px;
    color: rgba(218, 238, 246, 0.82);
  }

  label span {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  label b {
    font-weight: 500;
    color: rgba(158, 222, 248, 0.9);
  }

  input[type='range'] {
    width: 100%;
    accent-color: #74d8f6;
  }

  select {
    width: 100%;
    border: 1px solid rgba(156, 220, 246, 0.18);
    border-radius: 10px;
    padding: 8px 10px;
    color: rgba(230, 247, 255, 0.9);
    background: rgba(5, 14, 20, 0.88);
    outline: none;
  }

  .colors {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 12px;
  }

  .colors label {
    margin: 0;
  }

  input[type='color'] {
    width: 100%;
    height: 34px;
    padding: 0;
    border: 1px solid rgba(156, 220, 246, 0.18);
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
  }

  .hint {
    margin: 12px 0 0;
    font-size: 11px;
    line-height: 1.45;
    color: rgba(188, 215, 224, 0.56);
  }
</style>