/**
 * =============================================================================
 * THREE.JS + ANIME.JS + LIL-GUI — SPACE-TO-RUNWAY LANDER (main.js)
 * =============================================================================
 * Separate, Deliberate Per-Shape Choreography:
 *   - Each shape tracks its own FSM state: `'landed' | 'launching' | 'in_space' | 'landing'`
 *   - Floating HTML pills project directly above each shape in 3D space so you
 *     can deliberately Launch or Land ANY individual shape (or all via HUD/GUI)!
 *   - Launch: Squat anticipation -> Push-off blast ring + downward thruster flame
 *     -> Deliberate rocket ascent (`inExpo`) into space orbit.
 *   - Land: Deliberate descent from space onto the runway (`outBounce` / `outExpo` /
 *     `spring`) + touchdown shockwave ring.
 * =============================================================================
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { animate, createTimeline, createSpring } from 'animejs';
import 'animejs/adapters/three';

import { createSkyboxManager } from './skyboxes.js';
import { createRunway } from './runway.js';

// -----------------------------------------------------------------------------
// 1. RENDERER, SCENE, CAMERA & CONTROLS
// -----------------------------------------------------------------------------
const canvas = document.getElementById('three-canvas');
const pillsLayer = document.getElementById('shape-pills-layer');
const skyBadge = document.getElementById('sky-badge');
const btnLaunchAll = document.getElementById('btn-launch-all');
const btnLandAll = document.getElementById('btn-land-all');
const btnToggleSky = document.getElementById('btn-toggle-sky');
const btnWebcam = document.getElementById('btn-webcam');
const photoUpload = document.getElementById('photo-upload');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(15, 9.5, 19);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.target.set(0, 1.4, 0);

// -----------------------------------------------------------------------------
// 2. SKYBOXES, LIGHTING & RUNWAY
// -----------------------------------------------------------------------------
const skyboxes = createSkyboxManager(renderer);
const runway = createRunway(scene);

const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.6);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0x93c5fd, 1.1);
sunLight.position.set(16, 26, 12);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -22;
sunLight.shadow.camera.right = 22;
sunLight.shadow.camera.top = 22;
sunLight.shadow.camera.bottom = -22;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

// -----------------------------------------------------------------------------
// 3. SPACE LANDER SHAPES, EFFECTS & FLOATING PILLS
// -----------------------------------------------------------------------------
const SHAPE_SPECS = [
  { name: 'Cargo Cube', geo: new THREE.BoxGeometry(1.5, 1.5, 1.5), color: 0x38bdf8, z: -12, x: -2.0, landY: 0.75 },
  { name: 'Relay Octa', geo: new THREE.OctahedronGeometry(1.05, 0), color: 0xff4b4b, z: -7.5, x: 2.0, landY: 1.05 },
  { name: 'Core Knot', geo: new THREE.TorusKnotGeometry(0.75, 0.25, 96, 24), color: 0xa855f7, z: -3, x: -2.0, landY: 1.15 },
  { name: 'Cone Lander', geo: new THREE.ConeGeometry(1.0, 2.0, 24), color: 0xfbbf24, z: 2, x: 2.0, landY: 1.0 },
  { name: 'Geo Pod', geo: new THREE.IcosahedronGeometry(1.05, 0), color: 0x34d399, z: 7, x: -2.0, landY: 1.05 },
  { name: 'Dodeca Probe', geo: new THREE.DodecahedronGeometry(1.0, 0), color: 0xf472b6, z: 12, x: 2.0, landY: 1.0 },
];

const params = {
  skyMode: 'Night',
  exposure: 1.05,
  dropAltitude: 16, // Visible hovering space altitude so Land pills remain clearly in view
  launchDurationMs: 1100,
  landDurationMs: 1700,
  staggerMs: 140,
  landingEase: 'outBounce',
  roughness: 0.25,
  metalness: 0.75,
  wireframe: false,
  autoOrbit: false,
  pulseBeacons: true,
};

const landers = [];
const landerMaterials = [];

function spawnShockwave(x, z, colorHex, maxScale = 4.5) {
  const ringGeo = new THREE.RingGeometry(0.4, 0.68, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.04, z);
  scene.add(ring);

  animate(ring, {
    scale: [1, maxScale],
    opacity: [0.95, 0],
    duration: 720,
    ease: 'outExpo',
    onComplete: () => {
      scene.remove(ring);
      ringGeo.dispose();
      ringMat.dispose();
    },
  });
}

/**
 * Spawns a glowing thruster flame plume that tracks directly underneath `mesh`
 * as it ascends (Launch Push-Off) or brakes before touchdown (Landing Retro-Burn).
 */
