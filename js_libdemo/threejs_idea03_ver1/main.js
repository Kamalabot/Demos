/**
 * =============================================================================
 * THREE.JS + ANIME.JS + LIL-GUI — RUNWAY TAXI LAUNCH & LANDING (ver1/main.js)
 * =============================================================================
 * Version 1 Enhancements:
 *   - Shapes remain parked at their exact central runway coordinates (`z = -12..+12`).
 *   - Runway extends symmetrically on both sides (`z = -60..+60`).
 *   - Launch Sequence:
 *       1. Taxi Acceleration Roll forward along the runway (`z -> z - taxiDistance`)
 *       2. Nose-up Liftoff Pitch + Push-Off Blast Ring + Tracking Thruster Flame
 *       3. Climb into space orbit & level off (`in_space`)
 *   - Landing Sequence:
 *       1. De-Orbit Initiation & Diagonal Approach toward extended runway (`z + taxiDistance`)
 *       2. Retro-Braking Thrusters Firing -> Runway Touchdown + Shockwave Ring
 *       3. Deceleration Taxi Rollout back to the shape's exact parked coordinate!
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

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(24, 14, 30);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.target.set(0, 1.5, 0);

// -----------------------------------------------------------------------------
// 2. SKYBOXES, LIGHTING & EXTENDED RUNWAY
// -----------------------------------------------------------------------------
const skyboxes = createSkyboxManager(renderer);
const runway = createRunway(scene);

const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.6);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0x93c5fd, 1.1);
sunLight.position.set(24, 34, 18);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -65;
sunLight.shadow.camera.right = 65;
sunLight.shadow.camera.top = 65;
sunLight.shadow.camera.bottom = -65;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

// -----------------------------------------------------------------------------
// 3. SPACE LANDER SHAPES (KEPT AT EXACT ORIGINAL POSITIONS)
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
  dropAltitude: 16,
  taxiDistance: 22,
  taxiDurationMs: 950,
  launchDurationMs: 1100,
  landDurationMs: 1400,
  staggerMs: 140,
  landingEase: 'outCubic',
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

function spawnTrackingThruster(mesh, flameColor = 0xf97316, durationMs = 700) {
  const flameGeo = new THREE.ConeGeometry(0.42, 1.4, 16);
  const flameMat = new THREE.MeshBasicMaterial({
    color: flameColor,
    transparent: true,
    opacity: 0.92,
  });
  const flame = new THREE.Mesh(flameGeo, flameMat);
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

function syncShapePill(mesh) {
  const { state, pillBtn } = mesh.userData;
  if (state === 'landed') {
    pillBtn.textContent = '🚀 Taxi & Launch';
    pillBtn.className = 'shape-pill-btn mode-launch';
    pillBtn.disabled = false;
  } else if (state === 'in_space') {
    pillBtn.textContent = '🛬 Land & Taxi';
    pillBtn.className = 'shape-pill-btn mode-land';
    pillBtn.disabled = false;
  } else if (state === 'launching') {
    pillBtn.textContent = 'Taxi / Takeoff…';
    pillBtn.className = 'shape-pill-btn mode-busy';
    pillBtn.disabled = true;
  } else {
    pillBtn.textContent = 'Landing / Taxi…';
    pillBtn.className = 'shape-pill-btn mode-busy';
    pillBtn.disabled = true;
  }
}

/**
 * 3-Stage Runway Taxi + Space Takeoff:
 *   1. Runway Taxi Roll forward (`z -> z - taxiDistance`) with nose-up rotation prep
 *   2. Liftoff Shockwave + Tracking Thrusters + Diagonal Climb into Space
 *   3. Level off in Orbit (`in_space`)
 */
