/**
 * =============================================================================
 * MODULE 05: ADVANCED PORTFOLIO — PMREM ENVIRONMENT, PHYSICAL GLASS & BVH
 * =============================================================================
 * Core Concepts Covered:
 *   1. PMREMGenerator + RoomEnvironment: zero-asset studio IBL (Image-Based Lighting)
 *   2. MeshPhysicalMaterial: transmission (refraction), thickness, ior, clearcoat
 *   3. three-mesh-bvh: accelerated raycasting on high-poly geometry
 *   4. Portfolio Composition: layered hero centerpiece + floating accents
 * =============================================================================
 */

import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

export const META = {
  title: '5. Advanced Portfolio: Studio IBL, Physical Glass & BVH',
  description:
    'Combines PMREMGenerator + RoomEnvironment studio lighting, MeshPhysicalMaterial refractive glass, and three-mesh-bvh accelerated geometry.',
  hints: 'Orbit around the refractive glass centerpiece • Tweak IOR & Transmission in lil-gui',
};

export function init({ THREE, scene, renderer, gui }) {
  // Patch Three.js Mesh/BufferGeometry with BVH acceleration
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;

  // 1. STUDIO IBL ENVIRONMENT (PMREMGenerator + RoomEnvironment)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.background = new THREE.Color('#090b10');

  // 2. PHYSICAL GLASS HERO MESH
  const heroGeo = new THREE.TorusKnotGeometry(1.1, 0.35, 200, 36);
  heroGeo.computeBoundsTree(); // Build BVH for fast raycasting

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.95, // Physical refraction
    thickness: 1.2,
    ior: 1.5,           // Index of Refraction (1.5 = glass)
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  const heroMesh = new THREE.Mesh(heroGeo, glassMat);
  scene.add(heroMesh);

  // Inner glowing core visible through the refractive glass
  const innerCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    })
  );
  scene.add(innerCore);

  // 3. LIL-GUI CONTROLS
  gui.add(glassMat, 'transmission', 0, 1, 0.01);
  gui.add(glassMat, 'ior', 1.0, 2.33, 0.01).name('IOR (Refraction)');
  gui.add(glassMat, 'roughness', 0, 0.5, 0.01);
  gui.add(glassMat, 'thickness', 0, 3, 0.05);

  return {
    update(elapsed, delta) {
      heroMesh.rotation.y += delta * 0.3;
      heroMesh.rotation.x = Math.sin(elapsed * 0.5) * 0.15;
      innerCore.rotation.y -= delta * 0.8;
      innerCore.rotation.z += delta * 0.5;
    },
    dispose() {
      heroGeo.disposeBoundsTree();
      envRT.dispose();
      pmrem.dispose();
    },
  };
}