function spawnTrackingThruster(mesh, flameColor = 0xf97316, durationMs = 680) {
  const flameGeo = new THREE.ConeGeometry(0.42, 1.4, 16);
  const flameMat = new THREE.MeshBasicMaterial({
    color: flameColor,
    transparent: true,
    opacity: 0.92,
  });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  // Cone tip points DOWN (-Y) directly underneath the shape's base
  flame.rotation.x = Math.PI;
  const syncFlamePos = () => {
    flame.position.set(
      mesh.position.x,
      Math.max(0.45, mesh.position.y - mesh.userData.landY - 0.65),
      mesh.position.z
    );
  };
  syncFlamePos();
  scene.add(flame);

  animate(flame, {
    scaleY: [0.4, 1.8, 0.2],
    scaleX: [1.1, 0.75],
    scaleZ: [1.1, 0.75],
    opacity: [0.95, 0],
    duration: durationMs,
    ease: 'outQuad',
    onUpdate: syncFlamePos,
    onComplete: () => {
      scene.remove(flame);
      flameGeo.dispose();
      flameMat.dispose();
    },
  });
}

/**
 * Spawns a brief space-altitude halo ring when a shape initiates de-orbit landing.
 */
function spawnSpacePulseRing(mesh, colorHex) {
  const ringGeo = new THREE.RingGeometry(0.9, 1.15, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(mesh.position);
  scene.add(ring);

  animate(ring, {
    scale: [0.8, 2.8],
    opacity: [0.9, 0],
    duration: 500,
    ease: 'outExpo',
    onComplete: () => {
      scene.remove(ring);
      ringGeo.dispose();
      ringMat.dispose();
    },
  });
}

function resolveEase(name) {
  if (name === 'spring') return createSpring({ mass: 1, stiffness: 140, damping: 14 });
  return name;
}

/**
 * Updates the floating HTML pill UI above a shape to reflect its current state.
 */
function syncShapePill(mesh) {
  const { state, pillBtn } = mesh.userData;
  if (state === 'landed') {
    pillBtn.textContent = '🚀 Launch';
    pillBtn.className = 'shape-pill-btn mode-launch';
    pillBtn.disabled = false;
  } else if (state === 'in_space') {
    pillBtn.textContent = '🛬 Land';
    pillBtn.className = 'shape-pill-btn mode-land';
    pillBtn.disabled = false;
  } else if (state === 'launching') {
    pillBtn.textContent = 'Launching…';
    pillBtn.className = 'shape-pill-btn mode-busy';
    pillBtn.disabled = true;
  } else {
    pillBtn.textContent = 'Landing…';
    pillBtn.className = 'shape-pill-btn mode-busy';
    pillBtn.disabled = true;
  }
}

/**
 * Deliberate Push-Off Launch Timeline for a single shape (Runway -> Space).
 * Uses `.cancel()` (NEVER `.revert()`) before starting so position is never reset!
 */
function launchShape(mesh, delayMs = 0) {
  if (mesh.userData.state !== 'landed') return;
  if (mesh.userData.activeAnim) mesh.userData.activeAnim.cancel();

  mesh.userData.state = 'launching';
  syncShapePill(mesh);

  const { x, z, landY, idx } = mesh.userData;
  const targetSpaceY = params.dropAltitude + (idx % 3) * 1.4;
  const startDegY = THREE.MathUtils.radToDeg(mesh.rotation.y) % 360;

  const tl = createTimeline({ delay: delayMs });
  tl.add(mesh, {
    // Phase 1: Deliberate pre-ignition squat/compression on the runway
    scaleY: [1, 0.72],
    scaleX: [1, 1.18],
    scaleZ: [1, 1.18],
    duration: 260,
    ease: 'inQuad',
  })
    .call(() => {
      spawnShockwave(x, z, 0xf97316, 5.2);
      spawnTrackingThruster(mesh, 0xf97316, 750);
    })
    .add(mesh, {
      // Phase 2: Push-off ignition & upright ascent into space
      y: [landY, targetSpaceY],
      scaleY: [0.72, 1.15, 1],
      scaleX: [1.18, 0.88, 1],
      scaleZ: [1.18, 0.88, 1],
      rotateY: [startDegY, startDegY + 360],
      duration: params.launchDurationMs,
      ease: 'inOutExpo',
      onComplete: () => {
        mesh.userData.state = 'in_space';
        syncShapePill(mesh);
      },
    });

  mesh.userData.activeAnim = tl;
}

/**
 * Deliberate 3-Stage Space-to-Runway Landing Timeline (Space -> Runway):
 *   1. De-Orbit Initiation (space halo pulse + upright alignment + initial drop)
 *   2. Controlled Atmospheric Descent (to retro-burn altitude `landY + 3.2`)
 *   3. Retro-Braking Thrusters Firing + Final Touchdown + Runway Shockwave
 */
function landShape(mesh, delayMs = 0) {
  if (mesh.userData.state !== 'in_space') return;
  // CRITICAL: Use .cancel() NOT .revert() so mesh stays at its space altitude!
  if (mesh.userData.activeAnim) mesh.userData.activeAnim.cancel();

  mesh.userData.state = 'landing';
  syncShapePill(mesh);

  const { x, z, landY, color } = mesh.userData;
  const startY = mesh.position.y;
  const brakeY = Math.min(startY - 1.5, landY + 3.2);
  const startDegY = THREE.MathUtils.radToDeg(mesh.rotation.y) % 360;

  const tl = createTimeline({ delay: delayMs });

  // Stage 1: Starting Landing Sequence (De-Orbit Pulse & Initial Nudge)
  tl.call(() => {
    spawnSpacePulseRing(mesh, 0x38bdf8);
  })
    .add(mesh, {
      y: [startY, startY - 0.8],
      scaleX: [1, 0.94],
      scaleY: [1, 1.08],
      scaleZ: [1, 0.94],
      rotateY: [startDegY, startDegY + 60],
      duration: 280,
      ease: 'inQuad',
    })
    // Stage 2: Atmospheric Descent down to Retro-Burn Altitude
    .add(mesh, {
      y: [startY - 0.8, brakeY],
      rotateY: [startDegY + 60, startDegY + 260],
      duration: Math.round(params.landDurationMs * 0.55),
      ease: 'inQuad',
    })
    // Stage 3: Final Retro-Thrusters Firing -> Touchdown -> Suspension Cushion
    .call(() => {
      spawnTrackingThruster(mesh, 0x38bdf8, 650);
    })
    .add(mesh, {
      y: [brakeY, landY],
      scaleX: [0.94, 1],
      scaleY: [1.08, 1],
      scaleZ: [0.94, 1],
      rotateY: [startDegY + 260, startDegY + 360],
      duration: Math.round(params.landDurationMs * 0.45),
      ease: resolveEase(params.landingEase),
    })
    .call(() => {
      spawnShockwave(x, z, color, 4.6);
    })
    .add(mesh, {
      scaleY: [1, 0.82, 1],
      scaleX: [1, 1.12, 1],
      scaleZ: [1, 1.12, 1],
      duration: 260,
      ease: 'outQuad',
      onComplete: () => {
        mesh.userData.state = 'landed';
        syncShapePill(mesh);
      },
    });

  mesh.userData.activeAnim = tl;
}

// Build shapes + floating HTML pills
SHAPE_SPECS.forEach((spec, idx) => {
  const mat = new THREE.MeshStandardMaterial({
    color: spec.color,
    emissive: spec.color,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.75,
  });
  const mesh = new THREE.Mesh(spec.geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(spec.x, spec.landY, spec.z);

  // Create floating pill DOM element
  const pillEl = document.createElement('div');
  pillEl.className = 'shape-pill';
  pillEl.innerHTML = `<span class="shape-pill-name">${spec.name}</span><button class="shape-pill-btn mode-launch" type="button">🚀 Launch</button>`;
  const pillBtn = pillEl.querySelector('button');
  pillsLayer.appendChild(pillEl);

  mesh.userData = {
    ...spec,
    idx,
    state: 'landed', // Starts landed on runway
    activeAnim: null,
    pillEl,
    pillBtn,
  };

  pillBtn.addEventListener('click', () => {
    if (mesh.userData.state === 'landed') launchShape(mesh);
    else if (mesh.userData.state === 'in_space') landShape(mesh);
  });

  scene.add(mesh);
  landers.push(mesh);
  landerMaterials.push(mat);
});

function launchAll() {
  landers.forEach((m, i) => launchShape(m, i * params.staggerMs));
}

function landAll() {
  landers.forEach((m, i) => landShape(m, i * params.staggerMs));
}

// -----------------------------------------------------------------------------
// 4. RUNWAY MANNEQUIN WITH LIVE WEBCAM / PHOTO TEXTURE
// -----------------------------------------------------------------------------
const mannequinGroup = new THREE.Group();
mannequinGroup.position.set(7.5, 0, 4);
mannequinGroup.rotation.y = -Math.PI / 4;
scene.add(mannequinGroup);

const suitMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.25 });
const headPhotoMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.1 });

