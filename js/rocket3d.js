// Falcon 9 Block 5, built from simple shapes at real scale (1 unit = 1 m).
// Click a part to read about it; "Exploded view" separates the stages,
// splits the fairing and deploys the landing legs.
import * as THREE from 'three';
import { createViewer, onPick } from './viewer.js';
import { PARTS } from './data.js';

const R = 1.83; // body radius, m

const mat = {
  white: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.45, metalness: 0.05 }),
  soot: new THREE.MeshStandardMaterial({ color: 0x2b2a28, roughness: 0.8 }),
  black: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8c8f94, roughness: 0.35, metalness: 0.8 }),
  copper: new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide }),
  niobium: new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }),
  titanium: new THREE.MeshStandardMaterial({ color: 0x6b6d70, roughness: 0.5, metalness: 0.7 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc8a24a, roughness: 0.3, metalness: 0.9 }),
  panel: new THREE.MeshStandardMaterial({ color: 0x1d2a4a, roughness: 0.3, metalness: 0.4 }),
};

function part(key, ...objects) {
  const g = new THREE.Group();
  g.userData.part = key;
  objects.forEach((o) => g.add(o));
  return g;
}

function cylinder(r, h, y, material, seg = 48) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), material);
  m.position.y = y + h / 2;
  return m;
}

// Bell nozzle as a lathe profile (radius, height), throat at the top.
function bell(throat, exit, length, material) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    pts.push(new THREE.Vector2(throat + (exit - throat) * Math.sqrt(u), -length * u));
  }
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 32), material);
}

function gridFin() {
  const g = new THREE.Group();
  const w = 1.2, h = 1.5, t = 0.12, bar = 0.05;
  for (let i = 0; i <= 5; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(bar, h, t), mat.titanium);
    v.position.x = -w / 2 + (w * i) / 5;
    g.add(v);
    const hz = new THREE.Mesh(new THREE.BoxGeometry(w, bar, t), mat.titanium);
    hz.position.y = -h / 2 + (h * i) / 5; g.add(hz);
  }
  g.rotation.z = Math.PI / 4;
  return g;
}

function buildRocket() {
  const rocket = new THREE.Group();

  // Nine Merlin engines: one in the centre, eight around it.
  const engines = part('engines');
  const engineSpots = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 1.25, Math.sin(i * Math.PI / 4) * 1.25])];
  for (const [x, z] of engineSpots) {
    const n = bell(0.16, 0.46, 1.9, mat.copper);
    n.position.set(x, 2.2, z);
    engines.add(n);
  }
  engines.add(cylinder(R * 0.98, 0.5, 2.0, mat.soot)); // Octaweb heat shield
  rocket.add(engines);

  // First stage tank with a sooty band at the bottom and black interstage on top.
  const s1 = part('s1', cylinder(R, 2.5, 2.5, mat.soot), cylinder(R, 36, 5, mat.white));
  rocket.add(s1);

  // Landing legs: pivot at the bottom, folded against the body.
  const legs = part('legs');
  legs.userData.pivots = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * (R + 0.12), 3.2, Math.sin(a) * (R + 0.12));
    pivot.rotation.y = -a;
    const arm = new THREE.Group(); // rotates outward around local z
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 9.5, 0.6), mat.black);
    leg.position.y = 4.75;
    arm.add(leg);
    pivot.add(arm);
    legs.add(pivot);
    legs.userData.pivots.push(arm);
  }
  rocket.add(legs);

  // Grid fins near the top of the first stage.
  const fins = part('gridfins');
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const f = gridFin();
    f.rotation.set(0, -a + Math.PI / 2, Math.PI / 4);
    f.position.set(Math.cos(a) * (R + 0.6), 39.6, Math.sin(a) * (R + 0.6));
    fins.add(f);
  }
  rocket.add(fins);

  // Upper part that lifts away in the exploded view.
  const upper = new THREE.Group();
  const interstage = part('interstage', cylinder(R, 6.5, 41, mat.black));
  rocket.add(interstage);

  const mvacNozzle = bell(0.2, 1.3, 4.6, mat.niobium);
  mvacNozzle.position.y = 47.3;
  const mvac = part('mvac', mvacNozzle);
  const s2 = part('s2', cylinder(R, 9.8, 47.5, mat.white), cylinder(R * 0.99, 0.4, 47.3, mat.soot));
  upper.add(mvac, s2);

  // Fairing: two halves of a lathe profile (cylinder then ogive nose).
  const prof = [];
  prof.push(new THREE.Vector2(R, 0), new THREE.Vector2(2.6, 1.4), new THREE.Vector2(2.6, 6.8));
  for (let i = 1; i <= 14; i++) {
    const u = i / 14;
    prof.push(new THREE.Vector2(2.6 * Math.cos(u * Math.PI / 2) ** 0.8, 6.8 + 6.3 * Math.sin(u * Math.PI / 2)));
  }
  const fairing = part('fairing');
  fairing.userData.halves = [];
  for (let h = 0; h < 2; h++) {
    const half = new THREE.Mesh(new THREE.LatheGeometry(prof, 40, h * Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: 0xf5f5f1, roughness: 0.4, side: THREE.DoubleSide }));
    half.position.y = 57.3;
    fairing.add(half);
    fairing.userData.halves.push(half);
  }

  // A generic satellite inside the fairing.
  const sat = new THREE.Group();
  const bus = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 2.2), mat.gold);
  bus.position.y = 59.6;
  const adapter = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.5, 0.8, 32), mat.metal);
  adapter.position.y = 57.7;
  const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.5, 1.6), mat.panel);
  panelL.position.set(0, 62.6, 0);
  sat.add(bus, adapter, panelL);
  const payload = part('payload', sat);
  upper.add(fairing, payload);
  rocket.add(upper);

  rocket.userData = { legs, upper, fairing, payload, interstage };
  return rocket;
}

export function mountRocket(container, infoEl, buttonsEl) {
  const viewer = createViewer(container, { position: [82, 64, 110], target: [0, 46, 0], fov: 38, far: 1000 });
  const rocket = buildRocket();
  viewer.scene.add(rocket);

  // Ground disc for scale.
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 1, transparent: true, opacity: 0.5 }));
  ground.rotation.x = -Math.PI / 2;
  viewer.scene.add(ground);

  let exploded = 0, target = 0;
  const { legs, upper, fairing, payload } = rocket.userData;

  viewer.onFrame = (dt) => {
    const speed = viewer.motion === 'reduced' ? 100 : 2.2;
    exploded += (target - exploded) * Math.min(1, dt * speed);
    const e = exploded;
    upper.position.y = e * 12;
    payload.position.y = e * 6;
    fairing.userData.halves.forEach((h, i) => {
      h.position.z = (i === 0 ? 1 : -1) * e * 5;
      h.position.y = 57.3 + e * 8;
    });
    legs.userData.pivots.forEach((arm) => { arm.rotation.z = -e * 1.9; });
  };

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
