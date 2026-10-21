import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATERIALS, PARTS, FLIGHT_EVENTS, FLIGHT_TRACKS, END_TIME, SHIP_DOWNRANGE_KM, STAGES, SOURCES, ROADMAP, DEV_COST, COST_PER_KG, FLIGHT_COST } from '../js/data.js';
import { monotoneTrack, fillQuantities } from '../js/physics.js';
import { DEFAULTS, OPTIONS, sanitize } from '../js/settings.js';
import { niceMax, money } from '../js/charts.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const html = read('index.html');

test('every materials row is complete', () => {
  for (const m of MATERIALS) {
    for (const k of ['part', 'material', 'why']) assert.ok(m[k] && String(m[k]).trim(), `${m.part}: missing ${k}`);
    assert.ok(typeof m.temp === 'string' ? m.temp.trim() : Number.isFinite(m.temp.value), `${m.part}: bad temp`);
  }
});

test('every 3D part has info text, and every info entry is used by the model', () => {
  const used = new Set([...read('js/rocket3d.js').matchAll(/part\('(\w+)'/g)].map((m) => m[1]));
  assert.deepEqual([...used].sort(), Object.keys(PARTS).sort());
});

test('every src key in data points to a defined source, and every source is used', () => {
  const data = read('js/data.js');
  const used = new Set([...data.matchAll(/src: '(\w+)'/g), ...html.matchAll(/data-src="(\w+)"/g)].map((m) => m[1]));
  for (const k of used) assert.ok(SOURCES[k], `unknown source ${k}`);
  for (const k of Object.keys(SOURCES)) assert.ok(used.has(k), `source ${k} is never cited`);
  for (const s of Object.values(SOURCES)) assert.match(s.url, /^https:\/\//);
});

test('charted numbers carry a source', () => {
  for (const d of [...DEV_COST, ...COST_PER_KG]) assert.ok(d.src, `${d.label} has no source`);
  assert.ok(FLIGHT_COST.some((d) => d.src), 'flight cost needs at least the SpaceX-attributed figure sourced');
  assert.equal(ROADMAP.length, 10);
});

test('flight events are in order and inside the mission', () => {
  const ts = FLIGHT_EVENTS.map((e) => e.t);
  ts.forEach((t, i) => { if (i) assert.ok(t > ts[i - 1], `event ${i} out of order`); });
  assert.ok(ts[0] === 0 && ts.at(-1) <= END_TIME);
});

test('flight tracks join up and match the events', () => {
  const { stack, upper, booster } = FLIGHT_TRACKS;
  const ev = Object.fromEntries(FLIGHT_EVENTS.map((e) => [e.name, e.t]));
  for (const tr of [stack, upper, booster]) tr.forEach((p, i) => { if (i) assert.ok(p[0] > tr[i - 1][0], 'track times must increase'); });
  assert.deepEqual(stack.at(-1), upper[0], 'second stage starts where the stack ends');
  assert.equal(stack.at(-1)[0], ev['Main engine cutoff']);
  assert.equal(booster[0][0], ev['Stage separation']);
  assert.equal(booster.at(-1)[0], ev.Touchdown);
  assert.equal(booster.at(-1)[2], 0, 'booster lands at zero altitude');
  assert.equal(booster.at(-1)[1], SHIP_DOWNRANGE_KM, 'booster lands on the droneship');
  assert.equal(upper.at(-1)[0], END_TIME);
});

test('smoothed tracks pass through key points and never dip below ground', () => {
  for (const keys of Object.values(FLIGHT_TRACKS)) {
    const tr = monotoneTrack(keys);
    for (const [t, x, h] of keys) {
      const [px, ph] = tr.at(t);
      assert.ok(Math.abs(px - x) < 1e-9 && Math.abs(ph - h) < 1e-9);
    }
    let prevX = -Infinity;
    for (let t = tr.start; t <= tr.end; t += 0.5) {
      const [x, h] = tr.at(t);
      assert.ok(h >= -1e-9, `altitude below ground at t=${t}`);
      assert.ok(x >= prevX - 1e-9, `downrange went backwards at t=${t}`);
      prevX = x;
    }
  }
});

test('calculator defaults are Falcon 9’s figures', () => {
  const slider = (name) => {
    const m = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`));
    assert.ok(m, `no slider ${name}`);
    const attr = (a) => Number(m[0].match(new RegExp(`${a}="([^"]+)"`))[1]);
    const v = attr('value'), step = attr('step'), min = attr('min');
    // The browser snaps value to min + k·step, so the default must sit on that grid.
    assert.ok(Math.abs(((v - min) / step) - Math.round((v - min) / step)) < 1e-9, `${name}=${v} is off the step grid`);
    return v;
  };
  assert.equal(slider('s1Isp'), STAGES.s1Isp);
  assert.equal(slider('s2Isp'), STAGES.s2Isp);
  assert.equal(slider('s1Prop') * 1000, STAGES.s1Prop);
  assert.equal(slider('s2Prop') * 1000, STAGES.s2Prop);
});

test('settings defaults and dialog agree', () => {
  assert.equal(DEFAULTS.units, 'metric');
  assert.equal(DEFAULTS.theme, 'system');
  const dialog = html.match(/<dialog id="settings"[\s\S]*?<\/dialog>/)[0];
  for (const [k, values] of Object.entries(OPTIONS)) {
    assert.ok(dialog.includes(`name="${k}"`), `no control for ${k}`);
    for (const v of values) if (typeof v === 'string') assert.ok(dialog.includes(`name="${k}" value="${v}"`), `no option ${k}=${v}`);
  }
  assert.deepEqual(sanitize({ units: 'imperial', theme: 'neon', 'x"]': 1, autorotate: false }), { units: 'imperial', autorotate: false });
  assert.deepEqual(sanitize(null), {});
});

test('chart helpers', () => {
  assert.equal(niceMax(3.977), 5);
  assert.equal(niceMax(10), 10);
  assert.equal(niceMax(0.4), 0.5);
  assert.equal(niceMax(0), 1);
  assert.equal(money(390), '$390M');
  assert.equal(money(1695), '$1.7B');
  assert.equal(money(3977), '$3.98B');
  assert.equal(money(0.4), '$0.4M');
});

test('unit tokens in text are filled', () => {
  assert.equal(fillQuantities('{q:13.1:m:1} tall, {q:600:km} away', (v, u, d) => `${v.toFixed(d)}${u}`), '13.1m tall, 600km away');
  for (const e of FLIGHT_EVENTS) assert.doesNotMatch(fillQuantities(e.text, () => 'X'), /\{q:/);
  for (const p of Object.values(PARTS)) assert.doesNotMatch(fillQuantities(p.text, () => 'X'), /\{q:/);
});