const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 1.3, 16), suitMat);
torso.position.y = 1.55;
torso.castShadow = true;
mannequinGroup.add(torso);

[-0.2, 0.2].forEach((lx) => {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.95, 12), suitMat);
  leg.position.set(lx, 0.48, 0);
  leg.castShadow = true;
  mannequinGroup.add(leg);
});

[-0.56, 0.56].forEach((ax) => {
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.95, 12), suitMat);
  arm.position.set(ax, 1.6, 0);
  arm.rotation.z = ax < 0 ? 0.18 : -0.18;
  arm.castShadow = true;
  mannequinGroup.add(arm);
});

const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), headPhotoMat);
headMesh.position.y = 2.62;
headMesh.castShadow = true;
mannequinGroup.add(headMesh);

const textureLoader = new THREE.TextureLoader();

function applyPhotoTexture(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  if (headPhotoMat.map) headPhotoMat.map.dispose();
  headPhotoMat.map = tex;
  headPhotoMat.color.setHex(0xffffff);
  headPhotoMat.needsUpdate = true;
}

photoUpload.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  textureLoader.load(url, (tex) => {
    applyPhotoTexture(tex);
    URL.revokeObjectURL(url);
  });
});

async function captureWebcamSelfie() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((r) => setTimeout(r, 450));

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = 512;
    snapCanvas.height = 512;
    const ctx = snapCanvas.getContext('2d');
    ctx.translate(512, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, 512, 512);
    stream.getTracks().forEach((t) => t.stop());

    applyPhotoTexture(new THREE.CanvasTexture(snapCanvas));
  } catch (err) {
    alert(`Webcam access unavailable or denied: ${err.message}`);
  }
}

