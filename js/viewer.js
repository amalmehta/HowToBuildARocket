// Shared Three.js setup for every 3D scene: renderer, camera, orbit controls,
// lights, resizing, and pausing when the scene is off screen.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getSettings } from './settings.js';

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

export function createViewer(container, { fov = 40, near = 0.1, far = 2000, position = [0, 0, 10], target = [0, 0, 0], background = null, spin = true } = {}) {
  const scene = new THREE.Scene();
  if (background) scene.background = new THREE.Color(background);

  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  camera.position.set(...position);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !background, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2622, 1.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(30, 60, 40);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9ab8ff, 0.8);
  rim.position.set(-40, 20, -30);
  scene.add(rim);

  const applyQuality = () => {
    const s = getSettings();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, s.quality === 'low' ? 1 : 2));
    controls.autoRotate = spin && s.autorotate && s.motion !== 'reduced';
    controls.autoRotateSpeed = 0.6;
  };
  applyQuality();
  window.addEventListener('settingschange', () => { applyQuality(); resize(); });

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewer.onResize?.(w, h);
  };
  new ResizeObserver(resize).observe(container);

  // Only render while the scene is on screen.
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(container);

  const clock = new THREE.Clock();
  const viewer = {
    scene, camera, renderer, controls, container,
    onFrame: null, onResize: null,
    get motion() { return getSettings().motion; },
  };
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!visible) return;
    controls.update();
    viewer.onFrame?.(dt, clock.elapsedTime);
    renderer.render(scene, camera);
  });
  // Stop auto-rotate while the user drags, so it doesn't fight them.
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  resize();
  return viewer;
}

// Picks an object under the pointer on click (not drag). Calls back with the
// first ancestor that has userData[key].
export function onPick(viewer, objects, key, callback) {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  const el = viewer.renderer.domElement;
  el.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  el.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, viewer.camera);
    const hit = ray.intersectObjects(objects(), true)[0];
    let o = hit?.object;
    while (o && !o.userData[key]) o = o.parent;
    callback(o ? o.userData[key] : null);
  });
}
