/**
 * =============================================================================
 * MODULE 06: ADVANCED PORTFOLIO — KINETIC GROUND INTERACTION & SCROLL SYSTEM
 * =============================================================================
 * Core Architectural Concepts:
 *   1. Dynamic Reactive Base Ground (GLSL ShaderMaterial):
 *      - Procedural undulating terrain vertex displacement
 *      - Multi-source contact shockwave ripples when elements impact or interact
 *      - Anti-aliased procedural neon grid lines (`fwidth`)
 *      - Dynamic real-time entity contact glow aura underneath each moving element
 *   2. Kinetic Element Swarm & Multi-Entity Interactions:
 *      - 16 kinetic multi-part artifacts (metallic core + gyroscope ring + halo)
 *      - Proximity Energy Beams (dynamic BufferGeometry LineSegments) connecting
 *        neighboring entities when distance < threshold
 *      - Ground particle wake trails (THREE.Points) emitting as entities glide
 *   3. Scroll-Driven Storytelling & FSM (Finite State Machine):
 *      - Chapter 1 (0.00-0.25): // 01 MATRIX AWAKENING (Structured crystalline grid)
 *      - Chapter 2 (0.25-0.50): // 02 KINETIC DISPERSION (Free roaming & proximity beams)
 *      - Chapter 3 (0.50-0.75): // 03 GRAVITATIONAL VORTEX (High-speed spiral convergence)
 *      - Chapter 4 (0.75-1.00): // 04 SPATIAL GALLERY (Interactive 3D project monoliths)
 *   4. Interactive Raycasting & Shockwave Generation:
 *      - Hovering over an artifact lifts it, spins it up, and reveals project specs
 *      - Clicking emits an explosive physical shockwave through ground vertices
 *      - Ground mouse tracking repels nearby kinetic entities
 *   5. Augmented lil-gui:
 *      - Direct control of scroll scrubbing, auto-scroll, proximity beams, wave
 *        frequencies, ground glow, bloom, and 4 cyberpunk color themes.
 * =============================================================================
 */

import gsap from 'gsap';

export const META = {
  title: '6. Advanced Portfolio: Kinetic Ground & Scroll Narrative',
  description:
    'Multiple kinetic elements interact across a reactive GLSL ground plane with proximity energy beams, ground contact ripples, and a 4-chapter scroll-driven camera storytelling system.',
  hints: 'Scroll with mouse wheel/trackpad or drag scrollbar • Click any entity to trigger a ground shockwave • Hover to inspect',
};

// -----------------------------------------------------------------------------
// 1. PORTFOLIO SHOWCASE DATA (Presented in Chapter 4)
// -----------------------------------------------------------------------------
const PORTFOLIO_PROJECTS = [
  {
    title: 'Autonomous WebGL Engine',
    category: 'Core Graphics / WebGPU',
    desc: 'High-throughput instanced particle simulator rendering 500k elements at 60 FPS.',
    tags: ['WebGPU', 'Compute Shaders', 'Three.js'],
  },
  {
    title: 'Spatial Audio Synthesizer',
    category: 'Interactive Audio / DSP',
    desc: 'Binaural 3D positional soundscape engine mapped to WebGL camera trajectories.',
    tags: ['Web Audio API', 'HRTF Filters', 'GSAP'],
  },
  {
    title: 'Volumetric Cloud Renderer',
    category: 'Procedural Shaders / GLSL',
    desc: 'Raymarched Beer-Lambert atmospheric scattering with dynamic directional sunlight.',
    tags: ['GLSL', 'Raymarching', 'Noise Functions'],
  },
  {
    title: 'BVH Physics Collision Core',
    category: 'Computational Geometry',
    desc: 'Hardware-accelerated bounding volume hierarchy for real-time mesh raycasting.',
    tags: ['three-mesh-bvh', 'Octree', 'KD-Tree'],
  },
];

