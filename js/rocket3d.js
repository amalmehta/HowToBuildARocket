// Falcon 9 Block 5, built in code at real scale (1 unit = 1 m).
// Click a part to read about it; "Exploded view" separates the stages,
// splits the fairing and deploys the landing legs.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createViewer, onPick } from './viewer.js';
import { PARTS } from './data.js';
import { getSettings } from './settings.js';

const R = 1.83; // body radius, m
const SEG = 96; // radial segments for round parts

// ---------- Painted textures ----------

// Seeded random so the soot pattern is the same on every load.
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

// Body texture for a cylinder: white paint, weld seams, panel lines and
// (optionally) the soot a reused booster picks up from re-entry burns.
// The canvas top maps to the top of the cylinder.
function bodyTexture({ height, soot = 0, seams = [], seed = 7 }) {
  const W = 1024, H = Math.round(Math.min(4096, height * 96));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#efefea';
  g.fillRect(0, 0, W, H);

  // Faint vertical panel lines.
  g.strokeStyle = 'rgba(0,0,0,0.05)';
  g.lineWidth = 2;
  for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo((i + 0.5) * W / 8, 0); g.lineTo((i + 0.5) * W / 8, H); g.stroke(); }

  // Circumferential weld seams (heights in metres from the bottom).
  for (const m of seams) {
    const y = H - (m / height) * H;
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y - 2, W, 3);
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, y + 1, W, 1);
  }

  // Soot: dark at the base, fading upward in streaks.
  if (soot > 0) {
    const r = rng(seed);
    const top = H * (1 - soot);
    const grad = g.createLinearGradient(0, H, 0, top);
    grad.addColorStop(0, 'rgba(28,24,20,0.95)');
    grad.addColorStop(0.35, 'rgba(40,34,28,0.75)');
    grad.addColorStop(1, 'rgba(60,52,44,0)');
    g.fillStyle = grad;
    g.fillRect(0, top, W, H - top);
    for (let i = 0; i < 260; i++) {
      const x = r() * W, w = 2 + r() * 14, len = (0.2 + r() * 0.8) * (H - top) * 1.1;
      const sg = g.createLinearGradient(0, H, 0, H - len);
      sg.addColorStop(0, `rgba(25,20,16,${0.25 + r() * 0.35})`);
      sg.addColorStop(1, 'rgba(25,20,16,0)');
      g.fillStyle = sg;
      g.fillRect(x, H - len, w, len);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Woven carbon-fibre look for the interstage.
function carbonTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#141414'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) {
    g.fillStyle = ((x + y) / 8) % 2 ? '#1d1d1d' : '#101010';
    g.fillRect(x, y, 8, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(40, 20);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const mat = {
  paint: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.42, metalness: 0.02 }),
  soot: new THREE.MeshStandardMaterial({ color: 0x24211e, roughness: 0.85 }),
  black: new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.55, metalness: 0.1 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9a9da2, roughness: 0.3, metalness: 0.9 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x6d6f73, roughness: 0.35, metalness: 0.85 }),
  nozzle: new THREE.MeshStandardMaterial({ color: 0x3d3833, roughness: 0.45, metalness: 0.8, side: THREE.DoubleSide }),
  copper: new THREE.MeshStandardMaterial({ color: 0x9a6240, roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide }),
  niobium: new THREE.MeshStandardMaterial({ color: 0x55504b, roughness: 0.4, metalness: 0.75, side: THREE.DoubleSide }),
  titanium: new THREE.MeshStandardMaterial({ color: 0x7c7e82, roughness: 0.45, metalness: 0.85 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd4a83e, roughness: 0.28, metalness: 1.0 }),
  panel: new THREE.MeshStandardMaterial({ color: 0x1b2d5a, roughness: 0.25, metalness: 0.5 }),
  raceway: new THREE.MeshStandardMaterial({ color: 0xdcdcd6, roughness: 0.5 }),
};

function part(key, ...objects) {
  const g = new THREE.Group();
  g.userData.part = key;
  objects.forEach((o) => g.add(o));
  return g;
}

function cylinder(r, h, y, material, seg = SEG, open = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg, 1, open), material);
  m.position.y = y + h / 2;
  return m;
}

function shadows(obj) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}

// Bell nozzle as a lathe profile, throat at the top (y = 0).
function bell(throat, exit, length, material, lip = 0.015) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    // Parabolic-ish bell: opens fast after the throat, then straightens.
    pts.push(new THREE.Vector2(throat + (exit - throat) * (1 - (1 - u) ** 2.2), -length * u));
  }
  pts.push(new THREE.Vector2(exit + lip, -length));
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 48), material);
}

