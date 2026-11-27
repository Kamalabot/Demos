/**
 * =============================================================================
 * SPACEPORT RUNWAY & BEACON ENVIRONMENT (runway.js)
 * =============================================================================
 * Builds:
 *   - Procedural asphalt runway texture with threshold chevrons & centerline
 *   - Left/Right runway edge beacon lights (emissive orbs + PointLights)
 *   - Touchdown shockwave rings triggered when each space shape lands
 * =============================================================================
 */

import * as THREE from 'three';

function createRunwayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Dark asphalt base
  ctx.fillStyle = '#141820';
  ctx.fillRect(0, 0, 512, 1024);

  // Subtle asphalt grain
  for (let i = 0; i < 4000; i++) {
    const shade = 16 + Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 6})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2);
  }

  // Side edge stripes
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(28, 0, 10, 1024);
  ctx.fillRect(474, 0, 10, 1024);

  // Dashed centerline
  ctx.fillStyle = '#fbbf24';
  for (let y = 40; y < 980; y += 90) {
    ctx.fillRect(250, y, 12, 50);
  }

  // Touchdown zone markings
  ctx.fillStyle = '#f8fafc';
  for (let x = 70; x <= 180; x += 28) {
    ctx.fillRect(x, 860, 14, 110);
    ctx.fillRect(512 - x - 14, 860, 14, 110);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createRunway(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Surrounding ground apron
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.92,
    metalness: 0.05,
  });
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), apronMat);
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.02;
  apron.receiveShadow = true;
  group.add(apron);

  // Main Runway Strip
  const runwayTex = createRunwayTexture();
  const runwayMat = new THREE.MeshStandardMaterial({
    map: runwayTex,
    roughness: 0.72,
    metalness: 0.15,
  });
  const runwayMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 0.12, 38), runwayMat);
  runwayMesh.position.y = -0.06;
  runwayMesh.receiveShadow = true;
  group.add(runwayMesh);

  // Edge Beacon Orbs (glow brightly at night, dim during day)
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });
  const beaconGeo = new THREE.SphereGeometry(0.16, 16, 16);
  const beacons = [];

  for (let z = -16; z <= 16; z += 4) {
    [-5.2, 5.2].forEach((x) => {
      const b = new THREE.Mesh(beaconGeo, beaconMat);
      b.position.set(x, 0.14, z);
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
