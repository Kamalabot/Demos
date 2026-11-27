/**
 * =============================================================================
 * THREE.JS LEARNING PLAYGROUND — CORE ORCHESTRATOR (main.js)
 * =============================================================================
 * This file bootstraps the Three.js WebGL lifecycle and acts as a hot-swappable
 * host for our 6-stage curriculum:
 *   1. 01-basic.js              (Scene, Camera, Renderer, Lights, Shadows, GUI)
 *   2. 02-intermediate.js       (Textures, PBR Maps, Groups, Raycasting, Fog)
 *   3. 03-mastery.js            (InstancedMesh, BufferGeometry, Points, GSAP)
 *   4. 04-fluency.js            (Custom GLSL Shaders, Post-Processing Bloom)
 *   5. 05-advanced-portfolio.js (PMREM Environment, Physical Glass, BVH/Hero)
 *   6. 06-kinetic-portfolio.js  (Kinetic Ground, Proximity Beams, Scroll Story)
 *
 * ARCHITECTURE:
 * - Each module exports an `init(context)` function that returns a lifecycle
 *   object `{ update(elapsed, delta), dispose(), render?(), onResize?() }`.
 * - When switching modules, `main.js` calls `currentModule.dispose()`,
 *   recursively disposes leftover GPU geometries/materials/textures, resets
 *   the camera/controls, and mounts the newly selected module.
 * =============================================================================
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'stats.js';
import GUI from 'lil-gui';

// Import all 6 curriculum modules
import * as modBasic from './modules/01-basic.js';
import * as modIntermediate from './modules/02-intermediate.js';
import * as modMastery from './modules/03-mastery.js';
import * as modFluency from './modules/04-fluency.js';
import * as modStudioGlass from './modules/05-advanced-portfolio.js';
import * as modKineticPortfolio from './modules/06-kinetic-portfolio.js';

const MODULES = {
  '01-basic': modBasic,
  '02-intermediate': modIntermediate,
  '03-mastery': modMastery,
  '04-fluency': modFluency,
  '05-advanced-portfolio': modStudioGlass,
  '06-kinetic-portfolio': modKineticPortfolio,
};

// -----------------------------------------------------------------------------
// 1. DOM REFERENCES
// -----------------------------------------------------------------------------
const canvas = document.getElementById('three-canvas');
const infoTitle = document.getElementById('info-title');
const infoDesc = document.getElementById('info-desc');
const infoHints = document.getElementById('info-hints');
const navButtons = document.querySelectorAll('.mod-btn');

// -----------------------------------------------------------------------------
// 2. CORE THREE.JS SETUP (RENDERER, SCENE, CAMERA, CONTROLS)
// -----------------------------------------------------------------------------

/**
 * WebGLRenderer:
 * - `canvas`: binds to our explicit <canvas id="three-canvas">.
 * - `antialias: true`: smooths jagged polygon edges (MSAA).
 * - `powerPreference: 'high-performance'`: requests discrete GPU on dual-GPU laptops.
 */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});

// Clamp pixelRatio to 2 to avoid 4x/9x fragment shader overhead on 4K/Retina screens
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// Modern color management & physically-based tone mapping
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Enable soft shadow maps globally
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/**
 * Scene:
 * The root container for all 3D objects, lights, and cameras.
 */
const scene = new THREE.Scene();
scene.background = new THREE.Color('#05070d');

/**
 * PerspectiveCamera:
 * - 50° vertical Field of View (natural, minimal distortion).
 * - Aspect ratio matches viewport.
 * - Near = 0.1, Far = 200 (keep near as large as possible to avoid Z-fighting).
 */
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(8, 9, 12);

/**
 * OrbitControls:
 * Provides smooth mouse/touch orbit, zoom, and pan around `controls.target`.
 * `enableDamping = true` adds inertia (requires `controls.update()` every frame).
 */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxDistance = 60;

