# Getting Started with Three.js — Basic to Advanced Portfolio

An interactive, exhaustively commented Three.js learning playground and portfolio system covering **Basic**, **Intermediate**, **Mastery**, **Fluency**, **Studio Glass**, and **Advanced Kinetic Scroll Portfolio** concepts.

## How to Run (Windows DOS / `cmd.exe`)

From the `js_libdemo` root directory:

```cmd
npx vite getting-started-with-threejs
```

Open the local URL printed by Vite in your browser. Use the top navigation bar to hot-swap between curriculum stages without reloading.

---

## Curriculum Bucket List & Where to Find Everything

| Stage | Module File | Key Concepts Covered |
| :--- | :--- | :--- |
| **Core Shell** | `index.html`, `style.css` | ES Module entrypoint, full-bleed `<canvas>`, glassmorphic HUD, chapter scroll track, 3D project tooltips, `pointer-events` passthrough |
| **Orchestrator** | `main.js` | `WebGLRenderer`, `PerspectiveCamera`, `OrbitControls`, `Stats` (`stats.js`), `lil-gui`, clamped `THREE.Clock` loop, recursive GPU `.dispose()` on module switches |
| **1. Basic** | `modules/01-basic.js` | `BoxGeometry`, `SphereGeometry`, `TorusKnotGeometry`, `MeshStandardMaterial` (PBR), `AmbientLight`, `DirectionalLight` + `PCFSoftShadowMap`, `GridHelper`, `AxesHelper` |
| **2. Intermediate** | `modules/02-intermediate.js` | Procedural `CanvasTexture`, `THREE.Group` hierarchies, `THREE.Raycaster` (NDC mouse picking, hover/click), `THREE.FogExp2` |
| **3. Mastery** | `modules/03-mastery.js` | `THREE.InstancedMesh` (1,000 cubes in 1 draw call), `BufferGeometry` + `THREE.Points` particle cloud, `gsap` camera & wave choreography |
| **4. Fluency** | `modules/04-fluency.js` | Custom GLSL `ShaderMaterial` (vertex displacement + Fresnel rim glow), `EffectComposer`, `RenderPass`, `UnrealBloomPass` |
| **5. Studio Glass** | `modules/05-advanced-portfolio.js` | `PMREMGenerator` + `RoomEnvironment` studio IBL, `MeshPhysicalMaterial` (transmission, IOR, clearcoat), `three-mesh-bvh` accelerated raycasting |
| **6. Kinetic Portfolio** | `modules/06-kinetic-portfolio.js` | **Interactive Base Ground**: GLSL procedural undulating grid with dynamic multi-source shockwave ripples and real-time entity contact glow auras.<br>**Multi-Element Swarm**: 16 kinetic multi-part artifacts (metallic core, gimbal rings, halos).<br>**Proximity Energy Beams**: Dynamic `LineSegments` connecting nearby elements with proximity-scaled glow intensity.<br>**Ground Particle Wakes**: Trailing `Points` dust sparks on the terrain.<br>**4-Chapter Scroll Storytelling**: Discrete FSM stages (Matrix Genesis, Kinetic Dispersion, Vortex Convergence, Spatial Showcase).<br>**Interactive Layer**: Raycasting hover inspection with 3D project cards and ground-shattering click shockwaves.<br>**Augmented lil-gui**: Real-time scrubbing of narrative chapters, auto-scroll, beam thresholds, wave frequencies, and 4 cyberpunk color themes. |

---

## Advanced Kinetic Portfolio Architecture (Module 06 Deep Dive)

### 1. Dynamic Reactive Base Ground
- **Vertex Displacement**: Ambient undulating harmonic waves `sin(x * freq + time) * cos(y * freq + time)` combined with multi-source shockwave rings `sin((d - radius) * 6.0) * falloff`.
- **Fragment Shader Anti-Aliased Grid**: Computes procedural dual grids using derivative anti-aliasing (`fwidth(coord * scale)`).
- **Contact Glow Auras**: Passes real-time world coordinates of moving entities (`uniform vec3 uEntityPos[16]`) into the fragment shader to render radiant neon auras beneath each floating artifact.

### 2. Multi-Element Swarm & Proximity Beams
- 16 kinetic artifacts each composed of an inner faceted metallic core, an outer wireframe gimbal ring, and a ground-projected halo.
- **Dynamic Energy Arcs**: In each frame, distances between all pairs $(i, j)$ are computed. If distance $d < \text{threshold}$, dynamic vertex positions and colors are written to `LineSegments`, forming luminous energy arcs.

### 3. Scroll Storytelling & FSM Chapters
1. **Chapter 01 // Matrix Awakening**: Symmetrical $4 \times 4$ crystalline lattice formation.
2. **Chapter 02 // Kinetic Dispersion**: Free-roaming Lissajous figure-8 trajectories across the terrain with proximity beam intersections.
3. **Chapter 03 // Gravitational Vortex**: High-speed spiral convergence into a central gravitational funnel with accelerated ground wakes.
4. **Chapter 04 // Spatial Showcase**: Circular amphitheater alignment where artifacts become interactive 3D project cards displaying technical portfolio specifications.

---

## Recommended YouTube References (Titles Only)

- **Three.js Crash Course for Absolute Beginners** — *Wael Yasmina*
- **Three.js Tutorial For Beginners** — *DesignCourse*
- **Learn Three.js — Full Course for Beginners** — *freeCodeCamp.org*
- **Three.js Shaders & GLSL** — *SimonDev*
- **Three.js Journey (Overview & Portfolio Breakdowns)** — *Bruno Simon*
- **Creative Coding with Three.js & Post-Processing** — *Yuri Artiukh (akella)*
