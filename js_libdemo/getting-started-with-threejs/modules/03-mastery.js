/**
 * =============================================================================
 * MODULE 03: MASTERY — INSTANCEDMESH, BUFFERGEOMETRY, POINTS & GSAP
 * =============================================================================
 * Core Concepts Covered:
 *   1. THREE.InstancedMesh: render 1,000+ meshes in a SINGLE WebGL draw call
 *   2. THREE.Object3D dummy matrix helper: compose position/rotation/scale -> setMatrixAt()
 *   3. THREE.Points + BufferGeometry: GPU particle cloud with vertex colors
 *   4. GSAP Choreography: smooth camera & object timeline animations
 * =============================================================================
 */

import gsap from 'gsap';

export const META = {
  title: '3. Mastery: InstancedMesh, Particles & GSAP',
  description:
    'Renders 1,000 animated cubes in 1 draw call using InstancedMesh, builds a custom BufferGeometry particle field, and choreographs camera/scale transitions with GSAP.',
  hints: 'Use lil-gui "Trigger GSAP Wave" to animate the camera & instances',
};

export function init({ THREE, scene, camera, gui }) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  // 1. INSTANCED MESH (1,000 cubes in 1 draw call)
  const COUNT = 1000;
  const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.7 });
  const instanced = new THREE.InstancedMesh(geo, mat, COUNT);
  scene.add(instanced);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const gridDim = 10; // 10 x 10 x 10 = 1000

  // Assign per-instance colors once
  for (let i = 0; i < COUNT; i++) {
    color.setHSL(i / COUNT, 0.75, 0.55);
    instanced.setColorAt(i, color);
  }
  instanced.instanceColor.needsUpdate = true;

  // 2. CUSTOM BUFFERGEOMETRY PARTICLE CLOUD (THREE.Points)
  const PARTICLE_COUNT = 2000;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const pColors = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = 6 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    pColors[i * 3] = 0.22;
    pColors[i * 3 + 1] = 0.74;
    pColors[i * 3 + 2] = 0.97;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // 3. GSAP CHOREOGRAPHY
  const animState = { spread: 0.45 };
  const actions = {
    triggerGSAP() {
      gsap.fromTo(
        animState,
        { spread: 0.45 },
        { spread: 0.85, duration: 0.9, yoyo: true, repeat: 1, ease: 'power2.inOut' }
      );
      gsap.to(camera.position, {
        x: (Math.random() - 0.5) * 10,
        y: 2 + Math.random() * 4,
        z: 6 + Math.random() * 3,
        duration: 1.4,
        ease: 'power3.out',
      });
    },
  };

  gui.add(animState, 'spread', 0.25, 1.0, 0.01);
  gui.add(actions, 'triggerGSAP').name('Trigger GSAP Wave');

  return {
    update(elapsed, delta) {
      particles.rotation.y += delta * 0.05;

      let idx = 0;
      const offset = (gridDim - 1) * 0.5;
      for (let x = 0; x < gridDim; x++) {
        for (let y = 0; y < gridDim; y++) {
          for (let z = 0; z < gridDim; z++) {
            const wave = Math.sin(elapsed * 2 + x * 0.5 + y * 0.5 + z * 0.5);
            dummy.position.set(
              (x - offset) * animState.spread,
              (y - offset) * animState.spread + wave * 0.12,
              (z - offset) * animState.spread
            );
            dummy.rotation.set(elapsed * 0.4 + x * 0.1, elapsed * 0.5 + y * 0.1, 0);
            dummy.updateMatrix();
            instanced.setMatrixAt(idx++, dummy.matrix);
          }
        }
      }
      instanced.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      gsap.killTweensOf(animState);
      gsap.killTweensOf(camera.position);
    },
  };
}
