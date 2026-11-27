import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { animate, createTimeline } from "animejs";

// 1. Scene & Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121113);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 2. Camera Setup (PerspectiveCamera)
const camera = new THREE.PerspectiveCamera(
  45,                                     // Field of view (degrees)
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1,                                    // Near clipping plane
  100                                     // Far clipping plane
);
camera.position.set(0, 3, 9);

// 3. OrbitControls (Optional manual inspection alongside Anime.js)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const lookTarget = new THREE.Vector3(0, 0, 0);

// 4. Sample Subject: Solid Dark Core + Crisp EdgesGeometry Wireframe
const geo = new THREE.BoxGeometry(2, 2, 2);
const solidMat = new THREE.MeshBasicMaterial({ color: 0x121113 });
const coreMesh = new THREE.Mesh(geo, solidMat);

const edgesGeo = new THREE.EdgesGeometry(geo);
const edgeMat = new THREE.LineBasicMaterial({ color: 0xbe8989 });
const wireframe = new THREE.LineSegments(edgesGeo, edgeMat);
coreMesh.add(wireframe);
scene.add(coreMesh);

// 5. Anime.js v4 Camera + Object Timeline
const tl = createTimeline({
  defaults: { ease: "inOutCubic", duration: 1800 },
  loop: true,
  alternate: true,
});

// Tween camera position and look-at target simultaneously
tl.add(camera.position, {
  x: [0, 4.5],
  y: [3, 1.8],
  z: [9, 5.2],
  onUpdate: () => {
    controls.target.copy(lookTarget);
    camera.lookAt(lookTarget);
  },
}, 0);

// Tween mesh rotation in sync with the camera move
tl.add(coreMesh.rotation, {
  y: Math.PI * 0.75,
  x: Math.PI * 0.25,
}, 0);

// 6. Responsive Resize & Render Loop
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function renderLoop() {
  requestAnimationFrame(renderLoop);
  controls.update();
  renderer.render(scene, camera);
}

renderLoop();