function launchShape(mesh, delayMs = 0) {
  if (mesh.userData.state !== 'landed') return;
  if (mesh.userData.activeAnim) mesh.userData.activeAnim.cancel();

  mesh.userData.state = 'launching';
  syncShapePill(mesh);

  const { x, z, landY, idx } = mesh.userData;
  const takeoffZ = z - params.taxiDistance;
  const spaceZ = takeoffZ - 12;
  const targetSpaceY = params.dropAltitude + (idx % 3) * 1.4;
  const startDegY = THREE.MathUtils.radToDeg(mesh.rotation.y) % 360;

  const tl = createTimeline({ delay: delayMs });

  // Stage 1: Taxi Roll Acceleration along the extended runway (-Z)
  tl.add(mesh, {
    z: [z, takeoffZ],
    rotateX: [0, -10],
    duration: params.taxiDurationMs,
    ease: 'inQuad',
  })
    // Stage 2: Liftoff Ignition & Diagonal Climb to Space
    .call(() => {
      spawnShockwave(x, takeoffZ, 0xf97316, 4.8);
      spawnTrackingThruster(mesh, 0xf97316, 800);
    })
    .add(mesh, {
      y: [landY, targetSpaceY],
      z: [takeoffZ, spaceZ],
      rotateX: [-10, 0],
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
 * 4-Stage Space Re-Entry + Touchdown + Runway Taxi Rollout to Stop:
 *   1. De-Orbit Initiation & Space Pulse
 *   2. Diagonal Approach toward the +Z Touchdown Zone (`z + taxiDistance`)
 *   3. Retro-Braking Thrusters + Runway Touchdown + Shockwave
 *   4. Deceleration Taxi Rollout (`z + taxiDistance -> z`) back to parked slot!
 */
function landShape(mesh, delayMs = 0) {
  if (mesh.userData.state !== 'in_space') return;
  if (mesh.userData.activeAnim) mesh.userData.activeAnim.cancel();

  mesh.userData.state = 'landing';
  syncShapePill(mesh);

  const { x, z, landY, color } = mesh.userData;
  const startY = mesh.position.y;
  const startZ = mesh.position.z;
  const touchdownZ = z - params.taxiDistance;
  const approachMidZ = (startZ + touchdownZ) * 0.5;
  const brakeY = Math.min(startY - 1.5, landY + 3.2);
  const startDegY = THREE.MathUtils.radToDeg(mesh.rotation.y) % 360;

  const tl = createTimeline({ delay: delayMs });

  // Stage 1: De-Orbit Initiation
  tl.call(() => {
    spawnSpacePulseRing(mesh, 0x38bdf8);
  })
    .add(mesh, {
      y: [startY, startY - 0.8],
      rotateX: [0, -8],
      duration: 260,
      ease: 'inQuad',
    })
    // Stage 2: Controlled Atmospheric Approach toward Touchdown Zone
    .add(mesh, {
      y: [startY - 0.8, brakeY],
      z: [startZ, approachMidZ],
      rotateY: [startDegY, startDegY + 240],
      duration: Math.round(params.landDurationMs * 0.55),
      ease: 'inQuad',
    })
    // Stage 3: Retro-Burn & Touchdown on the Extended +Z Runway
    .call(() => {
      spawnTrackingThruster(mesh, 0x38bdf8, 650);
    })
    .add(mesh, {
      y: [brakeY, landY],
      z: [approachMidZ, touchdownZ],
      rotateX: [-8, 0],
      rotateY: [startDegY + 240, startDegY + 360],
      duration: Math.round(params.landDurationMs * 0.45),
      ease: resolveEase(params.landingEase),
    })
    // Stage 4: Touchdown Shockwave + Taxi Rollout Back to Original Parked Slot
    .call(() => {
      spawnShockwave(x, touchdownZ, color, 4.4);
    })
    .add(mesh, {
      z: [touchdownZ, z],
      duration: params.taxiDurationMs,
      ease: 'outCubic',
      onComplete: () => {
        mesh.userData.state = 'landed';
        syncShapePill(mesh);
      },
    });

  mesh.userData.activeAnim = tl;
}

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

  const pillEl = document.createElement('div');
  pillEl.className = 'shape-pill';
  pillEl.innerHTML = `<span class="shape-pill-name">${spec.name}</span><button class="shape-pill-btn mode-launch" type="button">🚀 Taxi & Launch</button>`;
  const pillBtn = pillEl.querySelector('button');
  pillsLayer.appendChild(pillEl);

  mesh.userData = {
    ...spec,
    idx,
    state: 'landed',
    activeAnim: null,
    pillEl,
    pillBtn,
    isPillHovered: false,
  };

  pillEl.addEventListener('mouseenter', () => {
    mesh.userData.isPillHovered = true;
  });
  pillEl.addEventListener('mouseleave', () => {
    mesh.userData.isPillHovered = false;
  });

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
  const lastIdx = landers.length - 1;
  landers.forEach((m, i) => landShape(m, (lastIdx - i) * params.staggerMs));
}

// -----------------------------------------------------------------------------
// 4. RUNWAY MANNEQUIN WITH LIVE WEBCAM / PHOTO TEXTURE
// -----------------------------------------------------------------------------
const mannequinGroup = new THREE.Group();
mannequinGroup.position.set(8.5, 0, 4);
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
  scene.fog = new THREE.FogExp2(isDay ? '#93c5fd' : '#030712', isDay ? 0.005 : 0.01);

  hemiLight.color.set(isDay ? 0xe0f2fe : 0x60a5fa);
  hemiLight.groundColor.set(isDay ? 0x64748b : 0x020617);
  hemiLight.intensity = isDay ? 1.15 : 0.45;

  sunLight.color.set(isDay ? 0xfffbeb : 0x93c5fd);
  sunLight.intensity = isDay ? 2.6 : 0.85;
  sunLight.position.set(isDay ? 24 : -18, isDay ? 34 : 26, isDay ? 18 : -14);

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
const gui = new GUI({ title: 'Spaceport Controls (Ver 1)' });

const skyFolder = gui.addFolder('Sky & Lighting');
skyFolder.add(params, 'skyMode', ['Night', 'Day']).name('Skybox').listen().onChange(applySkyMode);
skyFolder.add(params, 'exposure', 0.4, 2.0, 0.05).onChange((v) => (renderer.toneMappingExposure = v));
skyFolder.add(params, 'autoOrbit').name('Auto-Orbit Camera').onChange((v) => (controls.autoRotate = v));
skyFolder.add(params, 'pulseBeacons').name('Pulse Beacons');

const launchFolder = gui.addFolder('Runway Taxi, Launch & Land');
launchFolder.add(params, 'taxiDistance', 8, 42, 1).name('Taxi Distance');
launchFolder.add(params, 'taxiDurationMs', 400, 2500, 50).name('Taxi Time (ms)');
launchFolder.add(params, 'dropAltitude', 10, 35, 1).name('Space Altitude');
launchFolder.add(params, 'launchDurationMs', 500, 3000, 100).name('Climb (ms)');
launchFolder.add(params, 'landDurationMs', 600, 4000, 100).name('Approach (ms)');
launchFolder.add(params, 'staggerMs', 0, 500, 20).name('Stagger (ms)');
launchFolder.add(params, 'landingEase', ['outCubic', 'outBounce', 'outExpo', 'spring']).name('Touchdown Ease');
launchFolder.add({ launchAll }, 'launchAll').name('🚀 Taxi & Launch All');
launchFolder.add({ landAll }, 'landAll').name('🛬 Land & Taxi All');

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
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-999, -999);
let hoveredMesh = null;
let stickyHoverMesh = null;
let hoverHideUntil = 0;

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
});

canvas.addEventListener('pointerleave', () => {
  pointer.set(-999, -999);
  hoveredMesh = null;
});

function updateFloatingPills() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(landers, false);
  hoveredMesh = hits.length > 0 ? hits[0].object : null;
  canvas.style.cursor = hoveredMesh ? 'pointer' : 'default';

  const now = performance.now();
  if (hoveredMesh) {
    stickyHoverMesh = hoveredMesh;
    hoverHideUntil = now + 450; // Keep pill visible for 450ms while moving cursor to click it
  } else if (stickyHoverMesh && stickyHoverMesh.userData.isPillHovered) {
    hoverHideUntil = now + 200;
  } else if (now > hoverHideUntil) {
    stickyHoverMesh = null;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;

  landers.forEach((mesh) => {
    const { pillEl, isPillHovered } = mesh.userData;
    const shouldShow = mesh === stickyHoverMesh || isPillHovered;
    pillEl.classList.toggle('is-visible', shouldShow);

    if (!shouldShow) return;

    projVec.copy(mesh.position);
    projVec.y += 1.45;
    projVec.project(camera);

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
