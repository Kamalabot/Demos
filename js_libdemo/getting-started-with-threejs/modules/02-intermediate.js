/**
 * =============================================================================
 * MODULE 02: INTERMEDIATE — PROCEDURAL TEXTURES, GROUPS, RAYCASTING & FOG
 * =============================================================================
 * Core Concepts Covered:
 *   1. Procedural CanvasTexture: generating 2D textures in-memory without external assets
 *   2. Group Hierarchies: parent-child transforms (local vs world space)
 *   3. Raycasting (THREE.Raycaster): 2D mouse NDC -> 3D object picking & hover states
 *   4. Atmosphere: THREE.FogExp2 for depth perception
 * =============================================================================
 */

export const META = {
  title: '2. Intermediate: Textures, Groups, Raycasting & Fog',
  description:
    'Generates procedural CanvasTextures, organizes orbiting satellites in a THREE.Group hierarchy, adds exponential fog, and uses Raycaster for interactive hover/click.',
  hints: 'Hover over the orbiting cubes to highlight • Click any cube to pulse it',
};

/**
 * Generates a crisp checkerboard CanvasTexture in memory.
 */
function createCheckerTexture(THREE) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  const tiles = 8;
  const step = size / tiles;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#1e293b' : '#38bdf8';
      ctx.fillRect(x * step, y * step, step, step);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function init({ THREE, scene, camera, gui, canvas }) {
  // 1. ATMOSPHERIC FOG
  scene.fog = new THREE.FogExp2('#0b0d13', 0.055);

  // 2. LIGHTING
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(5, 8, 5);
  keyLight.castShadow = true;
  scene.add(keyLight);

  // 3. GROUP HIERARCHY (Solar-system style parent/child)
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const checkerTex = createCheckerTexture(THREE);
  const coreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.0, 1),
    new THREE.MeshStandardMaterial({
      map: checkerTex,
      roughness: 0.35,
      metalness: 0.4,
    })
  );
  coreMesh.castShadow = true;
  orbitGroup.add(coreMesh);

  // Interactive satellite cubes
  const satellites = [];
  const satGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.4,
      metalness: 0.5,
    });
    const sat = new THREE.Mesh(satGeo, mat);
    sat.position.set(Math.cos(angle) * 3.0, Math.sin(angle * 2) * 0.4, Math.sin(angle) * 3.0);
    sat.userData = { baseColor: 0x94a3b8, pulse: 0 };
    orbitGroup.add(sat);
    satellites.push(sat);
  }

  // 4. RAYCASTER FOR MOUSE PICKING
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-999, -999);
  let hovered = null;

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    // Convert screen pixels to Normalized Device Coordinates (-1 to +1)
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onClick() {
    if (hovered) {
      hovered.userData.pulse = 1.0;
    }
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('click', onClick);

  const params = { orbitSpeed: 0.5, fogDensity: 0.055 };
  gui.add(params, 'orbitSpeed', 0, 2, 0.05);
  gui.add(params, 'fogDensity', 0, 0.15, 0.005).onChange((v) => {
    scene.fog.density = v;
  });

  return {
    update(elapsed, delta) {
      orbitGroup.rotation.y += delta * params.orbitSpeed;
      coreMesh.rotation.x += delta * 0.4;

      // Raycast against satellites
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(satellites, false);

      if (hovered && (!hits.length || hits[0].object !== hovered)) {
        hovered.material.color.setHex(hovered.userData.baseColor);
        hovered = null;
        canvas.style.cursor = 'default';
      }

      if (hits.length > 0) {
        hovered = hits[0].object;
        hovered.material.color.setHex(0xf43f5e);
        canvas.style.cursor = 'pointer';
      }

      // Decay click pulse animation
      for (const sat of satellites) {
        if (sat.userData.pulse > 0) {
          sat.userData.pulse = Math.max(0, sat.userData.pulse - delta * 2.5);
          const s = 1 + Math.sin(sat.userData.pulse * Math.PI) * 0.5;
          sat.scale.setScalar(s);
        }
      }
    },
    dispose() {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('click', onClick);
      canvas.style.cursor = 'default';
    },
  };
}
