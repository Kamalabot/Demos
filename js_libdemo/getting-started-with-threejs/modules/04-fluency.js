/**
 * =============================================================================
 * MODULE 04: FLUENCY — CUSTOM GLSL SHADERMATERIAL & POST-PROCESSING BLOOM
 * =============================================================================
 * Core Concepts Covered:
 *   1. Custom GLSL Vertex Shader: procedural 3D sine-wave vertex displacement
 *   2. Custom GLSL Fragment Shader: Fresnel rim-lighting + time-animated palette
 *   3. Post-Processing Pipeline: EffectComposer -> RenderPass -> UnrealBloomPass
 * =============================================================================
 */

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export const META = {
  title: '4. Fluency: Custom GLSL Shaders & UnrealBloom',
  description:
    'Writes a custom GLSL ShaderMaterial with vertex displacement and Fresnel rim glow, rendered through an EffectComposer + UnrealBloomPass pipeline.',
  hints: 'Adjust Shader Amplitude & Bloom Strength in lil-gui',
};

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);

    // Displace vertices along their normal using a 3D sine wave
    float wave = sin(position.x * 3.0 + uTime * 2.0)
               * cos(position.y * 3.0 + uTime * 1.5)
               * sin(position.z * 3.0 + uTime * 2.5);
    vec3 displaced = position + normal * (wave * uAmp);

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // Fresnel term: brighter at grazing angles
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);

    vec3 coreColor = vec3(0.05, 0.15, 0.35);
    vec3 glowColor = vec3(0.22, 0.74, 0.97) + 0.25 * sin(uTime + vec3(0.0, 2.0, 4.0));
    vec3 finalColor = mix(coreColor, glowColor, fresnel);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function init({ THREE, scene, camera, renderer, gui }) {
  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.22 },
  };

  const shaderMat = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
  });

  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 5), shaderMat);
  scene.add(blob);

  // POST-PROCESSING COMPOSER
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.85, // strength
    0.4,  // radius
    0.2   // threshold
  );
  composer.addPass(bloomPass);

  gui.add(uniforms.uAmp, 'value', 0, 0.6, 0.01).name('Shader Amplitude');
  gui.add(bloomPass, 'strength', 0, 2.5, 0.05).name('Bloom Strength');
  gui.add(bloomPass, 'radius', 0, 1.5, 0.05).name('Bloom Radius');

  return {
    update(elapsed, delta) {
      uniforms.uTime.value = elapsed;
      blob.rotation.y += delta * 0.25;
    },
    render() {
      composer.render();
    },
    onResize(w, h) {
      composer.setSize(w, h);
    },
    dispose() {
      composer.dispose();
    },
  };
}
