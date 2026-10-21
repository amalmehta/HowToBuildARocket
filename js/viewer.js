// Shared Three.js setup for every 3D scene: renderer, camera, orbit controls,
// lights, resizing, pausing when the scene is off screen, and click-to-pick.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getSettings } from './settings.js';

export function createViewer(container, { fov = 40, near = 0.1, far = 2000, position = [0, 0, 10], target = [0, 0, 0], background = null, spin = true } = {}) {
  const scene = new THREE.Scene();
  if (background) scene.background = new THREE.Color(background);

  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  camera.position.set(...position);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !background, powerPreference: 'high-performance' });
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

  // Auto-rotate stays off once the visitor has dragged the model.
  let userMoved = false;
  const applyQuality = () => {
    const s = getSettings();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, s.quality === 'low' ? 1 : 2));
    controls.autoRotate = spin && !userMoved && s.autorotate && s.motion !== 'reduced';
    controls.autoRotateSpeed = 0.6;
  };
  controls.addEventListener('start', () => { userMoved = true; controls.autoRotate = false; });

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    // Re-read the pixel ratio: zoom or moving to another monitor changes it.
    applyQuality();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewer.onResize?.(w, h);
  };
  window.addEventListener('settingschange', (e) => {
    const s = e.detail;
    if (s.quality !== last.quality || s.autorotate !== last.autorotate || s.motion !== last.motion) resize();
    last = s;
  });
  let last = getSettings();
  new ResizeObserver(resize).observe(container);
  window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`)?.addEventListener?.('change', resize, { once: true });

  // Only render while the scene is on screen.
  let visible = false;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    viewer.onVisibility?.(visible);
  }, { rootMargin: '100px' }).observe(container);

  // If the GPU drops the context, show a message rather than a black box.
  let lost = false;
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    viewer.onContextLost?.();
    setTimeout(() => { if (lost) container.dataset.contextLost = 'true'; }, 3000);
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    lost = false;
    delete container.dataset.contextLost;
    viewer.onContextRestored?.();
  });

  const clock = new THREE.Clock();
  const viewer = {
    scene, camera, renderer, controls, container,
    onFrame: null, onResize: null, onVisibility: null, onContextLost: null, onContextRestored: null,
    get motion() { return getSettings().motion; },
    get visible() { return visible; },
  };
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!visible || lost) return;
    controls.update();
    viewer.onFrame?.(dt, clock.elapsedTime);
    renderer.render(scene, camera);
  });

  resize();
  return viewer;
}

// Picks an object under the pointer on a primary-button click or single tap
// (not a drag, right-click or pinch). Calls back with the first ancestor that
// has userData[key].
export function onPick(viewer, objects, key, callback) {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const el = viewer.renderer.domElement;
  const active = new Set();
  let down = null;
  el.addEventListener('pointerdown', (e) => {
    active.add(e.pointerId);
    down = active.size === 1 && e.isPrimary && e.button === 0 ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  });
  const end = (e) => { active.delete(e.pointerId); };
  el.addEventListener('pointercancel', (e) => { end(e); down = null; });
  el.addEventListener('pointerup', (e) => {
    end(e);
    const d = down;
    down = null;
    if (!d || d.id !== e.pointerId || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, viewer.camera);
    const hit = ray.intersectObjects(objects(), true)[0];
    let o = hit?.object;
    while (o && !o.userData[key]) o = o.parent;
    callback(o ? o.userData[key] : null);
  });
}