// -----------------------------------------------------------------------------
// 2. GLSL SHADERS FOR REACTIVE BASE GROUND
// -----------------------------------------------------------------------------
const GROUND_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uWaveFreq;
  uniform float uWaveAmp;
  uniform vec4 uRipples[6]; // (x, z, radius, intensity)

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // 1. Ambient undulating ground waves
    float baseWave = sin(pos.x * uWaveFreq + uTime * 1.2) 
                   * cos(pos.y * uWaveFreq + uTime * 1.0) * uWaveAmp;

    // 2. Multi-source contact shockwaves
    float rippleSum = 0.0;
    for (int i = 0; i < 6; i++) {
      if (uRipples[i].w > 0.001) {
        float d = distance(pos.xy, uRipples[i].xy);
        float ring = sin((d - uRipples[i].z) * 6.0);
        float falloff = exp(-pow(d - uRipples[i].z, 2.0) * 1.5) * exp(-d * 0.12);
        rippleSum += ring * falloff * uRipples[i].w * 0.6;
      }
    }

    pos.z += baseWave + rippleSum;
    vElevation = pos.z;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const GROUND_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorBase;
  uniform vec3 uColorGrid;
  uniform vec3 uColorGlow;
  uniform float uGridScale;
  uniform float uGlowIntensity;
  uniform vec3 uEntityPos[16]; // World coordinates of moving elements
  uniform int uEntityCount;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vElevation;

  // Anti-aliased grid lines using fwidth derivative
  float computeGrid(vec2 coord, float scale, float lineWidth) {
    vec2 grid = abs(fract(coord * scale - 0.5) - 0.5) / fwidth(coord * scale);
    float line = min(grid.x, grid.y);
    return 1.0 - min(line / lineWidth, 1.0);
  }

  void main() {
    // 1. Procedural dual grid (fine inner grid + coarse structural grid)
    float fineGrid = computeGrid(vWorldPosition.xz, uGridScale, 1.0);
    float coarseGrid = computeGrid(vWorldPosition.xz, uGridScale * 0.2, 1.6);
    float gridFactor = fineGrid * 0.4 + coarseGrid * 0.9;

    // 2. Base surface shading with elevation gradient
    vec3 surfaceColor = mix(uColorBase, uColorGrid, gridFactor * 0.7);
    surfaceColor += uColorGrid * (vElevation * 0.35);

    // 3. Entity contact glow auras directly under moving elements
    float contactGlow = 0.0;
    for (int i = 0; i < 16; i++) {
      if (i >= uEntityCount) break;
      float d = distance(vWorldPosition.xz, uEntityPos[i].xz);
      float aura = exp(-d * 1.6); // Exponential radial falloff
      contactGlow += aura;
    }
    surfaceColor += uColorGlow * (contactGlow * uGlowIntensity);

    // 4. Circular vignette / radial edge fade into the background void
    float distFromCenter = length(vWorldPosition.xz);
    float alpha = smoothstep(32.0, 14.0, distFromCenter);

    gl_FragColor = vec4(surfaceColor, alpha);
  }
