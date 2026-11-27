/**
 * =============================================================================
 * MODULE 01: BASIC — SCENE GRAPH, GEOMETRIES, MATERIALS, LIGHTS & SHADOWS
 * =============================================================================
 * Core Concepts Covered:
 *   1. Built-in Geometries: BoxGeometry, SphereGeometry, TorusKnotGeometry, PlaneGeometry
 *   2. Materials: MeshStandardMaterial (PBR) vs MeshBasicMaterial (unlit)
 *   3. Lighting: AmbientLight (global fill) + DirectionalLight (sunlight + shadows)
 *   4. Shadow Mapping: castShadow, receiveShadow, shadow.mapSize, shadow.camera
 *   5. Helpers: GridHelper, AxesHelper, DirectionalLightHelper
 *   6. Live Debugging: lil-gui bindings for roughness, metalness, color, & rotation
 * =============================================================================
 */

export const META = {
  title: '1. Basic: Geometries, PBR Materials & Shadows',
  description:
    'Learn the foundational Three.js triad (Scene, Camera, Renderer), built-in geometries, Physically Based Rendering (PBR) materials, directional shadows, and lil-gui.',
  hints: 'Drag to orbit • Scroll to zoom • Use top-right lil-gui to tweak PBR & lights',
};

export function init({ THREE, scene, gui }) {
  // 1. HELPERS: Visualize world origin (X=Red, Y=Green, Z=Blue) and ground grid
  const grid = new THREE.GridHelper(12, 12, 0x38bdf8, 0x1e293b);
  scene.add(grid);

  const axes = new THREE.AxesHelper(2);
  scene.add(axes);

  // 2. GROUND PLANE (receives shadows)
  const floorGeo = new THREE.PlaneGeometry(12, 12);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.85,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2; // Rotate flat onto XZ plane
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);

  // 3. HERO MESHES (cast & receive shadows)
  const sharedMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.3,
    metalness: 0.6,
  });

  // Box
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), sharedMat);
  box.position.set(-2.2, 0.8, 0);
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);

  // TorusKnot (centerpiece)
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.65, 0.22, 128, 32),
    sharedMat
  );
  knot.position.set(0, 1.1, 0);
  knot.castShadow = true;
  knot.receiveShadow = true;
  scene.add(knot);

  // Sphere
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 32), sharedMat);
  sphere.position.set(2.2, 0.85, 0);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);

  // 4. LIGHTING
  // AmbientLight: uniform, shadowless fill so dark sides aren't pitch black
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  // DirectionalLight: parallel rays like the sun; capable of casting shadows
  const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
  dirLight.position.set(4, 6, 4);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024); // Higher = sharper shadows, more VRAM
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 20;
  dirLight.shadow.bias = -0.0005; // Prevents shadow acne
  scene.add(dirLight);

  // 5. LIL-GUI CONTROLS
  const params = {
    color: '#38bdf8',
    roughness: 0.3,
    metalness: 0.6,
    wireframe: false,
    rotationSpeed: 0.8,
  };

  const matFolder = gui.addFolder('PBR Material');
  matFolder.addColor(params, 'color').onChange((v) => sharedMat.color.set(v));
  matFolder.add(params, 'roughness', 0, 1, 0.01).onChange((v) => (sharedMat.roughness = v));
  matFolder.add(params, 'metalness', 0, 1, 0.01).onChange((v) => (sharedMat.metalness = v));
  matFolder.add(params, 'wireframe').onChange((v) => (sharedMat.wireframe = v));

  const animFolder = gui.addFolder('Animation');
  animFolder.add(params, 'rotationSpeed', 0, 3, 0.05);

  return {
    update(elapsed, delta) {
      const step = delta * params.rotationSpeed;
      box.rotation.x += step * 0.6;
      box.rotation.y += step;
      knot.rotation.y += step * 0.8;
      knot.rotation.z += step * 0.3;
      sphere.position.y = 0.85 + Math.sin(elapsed * 2) * 0.15;
    },
    dispose() {
      // Scene traversal in main.js handles geometry/material disposal
    },
  };
}
