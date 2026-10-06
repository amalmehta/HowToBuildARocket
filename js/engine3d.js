// Merlin 1D gas-generator engine, simplified (1 unit = 1 m).
// Toggles: cutaway (clips the front half) and hot fire (animated plume).
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { createViewer } from './viewer.js';

const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

function m(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.75, side: THREE.DoubleSide, ...opts });
}

function tube(points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 12), material);
}

function label(text, pos) {
  const el = document.createElement('div');
  el.className = 'label3d';
  el.textContent = text;
  const o = new CSS2DObject(el);
  o.position.set(...pos);
  return o;
}

const flameVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const flameFragment = `
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    float along = 1.0 - vUv.y;                // 0 at the nozzle exit, 1 at the tail
    float n = noise(vec2(vUv.x * 12.0, vUv.y * 6.0 + uTime * 9.0));
    // Shock diamonds: bright bands along the plume.
    float diamonds = 0.55 + 0.45 * cos(along * 28.0);
    float core = smoothstep(1.0, 0.0, along);
    vec3 hot = vec3(1.0, 0.86, 0.6), warm = vec3(1.0, 0.45, 0.12);
    vec3 col = mix(warm, hot, core * diamonds);
    float a = core * (0.55 + 0.45 * n) * (0.6 + 0.4 * diamonds);
    gl_FragColor = vec4(col * 1.6, a);
  }`;

