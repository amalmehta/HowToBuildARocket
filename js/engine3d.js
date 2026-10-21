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
  varying float vFacing; // 1 at the middle of the plume's silhouette, 0 at its edges
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }`;
const flameFragment = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vFacing;
  // Wrap x at 12 so the noise has no seam where the cylinder's u goes 1 → 0.
  float hash(vec2 p) { p.x = mod(p.x, 12.0); return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    float along = 1.0 - vUv.y;                // 0 at the nozzle exit, 1 at the tail
    float n = noise(vec2(vUv.x * 12.0, vUv.y * 6.0 + uTime * 9.0));
    float fade = smoothstep(1.0, 0.0, along);
    float centre = pow(vFacing, 2.0);
    // Shock diamonds: bright bands, only in the plume's core.
    float diamonds = pow(0.5 + 0.5 * cos(along * 30.0), 3.0) * pow(vFacing, 6.0) * smoothstep(0.75, 0.05, along);
    vec3 warm = vec3(1.0, 0.42, 0.1), hot = vec3(1.0, 0.82, 0.55), white = vec3(1.0, 0.96, 0.88);
    vec3 col = mix(warm, hot, centre) + white * diamonds;
    float a = fade * (0.25 + 0.75 * centre) * (0.6 + 0.4 * n) + diamonds * 0.6;
    gl_FragColor = vec4(col * 1.25, clamp(a, 0.0, 1.0));
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
  // Inner wall: copper when cold, glowing orange during hot fire.
  const glow = m(0x9a6440, { emissive: 0xff5a10, emissiveIntensity: 0.0, metalness: 0.5 });
  const COLD = new THREE.Color(0x9a6440), HOT = new THREE.Color(0xff8a3d);
  const loxPumpMat = m(0x7fa3c8), fuelPumpMat = m(0xc89a5a);

  // Combustion chamber + converging section + bell nozzle as one lathe profile.
  const prof = [];
  prof.push(new THREE.Vector2(0.06, 0.62), new THREE.Vector2(0.21, 0.6), new THREE.Vector2(0.21, 0.28));
  // Same nozzle as the rocket model: throat 0.115 m, exit 0.46 m, expansion ratio ≈ 16.
  for (let i = 0; i <= 8; i++) { const u = i / 8; prof.push(new THREE.Vector2(0.21 - 0.095 * Math.sin(u * Math.PI / 2), 0.28 - 0.28 * u)); }
  for (let i = 1; i <= 20; i++) { const u = i / 20; prof.push(new THREE.Vector2(0.115 + 0.345 * (1 - (1 - u) ** 2.2), -1.65 * u)); }
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
  const loxPump = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.18, 32), loxPumpMat);
  loxPump.rotation.z = Math.PI / 2; loxPump.position.x = 0.3;
  const fuelPump = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 32), fuelPumpMat);
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

  // The cutaway clips everything, so plumbing in front doesn't hide the chamber.
  clipped.push(copper, glow, steel, dark, lox, rp1, loxPumpMat, fuelPumpMat);

  // Plume.
  const flameMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, vertexShader: flameVertex, fragmentShader: flameFragment,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, toneMapped: false,
  });
  // Slightly necked in: a sea-level engine is over-expanded at liftoff.
  const flame = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.55, 2.8, 48, 1, true), flameMat);
  flame.position.y = -1.65 - 1.4;
  flame.visible = false;
  engine.add(flame);
  const flameLight = new THREE.PointLight(0xff8a3d, 0, 8);
  flameLight.position.y = -2.2; engine.add(flameLight);

  // Labels sit just off their parts, at least ~0.2 m apart vertically.
  const labelObjs = [
    ['Gimbal mount', [0, 1.2, -0.25]],
    ['LOX inlet', [0.5, 1.42, 0.55]],
    ['RP-1 inlet', [-0.55, 1.42, 0.55]],
    ['Injector', [-0.45, 0.78, -0.15]],
    ['Turbopump', [0.8, 0.55, 0.6]],
    ['Combustion chamber', [-0.62, 0.36, 0]],
    ['Throat', [0.4, -0.02, 0]],
    ['Bell nozzle (regen-cooled)', [-0.85, -0.9, 0]],
    ['Gas generator exhaust', [0.95, -1.32, 0.35]],
  ].map(([t, p]) => { const o = label(t, p); engine.add(o); return o; });
  // Hide a label when its part is on the far side of the engine from the camera.
  const radial = new THREE.Vector3(), toCam = new THREE.Vector3();
  const updateLabelVisibility = () => {
    for (const o of labelObjs) {
      radial.set(o.position.x, 0, o.position.z);
      if (radial.lengthSq() < 0.04) { o.visible = true; continue; }
      toCam.set(viewer.camera.position.x - o.position.x, 0, viewer.camera.position.z - o.position.z);
      o.visible = radial.normalize().dot(toCam.normalize()) > -0.75;
    }
  };

  viewer.scene.add(engine);

  let firing = false;
  let framing = 0; // 0 = engine only, 1 = engine plus plume
  const { camera, controls } = viewer;
  viewer.onFrame = (dt, t) => {
    const f = firing ? 1 : 0;
    const before = glow.emissiveIntensity;
    glow.emissiveIntensity += (f * 1.4 - glow.emissiveIntensity) * Math.min(1, dt * 3);
    glow.color.copy(COLD).lerp(HOT, glow.emissiveIntensity / 1.4);
    // Ease the camera down and out so the plume fits in frame while firing.
    const prevFraming = framing;
    framing += (f - framing) * Math.min(1, dt * (viewer.motion === 'reduced' ? 100 : 2.5));
    if (Math.abs(framing - f) < 1e-3) framing = f;
    if (framing !== prevFraming) {
      const dy = -1.0 * (framing - prevFraming);
      controls.target.y += dy; camera.position.y += dy;
      const scale = (1 + 0.3 * framing) / (1 + 0.3 * prevFraming);
      camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
    }
    const flicker = firing && viewer.motion !== 'reduced';
    flameMat.uniforms.uTime.value = flicker ? t : 0;
    flameLight.intensity = firing ? 6 + (flicker ? Math.sin(t * 40) * 0.8 : 0) : 0;
    updateLabelVisibility();
    labels.render(viewer.scene, viewer.camera);
    return flicker || Math.abs(before - glow.emissiveIntensity) > 1e-4 || framing !== prevFraming;
  };

  return {
    setCutaway(on) { clipped.forEach((mm) => { mm.clippingPlanes = on ? [clip] : []; mm.needsUpdate = true; }); viewer.invalidate(); },
    setFiring(on) { firing = on; flame.visible = on; viewer.invalidate(); },
    setLabels(on) { labels.domElement.hidden = !on; },
  };
}