// One Merlin 1D: nozzle, chamber, turbopump and gas-generator exhaust.
function merlin() {
  const e = new THREE.Group();
  const n = bell(0.15, 0.46, 1.55, mat.nozzle);
  e.add(n);
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.35, 32), mat.copper);
  throat.position.y = 0.17; e.add(throat);
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.3, 32), mat.steel);
  dome.position.y = 0.5; e.add(dome);
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 16), mat.steel);
  pump.rotation.z = Math.PI / 2; pump.position.set(0.18, 0.55, 0.2); e.add(pump);
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.3, 12), mat.nozzle);
  exhaust.position.set(0.32, -0.35, 0.22); exhaust.rotation.z = -0.12; e.add(exhaust);
  return e;
}

// Grid fin: a frame with a lattice of bars at ±45°, like Falcon 9's titanium fins.
function gridFin() {
  const g = new THREE.Group();
  const w = 1.25, h = 1.55, t = 0.22, bar = 0.035, frame = 0.06, pitch = 0.17;
  const add = (len, x, y, rot, thick) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(thick, len, t), mat.titanium);
    m.position.set(x, y, 0); m.rotation.z = rot; g.add(m);
  };
  add(h, -w / 2, 0, 0, frame); add(h, w / 2, 0, 0, frame);
  add(w, 0, -h / 2, Math.PI / 2, frame); add(w, 0, h / 2, Math.PI / 2, frame);
  // Lines x ± y = c, clipped to the rectangle.
  const clipLine = (c, s) => {
    const pts = [];
    for (const x of [-w / 2, w / 2]) { const y = s * (c - x); if (Math.abs(y) <= h / 2) pts.push([x, y]); }
    for (const y of [-h / 2, h / 2]) { const x = c - s * y; if (Math.abs(x) <= w / 2) pts.push([x, y]); }
    return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null;
  };
  for (const s of [1, -1]) {
    for (let c = -(w + h) / 2 + pitch / 2; c < (w + h) / 2; c += pitch) {
      const seg = clipLine(c, s);
      if (!seg) continue;
      const [[x1, y1], [x2, y2]] = seg;
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 0.05) continue;
      add(len, (x1 + x2) / 2, (y1 + y2) / 2, Math.atan2(x1 - x2, y2 - y1), bar);
    }
  }
  return g;
}