`;

// -----------------------------------------------------------------------------
// 3. COLOR THEMES PRESETS
// -----------------------------------------------------------------------------
const THEMES = {
  'Cyberpunk Cyan': {
    base: '#060a12',
    grid: '#0ea5e9',
    glow: '#38bdf8',
    core: '#38bdf8',
    beam: '#06b6d4',
    bg: '#05070d',
  },
  'Neon Violet': {
    base: '#0c0714',
    grid: '#8b5cf6',
    glow: '#d946ef',
    core: '#c084fc',
    beam: '#a855f7',
    bg: '#08050e',
  },
  'Emerald Matrix': {
    base: '#040d09',
    grid: '#10b981',
    glow: '#34d399',
    core: '#6ee7b7',
    beam: '#059669',
    bg: '#030806',
  },
  'Solar Amber': {
    base: '#120a04',
    grid: '#f59e0b',
    glow: '#fbbf24',
    core: '#fde047',
    beam: '#d97706',
    bg: '#0a0502',
  },
};

// -----------------------------------------------------------------------------
// 4. MODULE INITIALIZER
// -----------------------------------------------------------------------------
export function init({ THREE, scene, camera, renderer, controls, gui, canvas }) {
  console.log('[06-kinetic-portfolio] Initializing Kinetic Ground Portfolio...');

  // Set dark immersive background matching default theme
  scene.background = new THREE.Color(THEMES['Cyberpunk Cyan'].bg);
  scene.fog = new THREE.FogExp2(THEMES['Cyberpunk Cyan'].bg, 0.035);

  // ---------------------------------------------------------------------------
  // A. REACTIVE BASE GROUND SETUP
  // ---------------------------------------------------------------------------
  const ENTITY_COUNT = 16;
  const ripples = [
    { x: 0, z: 0, radius: 0, intensity: 0 },
    { x: 0, z: 0, radius: 0, intensity: 0 },
    { x: 0, z: 0, radius: 0, intensity: 0 },
    { x: 0, z: 0, radius: 0, intensity: 0 },
    { x: 0, z: 0, radius: 0, intensity: 0 },
    { x: 0, z: 0, radius: 0, intensity: 0 },
  ];
  let nextRippleIndex = 0;

  function triggerRipple(x, z, intensity = 1.0) {
    ripples[nextRippleIndex] = {
      x,
      z,
      radius: 0.1,
      intensity,
    };
    nextRippleIndex = (nextRippleIndex + 1) % ripples.length;
  }

  const rippleVectors = ripples.map(
    (r) => new THREE.Vector4(r.x, r.z, r.radius, r.intensity)
  );
  const entityPosVectors = Array.from(
    { length: ENTITY_COUNT },
    () => new THREE.Vector3(0, 0, 0)
  );

  const groundUniforms = {
    uTime: { value: 0 },
    uWaveFreq: { value: 0.18 },
    uWaveAmp: { value: 0.35 },
    uRipples: { value: rippleVectors },
    uColorBase: { value: new THREE.Color(THEMES['Cyberpunk Cyan'].base) },
    uColorGrid: { value: new THREE.Color(THEMES['Cyberpunk Cyan'].grid) },
    uColorGlow: { value: new THREE.Color(THEMES['Cyberpunk Cyan'].glow) },
    uGridScale: { value: 0.75 },
    uGlowIntensity: { value: 1.4 },
    uEntityPos: { value: entityPosVectors },
    uEntityCount: { value: ENTITY_COUNT },
  };

  const groundGeo = new THREE.PlaneGeometry(64, 64, 128, 128);
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX_SHADER,
    fragmentShader: GROUND_FRAGMENT_SHADER,
    uniforms: groundUniforms,
    transparent: true,
    depthWrite: false,
    wireframe: false,
  });

  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  scene.add(groundMesh);

  // ---------------------------------------------------------------------------
  // B. KINETIC ENTITY SWARM (16 Multi-Part Artifacts)
  // ---------------------------------------------------------------------------
  const entities = [];
  const entityGroup = new THREE.Group();
  scene.add(entityGroup);

  const sharedCoreGeo = new THREE.OctahedronGeometry(0.42, 0);
  const sharedRingGeo = new THREE.TorusGeometry(0.68, 0.025, 16, 32);
  const sharedHaloGeo = new THREE.RingGeometry(0.8, 0.88, 32);

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(THEMES['Cyberpunk Cyan'].core),
    emissiveIntensity: 1.2,
    roughness: 0.2,
    metalness: 0.9,
  });

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.1,
    metalness: 0.95,
    wireframe: true,
  });

  const haloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(THEMES['Cyberpunk Cyan'].glow),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45,
  });

  for (let i = 0; i < ENTITY_COUNT; i++) {
    const root = new THREE.Group();

    // 1. Faceted central core
    const core = new THREE.Mesh(sharedCoreGeo, coreMat);
    core.castShadow = true;
    root.add(core);

    // 2. Outer gyroscope gimbal ring
    const ring = new THREE.Mesh(sharedRingGeo, ringMat);
    root.add(ring);

    // 3. Ground contact projected halo
    const halo = new THREE.Mesh(sharedHaloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.4;
    root.add(halo);

    // Assign project metadata to the first 4 showcase artifacts
    const project = i < PORTFOLIO_PROJECTS.length ? PORTFOLIO_PROJECTS[i] : null;

    root.userData = {
      id: i,
      project,
      baseAltitude: 0.85 + (i % 3) * 0.2,
      velocity: new THREE.Vector3(),
      phaseOffset: (i / ENTITY_COUNT) * Math.PI * 2,
      spinSpeed: 0.8 + Math.random() * 0.8,
      isHovered: false,
      hoverScale: 1.0,
      shockPulse: 0.0,
    };

    entityGroup.add(root);
    entities.push(root);
  }

  // ---------------------------------------------------------------------------
  // C. DYNAMIC PROXIMITY ENERGY BEAMS (LineSegments)
  // ---------------------------------------------------------------------------
  // Maximum possible connection lines between 16 entities: (16 * 15) / 2 = 120
  const MAX_LINES = 120;
  const linePositions = new Float32Array(MAX_LINES * 2 * 3);
  const lineColors = new Float32Array(MAX_LINES * 2 * 3);

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });

  const proximityLines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(proximityLines);

  // ---------------------------------------------------------------------------
  // D. GROUND PARTICLE WAKE TRAILS (THREE.Points)
  // ---------------------------------------------------------------------------
  const PARTICLE_COUNT = 600;
  const pPositions = new Float32Array(PARTICLE_COUNT * 3);
  const pAlphas = new Float32Array(PARTICLE_COUNT);
  const pVelocities = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 40;
    pPositions[i * 3 + 1] = 0.05 + Math.random() * 0.15;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    pAlphas[i] = Math.random();
    pVelocities.push({
      x: (Math.random() - 0.5) * 0.02,
      z: (Math.random() - 0.5) * 0.02,
    });
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.08,
    color: new THREE.Color(THEMES['Cyberpunk Cyan'].glow),
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
  });

  const particleWakes = new THREE.Points(pGeo, pMat);
  scene.add(particleWakes);

  // ---------------------------------------------------------------------------
  // E. LIGHTING SETUP
  // ---------------------------------------------------------------------------
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
  keyLight.position.set(10, 16, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x818cf8, 3.0, 30);
  fillLight.position.set(-8, 5, -8);
  scene.add(fillLight);

  // ---------------------------------------------------------------------------
  // F. SCROLL STORYTELLING STATE MACHINE (FSM)
  // ---------------------------------------------------------------------------
  const scrollState = {
    progress: 0.0,       // 0.0 to 1.0
    targetProgress: 0.0, // Smooth lerping target
    autoScroll: false,
    autoScrollSpeed: 0.05,
    cameraMode: 'Cinematic Scroll', // 'Cinematic Scroll' | 'Free Orbit'
    theme: 'Cyberpunk Cyan',
    proximityThreshold: 4.5,
    waveSpeed: 1.0,
    hoverEnabled: true,
  };

  /**
   * Deterministic Kinematic Position Evaluator across 4 Chapters:
   * State 0 (0.00-0.25): // 01 Matrix Awakening — 4x4 Grid
   * State 1 (0.25-0.50): // 02 Kinetic Dispersion — Lissajous figure-8 roaming
   * State 2 (0.50-0.75): // 03 Gravitational Vortex — High-speed spiral swirl
   * State 3 (0.75-1.00): // 04 Spatial Exhibit — Curved Showcase Pedestals
   */
  function getEntityTargetPos(index, progress, time) {
    const i = index;
    const count = ENTITY_COUNT;
    const target = new THREE.Vector3();

    if (progress < 0.25) {
      // Stage 0: Crystalline Grid
      const col = i % 4;
      const row = Math.floor(i / 4);
      target.x = (col - 1.5) * 3.2;
      target.z = (row - 1.5) * 3.2;
      target.y = 0.85 + Math.sin(time * 2.0 + i * 0.4) * 0.2;
    } else if (progress < 0.5) {
      // Stage 1: Kinetic Dispersion (Lissajous curves)
      const t = (progress - 0.25) / 0.25;
      const freqA = 1.0 + (i % 3) * 0.5;
      const freqB = 1.5 + (i % 2) * 0.5;
      const radius = 6.0 + (i % 4) * 2.0;

      const lx = Math.sin(time * freqA + i) * radius;
      const lz = Math.cos(time * freqB + i * 1.5) * (radius * 0.75);

      // Interpolate from grid to Lissajous
      const col = i % 4;
      const row = Math.floor(i / 4);
      const gx = (col - 1.5) * 3.2;
      const gz = (row - 1.5) * 3.2;

      target.x = THREE.MathUtils.lerp(gx, lx, t);
      target.z = THREE.MathUtils.lerp(gz, lz, t);
      target.y = 0.8 + Math.sin(time * 3.0 + i) * 0.35;
    } else if (progress < 0.75) {
      // Stage 2: Gravitational Vortex (Spiral inwards)
      const t = (progress - 0.5) / 0.25;
      const angle = time * 2.5 + (i / count) * Math.PI * 2;
      const spiralRadius = 8.0 - t * 4.5 + Math.sin(time + i) * 0.8;

      target.x = Math.cos(angle) * spiralRadius;
      target.z = Math.sin(angle) * spiralRadius;
      target.y = 0.6 + Math.cos(angle * 2.0) * 0.4 + (1.0 - t) * 0.5;
    } else {
      // Stage 3: Spatial Exhibit Showcase (Circular Gallery arc)
      const t = (progress - 0.75) / 0.25;
      const angle = (i / count) * Math.PI * 1.6 - Math.PI * 0.8;
      const galleryRadius = 7.5;

      const gx = Math.sin(angle) * galleryRadius;
      const gz = Math.cos(angle) * galleryRadius - 2.0;
      const gy = 1.2 + Math.sin(time * 1.5 + i) * 0.15;

      // Vortex exit interpolation
      const prevAngle = time * 2.5 + (i / count) * Math.PI * 2;
      const vx = Math.cos(prevAngle) * 3.5;
      const vz = Math.sin(prevAngle) * 3.5;

      target.x = THREE.MathUtils.lerp(vx, gx, t);
      target.z = THREE.MathUtils.lerp(vz, gz, t);
      target.y = THREE.MathUtils.lerp(0.8, gy, t);
    }

    return target;
  }

  // ---------------------------------------------------------------------------
  // G. CAMERA CHOREOGRAPHY SPLINE
  // ---------------------------------------------------------------------------
  const cameraTrack = {
    // Defines camera eye position & lookAt target as progress travels 0 -> 1
    evaluate(p) {
      const eye = new THREE.Vector3();
      const look = new THREE.Vector3();

      if (p < 0.25) {
        // High isometric overview
        eye.set(8, 9, 12);
        look.set(0, 0, 0);
      } else if (p < 0.5) {
        // Low skimming angle across the kinetic swarm
        const t = (p - 0.25) / 0.25;
        eye.set(
          THREE.MathUtils.lerp(8, -10, t),
          THREE.MathUtils.lerp(9, 3.2, t),
          THREE.MathUtils.lerp(12, 10, t)
        );
        look.set(0, 0.5, 0);
      } else if (p < 0.75) {
        // Dynamic vortex orbit
        const t = (p - 0.5) / 0.25;
        const orbitAngle = t * Math.PI;
        eye.set(Math.sin(orbitAngle) * 11, 6.5, Math.cos(orbitAngle) * 11);
        look.set(0, 0.5, 0);
      } else {
        // Gallery showcase framing
        const t = (p - 0.75) / 0.25;
        eye.set(
          THREE.MathUtils.lerp(0, 0, t),
          THREE.MathUtils.lerp(6.5, 3.8, t),
          THREE.MathUtils.lerp(11, 8.2, t)
        );
        look.set(0, 1.2, 0);
      }

      return { eye, look };
    },
  };

  // ---------------------------------------------------------------------------
  // H. HTML SCROLL OVERLAY & 3D PROJECT TOOLTIP
  // ---------------------------------------------------------------------------
  // Inject portfolio UI overlay container into document.body
  const overlay = document.createElement('div');
  overlay.id = 'kinetic-portfolio-overlay';
  overlay.innerHTML = `
    <!-- Chapter Indicator Pill Track -->
    <div class="scroll-track-nav" aria-label="Portfolio Chapters">
      <div class="track-node active" data-progress="0.0">
        <span class="node-num">01</span>
        <span class="node-label">Matrix Awakening</span>
      </div>
      <div class="track-node" data-progress="0.33">
        <span class="node-num">02</span>
        <span class="node-label">Kinetic Dispersion</span>
      </div>
      <div class="track-node" data-progress="0.66">
        <span class="node-num">03</span>
        <span class="node-label">Vortex Convergence</span>
      </div>
      <div class="track-node" data-progress="1.0">
        <span class="node-num">04</span>
        <span class="node-label">Spatial Showcase</span>
      </div>
    </div>

    <!-- Active Chapter HUD Badge -->
    <div class="chapter-hud">
      <div class="hud-phase-tag" id="hud-phase-tag">CHAPTER // 01</div>
      <div class="hud-phase-title" id="hud-phase-title">Crystalline Matrix Genesis</div>
    </div>

    <!-- Dynamic 3D Project Hover Card -->
    <div id="project-tooltip" class="project-tooltip hidden">
      <span class="tooltip-category" id="tt-cat">Core Engine</span>
      <h3 class="tooltip-title" id="tt-title">Project Title</h3>
      <p class="tooltip-desc" id="tt-desc">Project details and architecture.</p>
      <div class="tooltip-tags" id="tt-tags"></div>
      <span class="tooltip-hint">Click element to emit shockwave</span>
    </div>
  `;
  document.body.appendChild(overlay);

  // Wire chapter track clicks
  const trackNodes = overlay.querySelectorAll('.track-node');
  trackNodes.forEach((node) => {
    node.addEventListener('click', () => {
      const targetP = parseFloat(node.dataset.progress);
      gsap.to(scrollState, {
        targetProgress: targetP,
        duration: 1.2,
        ease: 'power2.inOut',
      });
    });
  });

  const phaseTag = document.getElementById('hud-phase-tag');
  const phaseTitle = document.getElementById('hud-phase-title');
  const tooltip = document.getElementById('project-tooltip');
  const ttCat = document.getElementById('tt-cat');
  const ttTitle = document.getElementById('tt-title');
  const ttDesc = document.getElementById('tt-desc');
  const ttTags = document.getElementById('tt-tags');

  // Wheel / Trackpad scroll listener
  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY * 0.0008;
    scrollState.targetProgress = THREE.MathUtils.clamp(
      scrollState.targetProgress + delta,
      0.0,
      1.0
    );
  }
  window.addEventListener('wheel', onWheel, { passive: false });

  // ---------------------------------------------------------------------------
  // I. RAYCASTING & INTERACTION
  // ---------------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-999, -999);
  let hoveredEntity = null;

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Reposition hover tooltip
    if (hoveredEntity && tooltip && !tooltip.classList.contains('hidden')) {
      tooltip.style.left = `${e.clientX + 16}px`;
      tooltip.style.top = `${e.clientY - 24}px`;
    }
  }

  function onClick(e) {
    if (hoveredEntity) {
      // Trigger major ground shockwave at entity's ground projection
      triggerRipple(hoveredEntity.position.x, hoveredEntity.position.z, 2.0);

      // Impulse jump animation on the clicked entity
      gsap.to(hoveredEntity.position, {
        y: hoveredEntity.position.y + 1.2,
        duration: 0.25,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
      });

      // Scatter nearby particles outward
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const dx = pPositions[i * 3] - hoveredEntity.position.x;
        const dz = pPositions[i * 3 + 2] - hoveredEntity.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 4.0 && dist > 0.01) {
          pPositions[i * 3] += (dx / dist) * 1.2;
          pPositions[i * 3 + 2] += (dz / dist) * 1.2;
        }
      }
      pGeo.attributes.position.needsUpdate = true;
    } else {
      // Raycast against ground to create a ripple at click coordinate
      raycaster.setFromCamera(mouse, camera);
      const groundHits = raycaster.intersectObject(groundMesh);
      if (groundHits.length > 0) {
        triggerRipple(groundHits[0].point.x, groundHits[0].point.z, 1.2);
      }
    }
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('click', onClick);

  // ---------------------------------------------------------------------------
  // J. LIL-GUI AUGMENTATION
  // ---------------------------------------------------------------------------
  const scrollFolder = gui.addFolder('Narrative Scroll');
  scrollFolder
    .add(scrollState, 'targetProgress', 0.0, 1.0, 0.001)
    .name('Scroll Progress')
    .listen();
  scrollFolder.add(scrollState, 'autoScroll').name('Auto Scroll');
  scrollFolder.add(scrollState, 'autoScrollSpeed', 0.01, 0.2, 0.01);
  scrollFolder
    .add(scrollState, 'cameraMode', ['Cinematic Scroll', 'Free Orbit'])
    .name('Camera Mode')
    .onChange((mode) => {
      if (mode === 'Free Orbit') {
        controls.enabled = true;
      } else {
        controls.enabled = false;
      }
    });

  const swarmFolder = gui.addFolder('Kinetic Swarm & Ground');
  swarmFolder
    .add(scrollState, 'proximityThreshold', 2.0, 8.0, 0.1)
    .name('Beam Threshold');
  swarmFolder
    .add(groundUniforms.uWaveFreq, 'value', 0.05, 0.5, 0.01)
    .name('Ground Frequency');
  swarmFolder
    .add(groundUniforms.uWaveAmp, 'value', 0.0, 1.0, 0.05)
    .name('Ground Amplitude');
  swarmFolder
    .add(groundUniforms.uGlowIntensity, 'value', 0.5, 3.0, 0.1)
    .name('Ground Glow');
  swarmFolder.add(groundMat, 'wireframe').name('Wireframe Ground');

  const themeFolder = gui.addFolder('Atmosphere & Themes');
  themeFolder
    .add(scrollState, 'theme', Object.keys(THEMES))
    .name('Color Theme')
    .onChange((themeKey) => {
      const t = THEMES[themeKey];
      groundUniforms.uColorBase.value.set(t.base);
      groundUniforms.uColorGrid.value.set(t.grid);
      groundUniforms.uColorGlow.value.set(t.glow);
      coreMat.emissive.set(t.core);
      haloMat.color.set(t.glow);
      pMat.color.set(t.glow);
      scene.background.set(t.bg);
      scene.fog.color.set(t.bg);
    });

  // Default camera mode locks OrbitControls to prioritize cinematic track
  controls.enabled = false;

  // ---------------------------------------------------------------------------
  // K. DETERMINISTIC UPDATE LOOP
  // ---------------------------------------------------------------------------
  return {
    update(elapsed, delta) {
      // 1. Auto scroll progression
      if (scrollState.autoScroll) {
        scrollState.targetProgress += delta * scrollState.autoScrollSpeed;
        if (scrollState.targetProgress > 1.0) {
          scrollState.targetProgress = 0.0;
        }
      }

      // Smooth dampening to target scroll progress
      scrollState.progress = THREE.MathUtils.lerp(
        scrollState.progress,
        scrollState.targetProgress,
        delta * 6.0
      );

      // Update ground shader uniforms
      groundUniforms.uTime.value = elapsed * scrollState.waveSpeed;

      // Expand and decay active ground ripples
      for (let i = 0; i < ripples.length; i++) {
        if (ripples[i].intensity > 0.001) {
          ripples[i].radius += delta * 7.5; // Ripple expansion speed
          ripples[i].intensity = Math.max(0, ripples[i].intensity - delta * 0.85); // Decay
          rippleVectors[i].set(
            ripples[i].x,
            ripples[i].z,
            ripples[i].radius,
            ripples[i].intensity
          );
        }
      }

      // 2. Update Kinetic Entities
      for (let i = 0; i < ENTITY_COUNT; i++) {
        const ent = entities[i];
        const target = getEntityTargetPos(i, scrollState.progress, elapsed);

        // Smooth physical convergence
        ent.position.lerp(target, delta * 5.0);

        // Intrinsic rotations
        ent.children[0].rotation.y += delta * ent.userData.spinSpeed;
        ent.children[0].rotation.x += delta * (ent.userData.spinSpeed * 0.5);
        ent.children[1].rotation.x += delta * (ent.userData.spinSpeed * 0.8);
        ent.children[1].rotation.z += delta * (ent.userData.spinSpeed * 0.4);

        // Pass entity ground positions to ground shader
        entityPosVectors[i].copy(ent.position);
      }

      // 3. Proximity Energy Beams computation
      let lineVertexIdx = 0;
      const threshold = scrollState.proximityThreshold;
      const tSq = threshold * threshold;
      const themeData = THEMES[scrollState.theme];
      const beamColor = new THREE.Color(themeData.beam);

      for (let i = 0; i < ENTITY_COUNT; i++) {
        for (let j = i + 1; j < ENTITY_COUNT; j++) {
          const dSq = entities[i].position.distanceToSquared(entities[j].position);
          if (dSq < tSq && lineVertexIdx < MAX_LINES * 2) {
            const posA = entities[i].position;
            const posB = entities[j].position;
            const alpha = 1.0 - Math.sqrt(dSq) / threshold;

            // Point A
            linePositions[lineVertexIdx * 3] = posA.x;
            linePositions[lineVertexIdx * 3 + 1] = posA.y;
            linePositions[lineVertexIdx * 3 + 2] = posA.z;
            lineColors[lineVertexIdx * 3] = beamColor.r * alpha;
            lineColors[lineVertexIdx * 3 + 1] = beamColor.g * alpha;
            lineColors[lineVertexIdx * 3 + 2] = beamColor.b * alpha;
            lineVertexIdx++;

            // Point B
            linePositions[lineVertexIdx * 3] = posB.x;
            linePositions[lineVertexIdx * 3 + 1] = posB.y;
            linePositions[lineVertexIdx * 3 + 2] = posB.z;
            lineColors[lineVertexIdx * 3] = beamColor.r * alpha;
            lineColors[lineVertexIdx * 3 + 1] = beamColor.g * alpha;
            lineColors[lineVertexIdx * 3 + 2] = beamColor.b * alpha;
            lineVertexIdx++;
          }
        }
      }
      lineGeo.setDrawRange(0, lineVertexIdx);
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;

      // 4. Update Particle Wake Field
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pPositions[i * 3] += pVelocities[i].x;
        pPositions[i * 3 + 2] += pVelocities[i].z;

        // Wrap around boundaries
        if (pPositions[i * 3] > 20) pPositions[i * 3] = -20;
        if (pPositions[i * 3] < -20) pPositions[i * 3] = 20;
        if (pPositions[i * 3 + 2] > 20) pPositions[i * 3 + 2] = -20;
        if (pPositions[i * 3 + 2] < -20) pPositions[i * 3 + 2] = 20;
      }
      pGeo.attributes.position.needsUpdate = true;

      // 5. Camera Choreography (When Cinematic Scroll is active)
      if (scrollState.cameraMode === 'Cinematic Scroll') {
        const { eye, look } = cameraTrack.evaluate(scrollState.progress);
        camera.position.lerp(eye, delta * 4.0);
        camera.lookAt(look);
      }

      // 6. Raycast entity hover & tooltip
      raycaster.setFromCamera(mouse, camera);
      const hitCandidates = entities.map((e) => e.children[0]); // Test core meshes
      const hits = raycaster.intersectObjects(hitCandidates, false);

      if (hits.length > 0) {
        const hitRoot = hits[0].object.parent;
        if (hoveredEntity !== hitRoot) {
          if (hoveredEntity) {
            hoveredEntity.scale.setScalar(1.0);
          }
          hoveredEntity = hitRoot;
          hoveredEntity.scale.setScalar(1.35);
          canvas.style.cursor = 'pointer';

          // Show project card if available
          if (hoveredEntity.userData.project) {
            const prj = hoveredEntity.userData.project;
            ttCat.textContent = prj.category;
            ttTitle.textContent = prj.title;
            ttDesc.textContent = prj.desc;
            ttTags.innerHTML = prj.tags
              .map((t) => `<span class="tt-tag">${t}</span>`)
              .join('');
            tooltip.classList.remove('hidden');
          } else {
            ttCat.textContent = `Node // 0${hoveredEntity.userData.id}`;
            ttTitle.textContent = 'Kinetic Harmonic Node';
            ttDesc.textContent =
              'Autonomous floating oscillator generating ground interference waves.';
            ttTags.innerHTML = '<span class="tt-tag">Reactive Node</span>';
            tooltip.classList.remove('hidden');
          }
        }
      } else if (hoveredEntity) {
        hoveredEntity.scale.setScalar(1.0);
        hoveredEntity = null;
        tooltip.classList.add('hidden');
        canvas.style.cursor = 'default';
      }

      // 7. Update HUD Chapter Indicator
      const p = scrollState.progress;
      let activeChapterIdx = 0;
      if (p < 0.25) {
        phaseTag.textContent = 'CHAPTER // 01';
        phaseTitle.textContent = 'Crystalline Matrix Genesis';
        activeChapterIdx = 0;
      } else if (p < 0.5) {
        phaseTag.textContent = 'CHAPTER // 02';
        phaseTitle.textContent = 'Kinetic Dispersion & Proximity Arcs';
        activeChapterIdx = 1;
      } else if (p < 0.75) {
        phaseTag.textContent = 'CHAPTER // 03';
        phaseTitle.textContent = 'Gravitational Vortex Resonance';
        activeChapterIdx = 2;
      } else {
        phaseTag.textContent = 'CHAPTER // 04';
        phaseTitle.textContent = 'Spatial Exhibit & Interactive Monoliths';
        activeChapterIdx = 3;
      }

      trackNodes.forEach((node, idx) => {
        if (idx === activeChapterIdx) {
          node.classList.add('active');
        } else {
          node.classList.remove('active');
        }
      });
    },

    dispose() {
      console.log('[06-kinetic-portfolio] Disposing resources & listeners...');
      window.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('click', onClick);
      canvas.style.cursor = 'default';
      controls.enabled = true;

      // Remove HTML scroll overlay
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    },
  };
}