export function mountEngine(container) {
  const viewer = createViewer(container, { position: [3.2, 1.2, 5.6], target: [0, -0.6, 0], fov: 38, far: 200 });
  viewer.renderer.localClippingEnabled = true;

  const labels = new CSS2DRenderer();
  labels.domElement.className = 'labels3d';
  container.appendChild(labels.domElement);
  viewer.onResize = (w, h) => labels.setSize(w, h);
  viewer.onResize(container.clientWidth, container.clientHeight);

  const engine = new THREE.Group();
  const clipped = []; // materials affected by the cutaway

  const copper = m(0x9a6440); const steel = m(0x9da1a6); const dark = m(0x3b3a39, { metalness: 0.4 });
  const glow = m(0xff8a3d, { emissive: 0xff5a10, emissiveIntensity: 0.0, metalness: 0.2 });
  clipped.push(copper, glow);

  // Combustion chamber + converging section + bell nozzle as one lathe profile.
  const prof = [];
  prof.push(new THREE.Vector2(0.06, 0.62), new THREE.Vector2(0.21, 0.6), new THREE.Vector2(0.21, 0.28));
  for (let i = 0; i <= 8; i++) { const u = i / 8; prof.push(new THREE.Vector2(0.21 - 0.09 * Math.sin(u * Math.PI / 2), 0.28 - 0.28 * u)); }
  for (let i = 1; i <= 20; i++) { const u = i / 20; prof.push(new THREE.Vector2(0.12 + 0.34 * Math.sqrt(u), -1.65 * u)); }
  const nozzle = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), copper);
  engine.add(nozzle);

  // Glowing inner surface shown in cutaway during hot fire.
  const inner = new THREE.Mesh(new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p.x * 0.96, p.y)), 64), glow);
  engine.add(inner);

  // Regenerative cooling manifold near the nozzle exit.
  const manifold = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.03, 12, 64), steel);
  manifold.rotation.x = Math.PI / 2; manifold.position.y = -1.35;
  engine.add(manifold);

  // Injector dome and gimbal mount.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), steel);
  dome.position.y = 0.6; engine.add(dome);
  const gimbal = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.35, 16), dark);
  gimbal.position.y = 0.95; engine.add(gimbal);

  // Turbopump: turbine in the middle, LOX pump and RP-1 pump on a shared shaft.
  const pump = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 24), steel);
  shaft.rotation.z = Math.PI / 2;
  const loxPump = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.18, 32), m(0x7fa3c8));
  loxPump.rotation.z = Math.PI / 2; loxPump.position.x = 0.3;
  const fuelPump = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 32), m(0xc89a5a));
  fuelPump.rotation.z = Math.PI / 2; fuelPump.position.x = -0.3;
  const turbine = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 32), dark);
  turbine.rotation.z = Math.PI / 2;
  pump.add(shaft, loxPump, fuelPump, turbine);
  pump.position.set(0.0, 0.55, 0.55);
  engine.add(pump);

  // Gas generator and its exhaust pipe (the dark plume seen beside Falcon 9's engines).
  const gg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 16), dark);
  gg.position.set(0.12, 0.3, 0.55); engine.add(gg);
  engine.add(tube([[0.05, 0.5, 0.62], [0.12, 0.2, 0.62], [0.35, -0.4, 0.5], [0.52, -1.3, 0.35]], 0.05, dark));

  // Propellant lines: LOX (blue) and RP-1 (amber). RP-1 first cools the nozzle.
  const lox = m(0x4f8fd6, { metalness: 0.3 }); const rp1 = m(0xe0a03a, { metalness: 0.3 });
  engine.add(tube([[0.3, 1.25, 0.55], [0.3, 0.9, 0.55], [0.3, 0.72, 0.55]], 0.045, lox));
  engine.add(tube([[0.3, 0.4, 0.55], [0.25, 0.4, 0.25], [0.06, 0.68, 0.12]], 0.04, lox));
  engine.add(tube([[-0.3, 1.25, 0.55], [-0.3, 0.9, 0.55], [-0.3, 0.72, 0.55]], 0.045, rp1));
  engine.add(tube([[-0.3, 0.4, 0.55], [-0.4, -0.3, 0.45], [-0.42, -1.33, 0.12]], 0.04, rp1));
  engine.add(tube([[0.0, -1.35, -0.43], [-0.3, -0.4, -0.35], [-0.2, 0.45, -0.2], [-0.05, 0.66, -0.06]], 0.035, rp1));

  // Clipping for the cutaway.
  engine.traverse((o) => { if (o.isMesh && clipped.includes(o.material)) o.material.clippingPlanes = []; });

  // Plume.
  const flameMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, vertexShader: flameVertex, fragmentShader: flameFragment,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const flame = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.75, 3.6, 48, 1, true), flameMat);
  flame.position.y = -1.65 - 1.8;
  flame.visible = false;
  engine.add(flame);
  const flameLight = new THREE.PointLight(0xff8a3d, 0, 8);
  flameLight.position.y = -2.2; engine.add(flameLight);

  [
    ['Gimbal mount', [0, 1.12, -0.35]],
    ['Injector', [-0.55, 0.68, -0.2]],
    ['Turbopump', [0.75, 0.62, 0.6]],
    ['LOX inlet', [0.55, 1.38, 0.55]],
    ['RP-1 inlet', [-0.6, 1.38, 0.55]],
    ['Gas generator exhaust', [0.95, -1.3, 0.35]],
    ['Combustion chamber', [-0.75, 0.35, 0]],
    ['Throat', [0.45, 0.0, 0]],
    ['Bell nozzle (regen-cooled)', [-0.95, -0.95, 0]],
].forEach(([t, p]) => engine.add(label(t, p)));

  viewer.scene.add(engine);

  let firing = false;
  viewer.onFrame = (dt, t) => {
    flameMat.uniforms.uTime.value = viewer.motion === 'reduced' ? 0 : t;
    const f = firing ? 1 : 0;
    glow.emissiveIntensity += (f * 1.4 - glow.emissiveIntensity) * Math.min(1, dt * 3);
    flameLight.intensity = firing ? 6 + (viewer.motion === 'reduced' ? 0 : Math.sin(t * 40) * 0.8) : 0;
    labels.render(viewer.scene, viewer.camera);
  };

  return {
    setCutaway(on) { clipped.forEach((mm) => { mm.clippingPlanes = on ? [clip] : []; mm.needsUpdate = true; }); },
    setFiring(on) { firing = on; flame.visible = on; },
    setLabels(on) { labels.domElement.hidden = !on; },
  };
}
