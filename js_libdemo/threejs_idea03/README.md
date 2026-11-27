# Three.js + Anime.js + lil-gui — Spaceport Runway (`threejs_idea03`)

An interactive 3D space-to-runway choreography sandbox built with **Three.js**, **Anime.js v4 (`animejs/adapters/three`)**, and **lil-gui**, featuring procedural **Day & Night Skyboxes**, a **two-phase Push-Off Blast-Off & Touchdown** timeline, and a **live Webcam Selfie / Photo-Textured Mannequin** on the runway apron.

---

## 1. How to Work With This Project (Windows DOS / `cmd.exe`)

From the `js_libdemo` root directory:

```cmd
npx vite threejs_idea03
```

### Project Structure
- `index.html` / `style.css`: Full-bleed WebGL viewport with HUD controls for Launch & Land, Day/Night Skybox toggle, Webcam Selfie, and Photo Upload.
- `skyboxes.js`: Procedural Day (sun + azure gradient) and Night (starfield + moon) equirectangular skyboxes with `PMREMGenerator` IBL reflections.
- `runway.js`: Procedural asphalt runway `CanvasTexture` with markings and pulsing edge beacon lights.
- `main.js`: Two-phase Anime.js `createTimeline()` (squat anticipation ➔ thruster flame + push-off blast ring ➔ `inExpo` ascent ➔ re-entry landing + touchdown shockwave) plus a runway mannequin that accepts live webcam selfies or uploaded photos.

---

## 2. How to Take a Webcam Picture of Yourself & Map It Onto a Three.js Mannequin

To capture a live photo from your camera in the browser and project it onto a 3D mesh, you connect **`navigator.mediaDevices.getUserMedia`** ➔ an offscreen **`<canvas>`** snapshot ➔ **`THREE.CanvasTexture`**:

### Step-by-Step Pipeline
1. **Request Camera Stream**: Call `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })` (requires `localhost` or `https://`).
2. **Play into a Hidden `<video>` Element**: Wait ~400ms so the webcam auto-exposure stabilizes.
3. **Draw Frame to `<canvas>`**: Mirror horizontally (`ctx.translate(w, 0); ctx.scale(-1, 1);`) so it matches a natural selfie mirror, then call `ctx.drawImage(video, 0, 0, w, h)`.
4. **Stop the Camera Hardware**: Call `stream.getTracks().forEach(t => t.stop())` so the webcam LED turns off cleanly.
5. **Wrap in `THREE.CanvasTexture` & Apply**:
   - Set `tex.colorSpace = THREE.SRGBColorSpace` (prevents washed-out skin tones under ACES Filmic tone mapping).
   - For **glTF/GLB** mannequins (like Mixamo/ActionForge exports), set `tex.flipY = false`. For built-in Three.js geometries (`BoxGeometry`, `SphereGeometry`), keep `tex.flipY = true`.
   - Assign `material.map = tex` and `material.needsUpdate = true`.

```javascript
async function captureSelfieToThreeMesh(targetMesh, isGltf = false) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  await video.play();

  await new Promise((r) => setTimeout(r, 450));

  const snap = document.createElement('canvas');
  snap.width = 512;
  snap.height = 512;
  const ctx = snap.getContext('2d');
  ctx.translate(512, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, 512, 512);

  stream.getTracks().forEach((t) => t.stop());

  const tex = new THREE.CanvasTexture(snap);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = !isGltf;

  targetMesh.material.map = tex;
  targetMesh.material.color.setHex(0xffffff);
  targetMesh.material.needsUpdate = true;
}
```

> **Live Stream Option:** If you want **live video** instead of a single snapshot, skip stopping the stream and use `new THREE.VideoTexture(video)`!

---

## 3. How to Import ActionForge or Mixamo Animated Assets

Both **Mixamo** (`mixamo.com`) and **ActionForge** (`actionforge.app`, a browser-based animation editor/retargeter that blends Mixamo & ActorCore clips) export rigged characters as **`.glb` / `.gltf`** (recommended) or **`.fbx`**.

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
let mixer = null;

loader.load('/assets/character-actionforge.glb', (gltf) => {
  const character = gltf.scene;
  character.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  scene.add(character);

  mixer = new THREE.AnimationMixer(character);
  if (gltf.animations.length > 0) {
    mixer.clipAction(gltf.animations[0]).play();
  }
});
```

Advance the mixer inside your `requestAnimationFrame` loop:

```javascript
const delta = Math.min(clock.getDelta(), 0.05);
if (mixer) mixer.update(delta);
```
