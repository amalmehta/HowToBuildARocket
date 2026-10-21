// Shared Three.js setup for every 3D scene: renderer, camera, orbit controls,
// lights, resizing, pausing when the scene is off screen, and click-to-pick.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getSettings } from './settings.js';

export function createViewer(container, { fov = 40, near = 0.1, far = 2000, position = [0, 0, 10], target = [0, 0, 0], background = null, spin = true, lights = true, antialias = true } = {}) {
  const scene = new THREE.Scene();
  if (background) scene.background = new THREE.Color(background);

  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  camera.position.set(...position);

  const renderer = new THREE.WebGLRenderer({ antialias, alpha: !background, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);
  container.querySelector('.loading3d')?.remove();
  container.removeAttribute('aria-busy');

  let userMoved = false;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();

  const canvas = renderer.domElement;
  // Let a vertical swipe scroll the page on phones; horizontal drags rotate.
  canvas.style.touchAction = 'pan-y';
  // Don't hijack the page's scroll wheel: zoom only with ⌘/Ctrl held, or once
  // the visitor has clicked into the scene (until the pointer leaves it).
  let engaged = false;
  canvas.addEventListener('pointerdown', () => { engaged = true; controls.enableZoom = true; });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') engaged = false; });
  canvas.addEventListener('wheel', (e) => { controls.enableZoom = engaged || e.ctrlKey || e.metaKey; }, { capture: true, passive: true });

  // Keyboard: arrows rotate, +/− zoom, when the canvas has focus.
  canvas.tabIndex = 0;
  const spherical = new THREE.Spherical();
  const offset = new THREE.Vector3();
  canvas.addEventListener('keydown', (e) => {
    const turn = THREE.MathUtils.degToRad(10);
    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);
    let handled = true;
    if (e.key === 'ArrowLeft') spherical.theta -= turn;
    else if (e.key === 'ArrowRight') spherical.theta += turn;
    else if (e.key === 'ArrowUp') spherical.phi = Math.max(0.1, spherical.phi - turn);
    else if (e.key === 'ArrowDown') spherical.phi = Math.min(Math.PI - 0.1, spherical.phi + turn);
    else if (e.key === '+' || e.key === '=') spherical.radius *= 0.85;
    else if (e.key === '-' || e.key === '_') spherical.radius /= 0.85;
    else handled = false;
    if (!handled) return;
    e.preventDefault();
    userMoved = true;
    controls.autoRotate = false;
    camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
    camera.lookAt(controls.target);
    needsRender = true;
  });

  if (lights) {
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2622, 1.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(30, 60, 40);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9ab8ff, 0.8);
    rim.position.set(-40, 20, -30);
    scene.add(rim);
  }

  // Auto-rotate stays off once the visitor has dragged the model.
  const applyQuality = () => {
    const s = getSettings();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, s.quality === 'low' ? 1 : 1.5));
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
    needsRender = true;
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
    if (visible) needsRender = true;
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
    needsRender = true;
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
  // Render on demand: only when the camera moved, the scene animated
  // (onFrame returned true) or something asked for a redraw.
  let needsRender = true;
  controls.addEventListener('change', () => { needsRender = true; });
  viewer.invalidate = () => { needsRender = true; };
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!visible || lost) return;
    const moved = controls.update();
    const animated = viewer.onFrame?.(dt, clock.elapsedTime) === true;
    if (!(moved || animated || needsRender)) return;
    needsRender = false;
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
