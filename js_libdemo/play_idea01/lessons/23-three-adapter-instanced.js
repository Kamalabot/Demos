/**
 * =============================================================================
 * LESSON 23: THREE.JS ADAPTER — INSTANCEDMESH GRID CHOREOGRAPHY
 * Package: `animejs/adapters/three` (`getInstances`, `commitChanges`)
 * =============================================================================
 * CONCEPT:
 *   Normally animating a Three.js `InstancedMesh` requires manually managing
 *   `Object3D` dummy matrices and `setMatrixAt()` inside `requestAnimationFrame`.
 *
 *   With Anime.js v4.5.0's `getInstances(instancedMesh)`:
 *     1. Each instance ID gets a lightweight proxy object (`isAnimejsInstanceProxy`).
 *     2. You pass `getInstances(mesh)` straight into `animate()` with `stagger()`!
 *     3. `threeAdapter` coalesces dirty writes and hooks `mesh.onBeforeRender` to
 *        flush `instanceMatrix.needsUpdate = true` automatically in 1 draw call!
 * =============================================================================
 */

import * as THREE from 'three';
import { animate, stagger } from 'animejs';
import { getInstances } from 'animejs/adapters/three'; // @core

export const LESSON_META = {
  summary:
    'Animate 36 Three.js InstancedMesh cubes in a single WebGL draw call using getInstances(mesh) + 2D grid stagger()!',
  masteryNote:
    'Writes are queued in a dirty array and flushed once per frame right before WebGL renders via an `onBeforeRender` hook—giving you Anime.js ergonomics with zero-overhead instancing.',
  highlightLines: [[19, 20], [59, 68]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div id="inst-host" style="width:100%; height:260px; border-radius:12px; overflow:hidden; background:#05070d; border:1px solid rgba(148,163,184,0.2);"></div>
    <div class="demo-row">
      <div class="demo-pill">Instances: <strong>36 (6×6 Grid)</strong></div>
      <div class="demo-pill">WebGL Draw Calls: <strong>1</strong></div>
    </div>
  `;

  const host = stage.querySelector('#inst-host');
  const w = host.clientWidth || 440;
  const h = host.clientHeight || 260;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05070d');

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(5.5, 5.5, 6.5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dir = new THREE.DirectionalLight(0x38bdf8, 2.5);
  dir.position.set(4, 8, 5);
  scene.add(dir);

  const COLS = 6;
  const ROWS = 6;
  const COUNT = COLS * ROWS;

  const geo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.65 });
  const instancedMesh = new THREE.InstancedMesh(geo, mat, COUNT);
  scene.add(instancedMesh);

  // Obtain lightweight per-instance proxy array
  const instances = getInstances(instancedMesh); // @core

  // Position instances into a centered 6x6 grid initially
  const dummyColor = new THREE.Color();
  instances.forEach((inst, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    inst.x = (col - (COLS - 1) / 2) * 0.85;
    inst.z = (row - (ROWS - 1) / 2) * 0.85;
    inst.y = 0;
    dummyColor.setHSL(i / COUNT, 0.75, 0.55);
    inst.color = `#${dummyColor.getHexString()}`;
  });

  // Animate all 36 instances with a single Anime.js 2D grid stagger!
  const anim = animate(instances, { // @core
    y: [0, 1.35],
    rotateY: [0, 180],
    scale: [0.7, 1.15],
    duration: 900,
    delay: stagger(75, { grid: [COLS, ROWS], from: 'center' }), // @core
    ease: 'inOutQuad',
    loop: true,
    alternate: true,
  });

  let rafId = 0;
  function renderLoop() {
    rafId = requestAnimationFrame(renderLoop);
    instancedMesh.rotation.y += 0.004;
    renderer.render(scene, camera);
  }
  renderLoop();

  return () => {
    cancelAnimationFrame(rafId);
    anim.revert();
    geo.dispose();
    mat.dispose();
    renderer.dispose();
  };
}
