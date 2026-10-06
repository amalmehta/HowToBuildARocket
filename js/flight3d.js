// A Falcon 9 mission from liftoff to orbit, with the booster flying back to
// a droneship. 1 unit = 100 km. Altitudes are exaggerated so the climb is
// visible against the size of the Earth.
import * as THREE from 'three';
import { createViewer } from './viewer.js';
import { FLIGHT_EVENTS } from './data.js';
import { EARTH_RADIUS_KM } from './physics.js';

const KM = 1 / 100;
const RE = EARTH_RADIUS_KM * KM;
export const END_TIME = 600;

// Key points (time s, downrange km, altitude km). Smooth curves pass through them.
const STACK = [[0, 0, 0], [40, 1, 6], [72, 8, 13], [110, 32, 36], [150, 80, 70]];
const UPPER = [[150, 80, 70], [200, 170, 110], [300, 450, 165], [400, 850, 190], [530, 1650, 200], [600, 2196, 200]];
const BOOSTER = [[153, 82, 72], [220, 200, 118], [280, 300, 128], [340, 420, 110], [400, 530, 60], [460, 590, 15], [500, 600, 3], [520, 600, 0]];

// Sample a smooth path through key points, indexed by time.
function track(keys) {
  const curve = new THREE.CatmullRomCurve3(keys.map(([t, x, h]) => new THREE.Vector3(t, x, h)), false, 'centripetal');
  const pts = curve.getPoints(400);
  return {
    start: keys[0][0], end: keys[keys.length - 1][0],
    at(t) {
      t = Math.min(Math.max(t, this.start), this.end);
      let lo = 0, hi = pts.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid].x <= t) lo = mid; else hi = mid; }
      const a = pts[lo], b = pts[hi];
      const u = b.x === a.x ? 0 : (t - a.x) / (b.x - a.x);
      return { x: a.y + (b.y - a.y) * u, h: Math.max(0, a.z + (b.z - a.z) * u) };
    },
  };
}

export const TRACKS = { stack: track(STACK), upper: track(UPPER), booster: track(BOOSTER) };

export function mountFlight(container, ui) {
  const viewer = createViewer(container, { position: [0, 0, 1], target: [0, 0, 0], fov: 35, near: 0.05, far: 5000, spin: false });
  const { scene, camera, controls } = viewer;
  let exaggeration = 5;

  // Launch site at the top of the globe; flight goes east along +x.
  const toWorld = (xKm, hKm) => {
    const ang = (xKm / EARTH_RADIUS_KM);
    const r = RE + hKm * KM * exaggeration;
    return new THREE.Vector3(Math.sin(ang) * r, Math.cos(ang) * r, 0);
  };

  // Earth: ocean sphere, lat/long grid, and a soft atmosphere shell.
  const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 128, 64), new THREE.MeshStandardMaterial({ color: 0x1d4f8c, roughness: 0.7, metalness: 0.0 }));
  scene.add(earth);
  const grid = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(RE * 1.0005, 36, 18)), new THREE.LineBasicMaterial({ color: 0x6fa3e0, transparent: true, opacity: 0.18 }));
  scene.add(grid);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(RE + 0.6, 96, 48), new THREE.MeshBasicMaterial({ color: 0x3f8cff, transparent: true, opacity: 0.25, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(atmo);

  // Stars.
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 1500; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(1500 + Math.random() * 500);
    sp.push(v.x, v.y, v.z);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })));

  // Pad and droneship markers.
  const marker = (color) => new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 8), new THREE.MeshBasicMaterial({ color }));
  const pad = marker(0xffffff); const ship = marker(0x9be37a);
  scene.add(pad, ship);

  // Trails drawn up to the current time.
  const makeTrail = (color, n = 600) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    g.setDrawRange(0, 0);
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
    scene.add(line);
    return { line, n };
  };
  const trails = { stack: makeTrail(0xffffff), upper: makeTrail(0xff9a3d), booster: makeTrail(0x7cc4ff) };

  const vehicle = (color, size) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(size * 0.35, size, 12), new THREE.MeshBasicMaterial({ color }));
    scene.add(m); return m;
  };
  const upperDot = vehicle(0xffb066, 0.5); const boosterDot = vehicle(0x9fd4ff, 0.5);

  function fillTrail(trail, tr, from, to) {
    const pos = trail.line.geometry.attributes.position;
    const steps = Math.max(0, Math.min(trail.n, Math.ceil((to - from) / ((tr.end - tr.start) / trail.n)) + 1));
    for (let i = 0; i < steps; i++) {
      const t = from + (to - from) * (steps > 1 ? i / (steps - 1) : 0);
      const p = tr.at(t);
      const v = toWorld(p.x, p.h);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    trail.line.geometry.setDrawRange(0, to > from ? steps : 0);
    trail.line.geometry.computeBoundingSphere();
  }

  function pointAlong(mesh, tr, t) {
    const p = tr.at(t), q = tr.at(Math.min(t + 2, tr.end));
    const a = toWorld(p.x, p.h), b = toWorld(q.x, q.h);
    mesh.position.copy(a);
    const dir = b.sub(a);
    if (dir.lengthSq() > 1e-10) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  }

  let time = END_TIME, playing = false; // open on the finished mission so the paths show
  let follow = true;
  function update() {
    pad.position.copy(toWorld(0, 0));
    ship.position.copy(toWorld(600, 0));
    fillTrail(trails.stack, TRACKS.stack, 0, Math.min(time, 150));
    fillTrail(trails.upper, TRACKS.upper, 150, Math.max(150, Math.min(time, END_TIME)));
    fillTrail(trails.booster, TRACKS.booster, 153, Math.max(153, Math.min(time, 520)));

    const onStack = time < 153;
    pointAlong(upperDot, time < 150 ? TRACKS.stack : TRACKS.upper, time);
    boosterDot.visible = !onStack;
    if (!onStack) pointAlong(boosterDot, TRACKS.booster, time);

    const u = time < 150 ? TRACKS.stack.at(time) : TRACKS.upper.at(time);
    const b = TRACKS.booster.at(time);
    ui.onUpdate?.({
      time, upper: u, booster: onStack ? null : b,
      event: [...FLIGHT_EVENTS].reverse().find((e) => e.t <= time) || FLIGHT_EVENTS[0],
    });
  }

  function frameCamera() {
    // Look at the region around the action, from the side.
    const mid = toWorld(Math.min(900, 300 + time), 60);
    controls.target.copy(mid);
    camera.position.copy(mid.clone().add(new THREE.Vector3(0, 5, 30)));
  }
  frameCamera();
  controls.addEventListener('start', () => { follow = false; });

  viewer.onFrame = (dt) => {
    if (playing) {
      time += dt * 20; // 20× real time
      if (time >= END_TIME) { time = END_TIME; playing = false; ui.onPlayState?.(false); }
      update();
      if (follow && viewer.motion !== 'reduced') {
        const mid = toWorld(Math.min(900, 300 + time), 100);
        controls.target.lerp(mid, Math.min(1, dt * 2));
      }
    }
  };

  update();
  return {
    play() { if (time >= END_TIME) time = 0; playing = true; follow = true; ui.onPlayState?.(true); },
    pause() { playing = false; ui.onPlayState?.(false); },
    seek(t) { time = t; update(); },
    get playing() { return playing; },
    setExaggeration(x) { exaggeration = x; update(); },
    reframe() { follow = true; frameCamera(); },
  };
}
