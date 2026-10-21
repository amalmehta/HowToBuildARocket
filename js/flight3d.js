// A Falcon 9 mission from liftoff to orbit, with the booster flying back to
// a droneship. 1 unit = 100 km. Altitudes are exaggerated so the climb is
// visible against the size of the Earth.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { createViewer } from './viewer.js';
import { FLIGHT_EVENTS, FLIGHT_TRACKS, END_TIME, SHIP_DOWNRANGE_KM } from './data.js';
import { EARTH_RADIUS_KM, monotoneTrack } from './physics.js';

const KM = 1 / 100;
const RE = EARTH_RADIUS_KM * KM;
export { END_TIME };

// Smooth path through the key points in data.js, indexed by time. Monotone
// interpolation passes through every point without overshooting.
function track(keys) {
  const m = monotoneTrack(keys);
  return { start: m.start, end: m.end, at(t) { const [x, h] = m.at(t); return { x, h: Math.max(0, h) }; } };
}

export const TRACKS = { stack: track(FLIGHT_TRACKS.stack), upper: track(FLIGHT_TRACKS.upper), booster: track(FLIGHT_TRACKS.booster) };
const MECO = TRACKS.stack.end, SEP = TRACKS.booster.start, TOUCHDOWN = TRACKS.booster.end;