btnWebcam.onclick = captureWebcamSelfie;

// -----------------------------------------------------------------------------
// 5. DAY / NIGHT SKYBOX & LIGHTING SWITCHER
// -----------------------------------------------------------------------------
function applySkyMode(mode) {
  params.skyMode = mode;
  const isDay = mode === 'Day';

  scene.background = isDay ? skyboxes.dayTex : skyboxes.nightTex;
  scene.environment = isDay ? skyboxes.dayEnv : skyboxes.nightEnv;
  scene.fog = new THREE.FogExp2(isDay ? '#93c5fd' : '#030712', isDay ? 0.008 : 0.015);

  hemiLight.color.set(isDay ? 0xe0f2fe : 0x60a5fa);
  hemiLight.groundColor.set(isDay ? 0x64748b : 0x020617);
  hemiLight.intensity = isDay ? 1.15 : 0.45;

  sunLight.color.set(isDay ? 0xfffbeb : 0x93c5fd);
  sunLight.intensity = isDay ? 2.6 : 0.85;
  sunLight.position.set(isDay ? 20 : -14, isDay ? 28 : 22, isDay ? 14 : -10);

  runway.setDayNight(isDay);
  landerMaterials.forEach((m) => {
    m.emissiveIntensity = isDay ? 0.08 : 0.55;
  });

  skyBadge.textContent = isDay ? 'DAY SKYBOX' : 'NIGHT SKYBOX';
  btnToggleSky.textContent = isDay ? '🌙 Switch to Night' : '☀ Switch to Day';
}