// -----------------------------------------------------------------------------
// 3. PERFORMANCE MONITORING (stats.js)
// -----------------------------------------------------------------------------
const stats = new Stats();
stats.showPanel(0); // 0: FPS, 1: MS, 2: MB
stats.dom.style.position = 'fixed';
stats.dom.style.top = 'auto';
stats.dom.style.bottom = '16px';
stats.dom.style.right = '16px';
stats.dom.style.left = 'auto';
document.body.appendChild(stats.dom);

// -----------------------------------------------------------------------------
// 4. MODULE LIFECYCLE & GPU MEMORY DISPOSAL
// -----------------------------------------------------------------------------
let activeModule = null;
let gui = null;

/**
 * Recursively disposes all geometries, materials, and textures in the scene
 * so switching between modules never leaks WebGL buffers or textures.
 */
function clearSceneAndGUI() {
  if (activeModule && typeof activeModule.dispose === 'function') {
    activeModule.dispose();
  }
  activeModule = null;

  if (gui) {
    gui.destroy();
    gui = null;
  }

  // Traverse and dispose remaining scene children
  while (scene.children.length > 0) {
    const obj = scene.children[0];
    scene.remove(obj);

    obj.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const mat of materials) {
          // Dispose any textures attached to material properties
          for (const key of Object.keys(mat)) {
            const val = mat[key];
            if (val && typeof val === 'object' && val.isTexture) {
              val.dispose();
            }
          }
          mat.dispose();
        }
      }
    });
  }

  // Reset scene environment, fog, and background defaults
  scene.fog = null;
  scene.environment = null;
  scene.background = new THREE.Color('#05070d');
  renderer.toneMappingExposure = 1.0;
  controls.enabled = true;
}

/**
 * Loads a curriculum module by key, creates a fresh lil-gui instance,
 * and updates the HUD info card.
 */
function loadModule(moduleKey) {
  const mod = MODULES[moduleKey];
  if (!mod) {
    console.error(`[main.js] Unknown module key: ${moduleKey}`);
    return;
  }

  clearSceneAndGUI();

  // Reset camera & controls to clean defaults
  camera.position.set(8, 9, 12);
  controls.target.set(0, 0, 0);
  controls.update();

  // Create a fresh lil-gui panel for the new module
  gui = new GUI({ title: `Controls — ${moduleKey}` });
  gui.domElement.style.top = '72px';

  // Initialize the module with shared context
  try {
    activeModule = mod.init({
      THREE,
      scene,
      camera,
      renderer,
      controls,
      gui,
      canvas,
    });

    // Update HUD text
    infoTitle.textContent = mod.META?.title || moduleKey;
    infoDesc.textContent = mod.META?.description || '';
    infoHints.textContent = mod.META?.hints || 'Drag to orbit • Scroll to zoom • Right-click to pan';
  } catch (err) {
    console.error(`[main.js] Failed to initialize ${moduleKey}:`, err);
    infoTitle.textContent = 'Module Error';
    infoDesc.textContent = err.message;
  }
}

// Wire up HUD navigation buttons
navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    navButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    loadModule(btn.dataset.module);
  });
});

// -----------------------------------------------------------------------------
// 5. RESPONSIVE RESIZE HANDLER
// -----------------------------------------------------------------------------
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (activeModule && typeof activeModule.onResize === 'function') {
    activeModule.onResize(width, height);
  }
});

// -----------------------------------------------------------------------------
// 6. DETERMINISTIC ANIMATION LOOP
// -----------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  stats.begin();

  // Clamp delta to 50ms max so tab-switching doesn't cause huge simulation jumps
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (controls.enabled) {
    controls.update();
  }

  if (activeModule && typeof activeModule.update === 'function') {
    activeModule.update(elapsed, delta);
  }

  // Allow modules with custom post-processing (EffectComposer) to override render
  if (activeModule && typeof activeModule.render === 'function') {
    activeModule.render();
  } else {
    renderer.render(scene, camera);
  }

  stats.end();
}

// Boot directly into Module 6 (Advanced Kinetic Portfolio) as requested
loadModule('06-kinetic-portfolio');
animate();
