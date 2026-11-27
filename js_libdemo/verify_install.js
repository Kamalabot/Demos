import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const checks = [
  // Core animation & 3D
  { name: "animejs", load: () => import("animejs") },
  { name: "three", load: () => import("three") },
  { name: "gsap", load: () => import("gsap") },

  // Built-in Three.js addons
  { name: "three/addons/controls/OrbitControls.js", load: () => import("three/addons/controls/OrbitControls.js") },
  { name: "three/addons/loaders/GLTFLoader.js", load: () => import("three/addons/loaders/GLTFLoader.js") },
  { name: "three/addons/loaders/DRACOLoader.js", load: () => import("three/addons/loaders/DRACOLoader.js") },
  { name: "three/addons/postprocessing/EffectComposer.js", load: () => import("three/addons/postprocessing/EffectComposer.js") },
  { name: "three/addons/lines/Line2.js", load: () => import("three/addons/lines/Line2.js") },

  // Built-in GSAP plugins & React addon
  { name: "gsap/ScrollTrigger", load: () => import("gsap/ScrollTrigger") },
  { name: "gsap/Flip", load: () => import("gsap/Flip") },
  { name: "gsap/Draggable", load: () => import("gsap/Draggable") },
  { name: "@gsap/react", load: () => import("@gsap/react") },

  // Three.js ecosystem addons
  { name: "postprocessing", load: () => import("postprocessing") },
  { name: "camera-controls", load: () => import("camera-controls") },
  { name: "three-mesh-bvh", load: () => import("three-mesh-bvh") },
  { name: "three-stdlib", load: () => import("three-stdlib") },

  // Debug GUIs & performance monitors
  { name: "lil-gui", load: () => import("lil-gui") },
  // { name: "dat.gui", load: () => import("dat.gui") },
  { name: "tweakpane", load: () => import("tweakpane") },
  { name: "@tweakpane/core", load: () => import("@tweakpane/core") },
  { name: "@tweakpane/plugin-essentials", load: () => import("@tweakpane/plugin-essentials") },
  { name: "leva", load: () => import("leva") },
  { name: "stats-gl", load: () => import("stats-gl") },
  { name: "stats.js", load: () => import("stats.js") },

  // TypeScript type definitions (path resolution only)
  { name: "@types/three", load: () => Promise.resolve(require.resolve("@types/three/package.json")) },
];

async function verifyAll() {
  console.log(`[INFO] Checking ${checks.length} packages and addons...\n`);
  let passed = 0;
  let failed = 0;

  for (const item of checks) {
    try {
      await item.load();
      console.log(`[OK]   ${item.name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${item.name} -> ${err.message}`);
      failed++;
    }
  }

  console.log(`\n[DONE] Passed: ${passed}/${checks.length}, Failed: ${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

verifyAll();