// -----------------------------------------------------------------------------
// 6. LIL-GUI CONTROLS
// -----------------------------------------------------------------------------
const gui = new GUI({ title: 'Spaceport Controls' });

const skyFolder = gui.addFolder('Sky & Lighting');
skyFolder.add(params, 'skyMode', ['Night', 'Day']).name('Skybox').listen().onChange(applySkyMode);
skyFolder.add(params, 'exposure', 0.4, 2.0, 0.05).onChange((v) => (renderer.toneMappingExposure = v));
skyFolder.add(params, 'autoOrbit').name('Auto-Orbit Camera').onChange((v) => (controls.autoRotate = v));
skyFolder.add(params, 'pulseBeacons').name('Pulse Beacons');

const launchFolder = gui.addFolder('Launch & Land (Separate)');
launchFolder.add(params, 'dropAltitude', 10, 35, 1).name('Space Altitude');
launchFolder.add(params, 'launchDurationMs', 500, 3000, 100).name('Launch (ms)');
launchFolder.add(params, 'landDurationMs', 600, 4000, 100).name('Land (ms)');
launchFolder.add(params, 'staggerMs', 0, 500, 20).name('Stagger (ms)');
launchFolder.add(params, 'landingEase', ['outBounce', 'outExpo', 'spring']).name('Landing Ease');
launchFolder.add({ launchAll }, 'launchAll').name('🚀 Launch All');
launchFolder.add({ landAll }, 'landAll').name('🛬 Land All');

const matFolder = gui.addFolder('Shape PBR Materials');
matFolder.add(params, 'roughness', 0, 1, 0.01).onChange((v) => landerMaterials.forEach((m) => (m.roughness = v)));
matFolder.add(params, 'metalness', 0, 1, 0.01).onChange((v) => landerMaterials.forEach((m) => (m.metalness = v)));
matFolder.add(params, 'wireframe').onChange((v) => landerMaterials.forEach((m) => (m.wireframe = v)));

const mannequinFolder = gui.addFolder('Mannequin Photo');
mannequinFolder.add({ selfie: captureWebcamSelfie }, 'selfie').name('📷 Take Webcam Selfie');

btnLaunchAll.onclick = launchAll;
btnLandAll.onclick = landAll;
btnToggleSky.onclick = () => applySkyMode(params.skyMode === 'Night' ? 'Day' : 'Night');

// -----------------------------------------------------------------------------
// 7. 3D-TO-2D PILL PROJECTION & RENDER LOOP
// -----------------------------------------------------------------------------
const projVec = new THREE.Vector3();

function updateFloatingPills() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  landers.forEach((mesh) => {
    const { pillEl } = mesh.userData;
    projVec.copy(mesh.position);
    projVec.y += 1.45; // Hover directly above top of shape
    projVec.project(camera);

    // Hide if behind camera
    if (projVec.z > 1) {
      pillEl.style.display = 'none';
      return;
    }

    const sx = (projVec.x * 0.5 + 0.5) * w;
    const sy = (-projVec.y * 0.5 + 0.5) * h;

    if (sx < -40 || sx > w + 40) {
      pillEl.style.display = 'none';
      return;
    }

    // Clamp vertically so high-altitude space shapes keep their "Land" pill clickable
    const clampedY = Math.max(88, Math.min(h - 24, sy));
    pillEl.style.display = 'flex';
    pillEl.style.left = `${sx.toFixed(1)}px`;
    pillEl.style.top = `${clampedY.toFixed(1)}px`;
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const elapsed = clock.elapsedTime;
  clock.getDelta();

  controls.update();

  // Gentle zero-G hover bobbing while a shape is parked in space
  landers.forEach((mesh) => {
    if (mesh.userData.state === 'in_space') {
      mesh.rotation.y += 0.008;
    }
  });

  if (params.pulseBeacons && params.skyMode === 'Night') {
    runway.beaconMat.emissiveIntensity = 1.6 + Math.sin(elapsed * 4) * 1.2;
  }

  updateFloatingPills();
  renderer.render(scene, camera);
}

applySkyMode('Night');
tick();
