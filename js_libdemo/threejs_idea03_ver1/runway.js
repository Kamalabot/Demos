/**
 * =============================================================================
 * EXTENDED DUAL-END SPACEPORT RUNWAY (threejs_idea03_ver1/runway.js)
 * =============================================================================
 * Extends the runway symmetrically along both -Z and +Z sides (`length = 120`,
 * `z` from `-60` to `+60`) so parked shapes in the center (`z = -12..+12`)
 * have ample tarmac on both ends for:
 *   - Forward taxi roll before takeoff (-Z direction)
 *   - Touchdown & deceleration taxi rollout on landing (+Z -> parked Z)
 * =============================================================================
 */

import * as THREE from 'three';

function createExtendedRunwayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Dark asphalt base
  ctx.fillStyle = '#141820';
  ctx.fillRect(0, 0, 512, 2048);

  // Subtle asphalt grain
  for (let i = 0; i < 8000; i++) {
    const shade = 16 + Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 6})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 2048, 2, 2);
  }

  // Side edge stripes
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(26, 0, 10, 2048);
  ctx.fillRect(476, 0, 10, 2048);

  // Dashed yellow centerline running full extended length
  ctx.fillStyle = '#fbbf24';
  for (let y = 160; y < 1888; y += 90) {
    ctx.fillRect(250, y, 12, 50);
  }

  // Dual-end threshold piano-key markings (both -Z and +Z runway ends)
  ctx.fillStyle = '#f8fafc';
  for (let x = 66; x <= 186; x += 28) {
    // North end (-Z)
    ctx.fillRect(x, 36, 14, 100);
    ctx.fillRect(512 - x - 14, 36, 14, 100);
    // South end (+Z)
    ctx.fillRect(x, 1912, 14, 100);
    ctx.fillRect(512 - x - 14, 1912, 14, 100);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createRunway(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Expanded surrounding ground apron
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.92,
    metalness: 0.05,
  });
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), apronMat);
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.02;
  apron.receiveShadow = true;
  group.add(apron);

  // Extended Runway Strip (12 wide x 120 long -> -60 to +60 on Z)
  const runwayTex = createExtendedRunwayTexture();
  const runwayMat = new THREE.MeshStandardMaterial({
    map: runwayTex,
    roughness: 0.72,
    metalness: 0.15,
  });
  const runwayMesh = new THREE.Mesh(new THREE.BoxGeometry(12, 0.12, 120), runwayMat);
  runwayMesh.position.y = -0.06;
  runwayMesh.receiveShadow = true;
  group.add(runwayMesh);

  // Extended Edge Beacon Orbs along both sides (-56 to +56)
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });
  const beaconGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const beacons = [];

  for (let z = -56; z <= 56; z += 8) {
    [-6.2, 6.2].forEach((x) => {
      const b = new THREE.Mesh(beaconGeo, beaconMat);
      b.position.set(x, 0.15, z);
      group.add(b);
      beacons.push(b);
    });
  }

  return {
    group,
    apronMat,
    runwayMat,
    beaconMat,
    beacons,
    setDayNight(isDay) {
      apronMat.color.set(isDay ? 0x334155 : 0x0b101b);
      runwayMat.roughness = isDay ? 0.8 : 0.55;
      beaconMat.emissiveIntensity = isDay ? 0.35 : 2.8;
    },
  };
}
