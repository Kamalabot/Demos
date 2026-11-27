/**
 * =============================================================================
 * PROCEDURAL DAY & NIGHT SKYBOXES + IBL GENERATOR (skyboxes.js)
 * =============================================================================
 * Builds two equirectangular skybox textures in memory (zero external assets):
 *   - Day Skybox: Crisp azure sky gradient, horizon haze, & glowing sun disc
 *   - Night Skybox: Deep space gradient, Milky Way nebula tint, stars, & moon
 * Generates PMREM environment maps from both so metallic shapes reflect the
 * active sky accurately!
 * =============================================================================
 */

import * as THREE from 'three';

function createSkyTexture(mode) {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (mode === 'day') {
    grad.addColorStop(0.0, '#1e3a8a'); // Deep zenith blue
    grad.addColorStop(0.45, '#3b82f6'); // Mid sky
    grad.addColorStop(0.62, '#bae6fd'); // Bright horizon
    grad.addColorStop(1.0, '#64748b'); // Ground bounce
  } else {
    grad.addColorStop(0.0, '#010308'); // Deep space zenith
    grad.addColorStop(0.45, '#091124'); // Upper atmosphere
    grad.addColorStop(0.62, '#1e293b'); // Night horizon
    grad.addColorStop(1.0, '#02040a'); // Ground shadow
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  if (mode === 'day') {
    // Glowing Sun Disc
    const sunX = width * 0.72;
    const sunY = height * 0.26;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 68);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.2, '#fef08a');
    sunGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 68, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Procedural Starfield
    for (let i = 0; i < 650; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * (height * 0.58);
      const r = Math.random() * 1.4 + 0.3;
      const alpha = Math.random() * 0.75 + 0.25;
      ctx.fillStyle = `rgba(248, 250, 252, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cool Moon Disc
    const moonX = width * 0.28;
    const moonY = height * 0.24;
    const moonGrad = ctx.createRadialGradient(moonX, moonY, 6, moonX, moonY, 48);
    moonGrad.addColorStop(0, '#f8fafc');
    moonGrad.addColorStop(0.35, '#bfdbfe');
    moonGrad.addColorStop(1, 'rgba(147, 197, 253, 0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 48, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSkyboxManager(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const dayTex = createSkyTexture('day');
  const nightTex = createSkyTexture('night');
  const dayEnv = pmrem.fromEquirectangular(dayTex).texture;
  const nightEnv = pmrem.fromEquirectangular(nightTex).texture;

  return {
    dayTex,
    nightTex,
    dayEnv,
    nightEnv,
    dispose() {
      dayTex.dispose();
      nightTex.dispose();
      dayEnv.dispose();
      nightEnv.dispose();
      pmrem.dispose();
    },
  };
}