export function mountFlight(container, ui) {
  const viewer = createViewer(container, { position: [0, 0, 1], target: [0, 0, 0], fov: 35, near: 1, far: 2500, spin: false, antialias: false });
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
  // Latitude and longitude lines as smooth circles just above the surface (a
  // wireframe sphere's straight chords would sag below the ocean).
  const gridPts = [];
  const GR = RE + 0.02, SEGS = 256;
  const ring = (fn) => { for (let i = 0; i < SEGS; i++) gridPts.push(...fn(i / SEGS), ...fn((i + 1) / SEGS)); };
  for (let lat = -80; lat <= 80; lat += 10) {
    const phi = THREE.MathUtils.degToRad(lat), r = GR * Math.cos(phi), y = GR * Math.sin(phi);
    ring((u) => [r * Math.cos(u * 2 * Math.PI), y, r * Math.sin(u * 2 * Math.PI)]);
  }
  for (let lon = 0; lon < 180; lon += 10) {
    const th = THREE.MathUtils.degToRad(lon);
    ring((u) => { const a = u * 2 * Math.PI; return [GR * Math.cos(a) * Math.cos(th), GR * Math.sin(a), GR * Math.cos(a) * Math.sin(th)]; });
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
  scene.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: 0x6fa3e0, transparent: true, opacity: 0.18, toneMapped: false })));

  // Atmosphere: a fresnel glow that brightens towards the limb.
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(RE + 1.2, 96, 48), new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV;
      void main() { float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(vec3(0.35, 0.62, 1.0) * f, f); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
  }));
  scene.add(atmo);

  // Stars.
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 1500; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(1500 + Math.random() * 500);
    sp.push(v.x, v.y, v.z);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, toneMapped: false })));

  // Pad and droneship markers.
  const marker = (color) => new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 8), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  const pad = marker(0xffffff); const ship = marker(0x5ee0a0);
  scene.add(pad, ship);

  // Trails drawn up to the current time.
  // Thick trails (WebGL's own lines are always 1 device pixel).
  const lineMats = [];
  const makeTrail = (color, n = 600) => {
    const material = new LineMaterial({ color, linewidth: 2.5, toneMapped: false });
    lineMats.push(material);
    const line = new Line2(new LineGeometry(), material);
    line.visible = false;
    scene.add(line);
    return { line, n };
  };
  // Booster in green, matching the droneship marker, so it stands out from the blue ocean.
  const trails = { stack: makeTrail(0xffffff), upper: makeTrail(0xff9a3d), booster: makeTrail(0x5ee0a0) };

  const vehicle = (color, size) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(size * 0.35, size, 12), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    scene.add(m); return m;
  };
  const upperDot = vehicle(0xffb066, 0.5); const boosterDot = vehicle(0x8ff0c0, 0.5);

  const drawn = new THREE.Box3(); // everything drawn so far, for framing the camera
  function fillTrail(trail, tr, from, to) {
    const steps = Math.max(2, Math.min(trail.n, Math.ceil((to - from) / ((tr.end - tr.start) / trail.n)) + 1));
    if (!(to > from)) { trail.line.visible = false; return; }
    const pts = new Float32Array(steps * 3);
    for (let i = 0; i < steps; i++) {
      const p = tr.at(from + (to - from) * (i / (steps - 1)));
      const v = toWorld(p.x, p.h);
      pts.set([v.x, v.y, v.z], i * 3);
      drawn.expandByPoint(v);
    }
    // Swap in a fresh geometry: LineGeometry can't grow in place.
    trail.line.geometry.dispose();
    trail.line.geometry = new LineGeometry().setPositions(pts);
    trail.line.computeLineDistances();
    trail.line.visible = true;
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
    drawn.makeEmpty();
    pad.position.copy(toWorld(0, 0));
    drawn.expandByPoint(pad.position);
    ship.position.copy(toWorld(SHIP_DOWNRANGE_KM, 0));
    fillTrail(trails.stack, TRACKS.stack, 0, Math.min(time, MECO));
    fillTrail(trails.upper, TRACKS.upper, MECO, Math.max(MECO, Math.min(time, END_TIME)));
    fillTrail(trails.booster, TRACKS.booster, SEP, Math.max(SEP, Math.min(time, TOUCHDOWN)));

    const onStack = time < SEP;
    pointAlong(upperDot, time < MECO ? TRACKS.stack : TRACKS.upper, time);
    boosterDot.visible = !onStack;
    if (!onStack) pointAlong(boosterDot, TRACKS.booster, time);

    const u = time < MECO ? TRACKS.stack.at(time) : TRACKS.upper.at(time);
    const b = TRACKS.booster.at(time);
    let event = FLIGHT_EVENTS[0];
    for (const e of FLIGHT_EVENTS) if (e.t <= time) event = e;
    ui.onUpdate?.({ time, upper: u, booster: onStack ? null : b, event });
  }

  // Frame everything drawn so far (plus the droneship), seen from the side,
  // with a margin. Works for any viewer shape, including narrow phones.
  const centre = new THREE.Vector3(), size = new THREE.Vector3();
  const VIEW_DIR = new THREE.Vector3(0, 0.12, 1).normalize();
  function fit(out) {
    const box = drawn.clone().expandByPoint(ship.position);
    box.getCenter(centre); box.getSize(size);
    const radius = Math.max(3, 0.5 * Math.hypot(size.x, size.y)) * 1.15;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = radius / Math.tan(Math.min(vfov, hfov) / 2);
    out.target.copy(centre);
    out.position.copy(centre).addScaledVector(VIEW_DIR, dist);
    return out;
  }
  const goal = { target: new THREE.Vector3(), position: new THREE.Vector3() };
  function frameCamera() {
    fit(goal);
    controls.target.copy(goal.target);
    camera.position.copy(goal.position);
    viewer.invalidate();
  }
  viewer.onResize = (w, h) => { lineMats.forEach((m) => m.resolution.set(w, h)); if (follow) frameCamera(); };
  lineMats.forEach((m) => m.resolution.set(container.clientWidth || 1, container.clientHeight || 1));
  controls.minDistance = 3;
  update();
  frameCamera();
  controls.addEventListener('start', () => { follow = false; });

  const advance = (dt) => {
    time += dt * 20; // 20× real time
    if (time >= END_TIME) { time = END_TIME; playing = false; ui.onPlayState?.(false); }
    update();
  };
  viewer.onFrame = (dt) => {
    if (!playing) return false;
    advance(dt);
    if (follow) {
      // Ease towards a framing that keeps the whole path in view.
      fit(goal);
      const k = viewer.motion === 'reduced' ? 1 : Math.min(1, dt * 2);
      controls.target.lerp(goal.target, k);
      camera.position.lerp(goal.position, k);
    }
    return true;
  };
  // Pause rather than freeze silently when the scene scrolls off screen.
  viewer.onVisibility = (on) => { if (!on && playing) { playing = false; ui.onPlayState?.(false); } };

  update();
  return {
    play() { if (time >= END_TIME) time = 0; playing = true; follow = true; ui.onPlayState?.(true); },
    pause() { playing = false; ui.onPlayState?.(false); },
    seek(t) { time = t; update(); if (follow) frameCamera(); viewer.invalidate(); },
    get playing() { return playing; },
    setExaggeration(x) { exaggeration = x; update(); if (follow) frameCamera(); viewer.invalidate(); },
    reframe() { follow = true; frameCamera(); },
  };
}