// A thin cylinder stretched between two points (for leg struts).
function strutBetween(mesh, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(1, d.length(), 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}

function buildRocket() {
  const rocket = new THREE.Group();

  // Engine section: nine Merlins (one centre, eight around) under the Octaweb heat shield.
  const engines = part('engines');
  const spots = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 1.22, Math.sin(i * Math.PI / 4) * 1.22])];
  for (const [x, z] of spots) {
    const m = merlin();
    m.position.set(x, 1.75, z);
    m.rotation.y = Math.atan2(x, z);
    engines.add(m);
  }
  const shield = cylinder(R, 0.6, 1.9, mat.soot);
  const shieldPlate = new THREE.Mesh(new THREE.CircleGeometry(R, SEG), mat.soot);
  shieldPlate.rotation.x = Math.PI / 2; shieldPlate.position.y = 1.9;
  engines.add(shield, shieldPlate);
  rocket.add(engines);

  // First stage: one textured tank from 2.5 m to 41 m, plus a raceway.
  const s1Height = 38.5;
  const s1Mat = mat.paint.clone();
  s1Mat.map = bodyTexture({ height: s1Height, soot: 0.38, seams: [3, 9, 15, 21, 25.5, 30, 35], seed: 11 });
  const s1Body = cylinder(R, s1Height, 2.5, s1Mat);
  const raceway1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 36, 0.14), mat.raceway);
  raceway1.position.set(0, 21.5, R + 0.05);
  // Cold-gas (nitrogen) thruster pods near the top.
  const pods = new THREE.Group();
  for (const a of [Math.PI / 4, -3 * Math.PI / 4]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), mat.black);
    pod.position.set(Math.cos(a) * (R + 0.1), 40.2, Math.sin(a) * (R + 0.1));
    pod.rotation.y = -a + Math.PI / 2;
    pods.add(pod);
  }
  const s1 = part('s1', s1Body, raceway1, pods);
  rocket.add(s1);

  // Landing legs: hinged at the base, folded flat along the body.
  const legs = part('legs');
  legs.userData.items = [];
  const legShape = new THREE.Shape();
  legShape.moveTo(-0.42, 0); legShape.lineTo(0.42, 0); legShape.lineTo(0.22, 9.6); legShape.lineTo(-0.22, 9.6); legShape.closePath();
  const legGeo = new THREE.ExtrudeGeometry(legShape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
  legGeo.translate(0, 0, -0.11);
  const strutGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 12);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * (R + 0.14), 2.7, Math.sin(a) * (R + 0.14));
    pivot.rotation.y = -a;
    const arm = new THREE.Group(); // rotates outward around local z
    const leg = new THREE.Mesh(legGeo, mat.black);
    leg.rotation.y = Math.PI / 2; // broad face against the body
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.12, 24), mat.steel);
    foot.position.y = 9.65;
    arm.add(leg, foot);
    pivot.add(arm);
    const strut = new THREE.Mesh(strutGeo, mat.metal);
    pivot.add(strut);
    legs.add(pivot);
    legs.userData.items.push({ arm, strut });
  }
  rocket.add(legs);

  // Grid fins, stowed flat against the top of the first stage.
  const fins = part('gridfins');
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const holder = new THREE.Group();
    holder.position.set(Math.cos(a) * (R + 0.18), 39.4, Math.sin(a) * (R + 0.18));
    holder.rotation.y = -a + Math.PI / 2;
    const f = gridFin();
    f.position.z = 0.05;
    const actuator = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.3), mat.black);
    actuator.position.set(0, -0.95, -0.1);
    holder.add(f, actuator);
    fins.add(holder);
  }
  rocket.add(fins);

  // Interstage: carbon composite, stays with the booster.
  const carbon = mat.black.clone();
  carbon.map = carbonTexture();
  carbon.roughness = 0.4;
  const interstage = part('interstage', cylinder(R + 0.02, 6.5, 41, carbon));
  rocket.add(interstage);

  // Upper part that lifts away in the exploded view.
  const upper = new THREE.Group();

  const mvacNozzle = bell(0.2, 1.3, 4.4, mat.niobium, 0.02);
  mvacNozzle.position.y = 47.0;
  const mvacEngine = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.7, 32), mat.copper);
  mvacEngine.position.y = 47.35;
  const mvac = part('mvac', mvacNozzle, mvacEngine);

  const s2Height = 9.8;
  const s2Mat = mat.paint.clone();
  s2Mat.map = bodyTexture({ height: s2Height, seams: [1.2, 4.5, 8.6], seed: 3 });
  const raceway2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 9.2, 0.12), mat.raceway);
  raceway2.position.set(0, 47.7 + 4.9, R + 0.04);
  const s2Dome = new THREE.Mesh(new THREE.SphereGeometry(R * 0.98, SEG, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat.steel);
  s2Dome.scale.y = 0.35; s2Dome.position.y = 47.7;
  const s2 = part('s2', cylinder(R, s2Height, 47.7, s2Mat), raceway2, s2Dome);
  upper.add(mvac, s2);

  // Fairing: two halves of a lathe profile (boat-tail, cylinder, ogive nose).
  const prof = [];
  prof.push(new THREE.Vector2(R, 0), new THREE.Vector2(2.6, 1.3), new THREE.Vector2(2.6, 6.8));
  for (let i = 1; i <= 32; i++) {
    const u = i / 32;
    const r = 2.6 * Math.cos(u * Math.PI / 2) ** 0.75;
    prof.push(new THREE.Vector2(Math.max(r, i === 32 ? 0 : 0.05), 6.8 + 6.3 * Math.sin(u * Math.PI / 2)));
  }
  const fairing = part('fairing');
  fairing.userData.halves = [];
  const fairingMat = new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.38, metalness: 0.02, side: THREE.DoubleSide });
  for (let h = 0; h < 2; h++) {
    // A tiny gap between halves shows the separation seam.
    const half = new THREE.Mesh(new THREE.LatheGeometry(prof, 64, h * Math.PI + 0.004, Math.PI - 0.008), fairingMat);
    half.position.y = 57.5;
    fairing.add(half);
    fairing.userData.halves.push(half);
  }
  const fairingBase = cylinder(R + 0.01, 0.15, 57.4, mat.black);
  fairing.add(fairingBase);

  // A generic satellite inside the fairing.
  const sat = new THREE.Group();
  const adapter = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.55, 0.9, 48), mat.metal);
  adapter.position.y = 58.1;
  const bus = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 2.2), mat.gold);
  bus.position.y = 60.1;
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 8, 0, Math.PI * 2, 0, Math.PI / 3.5), mat.metal);
  dish.position.y = 61.25; dish.rotation.x = Math.PI;
  const panels = new THREE.Mesh(new THREE.BoxGeometry(0.06, 5, 1.7), mat.panel);
  panels.position.set(0, 62.9, 0);
  sat.add(adapter, bus, dish, panels);
  const payload = part('payload', sat);
  upper.add(fairing, payload);
  rocket.add(upper);

  shadows(rocket);
  rocket.userData = { legs, upper, fairing, payload, interstage };
  return rocket;
}

