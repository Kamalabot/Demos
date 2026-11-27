/**
 * =============================================================================
 * LESSON 22: THREE.JS ADAPTER — OBJECT3D, MATERIALS & LIGHTS
 * Package: `animejs/adapters/three` (built into Anime.js v4.5.0!)
 * =============================================================================
 * CONCEPT:
 *   Importing `'animejs/adapters/three'` registers `threeAdapter` globally.
 *   This teaches `animate()` and `createTimeline()` to natively recognize
 *   Three.js `Object3D`, `Material`, `Light`, `Vector3`, `Color`, and `Fog`!
 *
 *   FLAT SHORTHAND PROPERTIES PROVIDED BY THREEADAPTER:
 *     - `x`, `y`, `z`                -> `obj.position.x/y/z`
 *     - `rotateX`, `rotateY`, `rotateZ` -> `obj.rotation` (in DEGREES!)
 *     - `scale`, `scaleX/Y/Z`        -> `obj.scale`
 *     - `color`                      -> `mesh.material.color` or `light.color`
 *     - `intensity`                  -> `light.intensity`
 * =============================================================================
 */

import * as THREE from 'three';
import { createTimeline } from 'animejs';
import 'animejs/adapters/three'; // @core Registers threeAdapter globally!

export const LESSON_META = {
  summary:
    'Import "animejs/adapters/three" so animate() and createTimeline() directly tween Three.js Mesh positions, degree rotations, material colors, and light intensities.',
  masteryNote:
    'Notice `rotateY: 360` uses degrees (not radians!)—`threeAdapter` converts degrees via `degToRad` automatically and maps `color` onto `mesh.material.color`.',
  highlightLines: [[19, 20], [57, 74]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div id="three-host" style="width:100%; height:260px; border-radius:12px; overflow:hidden; background:#05070d; border:1px solid rgba(148,163,184,0.2);"></div>
    <div class="demo-row">
      <div class="demo-pill">Adapter: <strong>animejs/adapters/three</strong></div>
      <div class="demo-pill">Targets: <strong>Mesh + PointLight</strong></div>
    </div>
  `;

  const host = stage.querySelector('#three-host');
  const w = host.clientWidth || 440;
  const h = host.clientHeight || 260;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05070d');

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 1.8, 5.5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const keyLight = new THREE.PointLight(0x38bdf8, 4, 20);
  keyLight.position.set(3, 3, 3);
  scene.add(keyLight);

  const geo = new THREE.TorusKnotGeometry(0.85, 0.28, 96, 24);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff4b4b, roughness: 0.25, metalness: 0.7 });
  const knot = new THREE.Mesh(geo, mat);
  scene.add(knot);

  // Choreograph 3D Mesh + PointLight directly with Anime.js Timeline!
  const tl = createTimeline({ loop: true, alternate: true }); // @core
  tl.add(knot, { // @core
    x: [-1.4, 1.4],
    rotateY: [0, 360], // Degrees! Converted to radians by threeAdapter
    rotateX: [0, 180],
    scale: [0.85, 1.25],
    color: ['#ff4b4b', '#38bdf8'], // @core Tweens knot.material.color
    duration: 2000,
    ease: 'inOutExpo',
  }).add(
    keyLight, // @core
    {
      x: [-3, 3],
      intensity: [2, 8],
      color: ['#38bdf8', '#a855f7'],
      duration: 2000,
      ease: 'inOutSine',
    },
    '<'
  );

  let rafId = 0;
  function renderLoop() {
    rafId = requestAnimationFrame(renderLoop);
    renderer.render(scene, camera);
  }
  renderLoop();

  return () => {
    cancelAnimationFrame(rafId);
    tl.revert();
    geo.dispose();
    mat.dispose();
    renderer.dispose();
  };
}