export function mountRocket(container, infoEl, buttonsEl) {
  // Framed tightly on the stacked rocket; the camera eases out for the exploded view.
  const viewer = createViewer(container, { position: [63, 49, 84], target: [0, 35, 0], fov: 38, far: 1000 });
  const { renderer, scene, camera, controls } = viewer;

  // Image-based lighting for believable metal and paint, plus soft shadows.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.2);
  sun.position.set(40, 90, 30);
  sun.target.position.set(0, 30, 0);
  sun.castShadow = true;
  const cam = sun.shadow.camera;
  cam.left = -25; cam.right = 25; cam.top = 60; cam.bottom = -40; cam.near = 10; cam.far = 200;
  sun.shadow.bias = -0.0004;
  const applyShadowQuality = () => {
    const size = getSettings().quality === 'low' ? 1024 : 2048;
    sun.shadow.mapSize.set(size, size);
    sun.shadow.map?.dispose(); sun.shadow.map = null;
  };
  applyShadowQuality();
  window.addEventListener('settingschange', applyShadowQuality);
  scene.add(sun, sun.target);

  const rocket = buildRocket();
  scene.add(rocket);

  // Pad: a concrete disc with a soft shadow.
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 96), new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.95, transparent: true, opacity: 0.6 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let exploded = 0, target = 0;
  const { legs, upper, fairing, payload } = rocket.userData;
  const anchor = new THREE.Vector3(), legPoint = new THREE.Vector3();

  // Camera distance and height as functions of how exploded the view is.
  const zoom = (e) => 1 + 0.32 * e;
  const lift = (e) => 11 * e;

  viewer.onFrame = (dt) => {
    const speed = viewer.motion === 'reduced' ? 100 : 2.2;
    const prev = exploded;
    exploded += (target - exploded) * Math.min(1, dt * speed);
    if (Math.abs(exploded - target) < 1e-4) exploded = target;
    const e = exploded;

    if (e !== prev) {
      // Ease the camera out (or back in), keeping whatever angle and zoom the user chose.
      const dy = lift(e) - lift(prev);
      controls.target.y += dy;
      camera.position.y += dy;
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(zoom(e) / zoom(prev));
      camera.position.copy(controls.target).add(offset);
    }

    upper.position.y = e * 12;
    payload.position.y = e * 6;
    fairing.userData.halves.forEach((h, i) => {
      h.position.z = (i === 0 ? 1 : -1) * e * 5;
      h.position.y = 57.5 + e * 8;
      h.rotation.x = (i === 0 ? 1 : -1) * e * 0.12;
    });
    legs.userData.items.forEach(({ arm, strut }) => {
      const phi = -e * 1.95;
      arm.rotation.z = phi;
      // Strut from the body to the middle of the leg.
      anchor.set(-0.05, 8.2, 0);
      legPoint.set(-6 * Math.sin(phi) + 0.15 * Math.cos(phi), 6 * Math.cos(phi) + 0.15 * Math.sin(phi), 0);
      strutBetween(strut, anchor, legPoint);
    });
  };
  viewer.onFrame(0);

  // Highlight a selected part with a glow.
  let selected = null;
  const select = (key) => {
    if (selected) selected.traverse((o) => { if (o.material?.userData.orig !== undefined) { o.material.emissive.setHex(o.material.userData.orig); } });
    selected = key ? rocket.children.concat(upper.children).find((g) => g.userData.part === key) : null;
    if (selected) selected.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.userData.orig = o.material.emissive.getHex();
        o.material.emissive.setHex(0xff7a1a);
        o.material.emissiveIntensity = 0.45;
      }
    });
    const p = key && PARTS[key];
    infoEl.innerHTML = p
      ? `<h4>${p.name}</h4><p class="muted small">${p.material}</p><p>${p.text}</p>`
      : '<p class="muted">Click any part of the rocket, or pick one below.</p>';
    buttonsEl.querySelectorAll('button[data-part]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === key)));
  };

  onPick(viewer, () => [rocket], 'part', select);

  buttonsEl.innerHTML = Object.entries(PARTS).map(([k, p]) => `<button type="button" class="chip" data-part="${k}" aria-pressed="false">${p.name}</button>`).join('');
  buttonsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-part]');
    if (b) select(b.dataset.part);
  });

  return {
    setExploded(on) { target = on ? 1 : 0; },
    select,
  };
}
