import { SOURCES, SPECS, STAGES, ENGINE, ROADMAP, DV_BUDGET, MATERIALS, DEV_COST, COST_PER_KG, FLIGHT_COST, MUSK_MARGINAL, LIST_PRICE, BUDGET, FLIGHT_EVENTS, END_TIME } from './data.js';
import { twoStage, maxPayload, orbitalSpeed, formatNumber, formatQuantity, convert, fillQuantities } from './physics.js';
import { barChart, money } from './charts.js';
import { getSettings, initSettingsDialog } from './settings.js';
import { webglAvailable } from './webgl.js';

const $ = (s, r = document) => r.querySelector(s);
const units = () => getSettings().units;
const imperial = () => units() === 'imperial';
const src = (key) => SOURCES[key] ? ` <a href="${SOURCES[key].url}" target="_blank" rel="noopener" title="${SOURCES[key].label}">source<span class="sr-only">: ${SOURCES[key].label} (opens in a new tab)</span></a>` : '';
const DV_NEEDED = DV_BUDGET.reduce((a, b) => a + b.value, 0);
const FEEDBACK_REPO = 'https://github.com/amalmehta/HowToBuildARocket';

// ---------- Quantities that respect the units setting ----------
function q(value, unit, digits = 0) {
  return `<span class="q" data-v="${value}" data-u="${unit}" data-d="${digits}">${formatQuantity(value, unit, units(), digits)}</span>`;
}
// Text from data.js may hold {q:value:unit} tokens.
const withUnits = (text) => fillQuantities(text, q);
function refreshQuantities() {
  document.querySelectorAll('.q').forEach((e) => {
    e.textContent = formatQuantity(Number(e.dataset.v), e.dataset.u, units(), Number(e.dataset.d || 0));
  });
  document.querySelectorAll('[data-metric]').forEach((e) => {
    e.textContent = imperial() ? e.dataset.imperial : e.dataset.metric;
  });
}

// ---------- Static content ----------
function renderSpecs() {
  $('#specs').innerHTML = SPECS.map((s) => `
    <div class="stat">
      <div class="stat-value">${q(s.value, s.unit, s.digits || 0)}</div>
      <div class="stat-label">${s.label}${s.note ? ` <span class="muted">(${s.note})</span>` : ''}</div>
    </div>`).join('');
}

function renderRoadmap() {
  $('#roadmap-list').innerHTML = ROADMAP.map((r, i) => `
    <li class="step">
      <div class="step-num" aria-hidden="true">${i + 1}</div>
      <div class="step-body">
        <h3>${r.phase}</h3>
        <p class="step-meta"><span>${r.years}</span><span>${r.cost}</span></p>
        <p>${r.what}</p>
        <p class="small"><strong>Falcon 9:</strong> ${r.ref}${r.src ? src(r.src) : ''}</p>
        <p class="small gate"><strong>Done when:</strong> ${r.gate}</p>
      </div>
    </li>`).join('');
}

function renderEngineFacts() {
  const value = (f) => (f.unit === 's' ? `${formatNumber(f.value)} s` : q(f.value, f.unit, f.digits || 0));
  $('#engine-facts').innerHTML = `
    <dl class="facts">
      <dt>Cycle</dt><dd>${ENGINE.cycle}</dd>
      <dt>Propellants</dt><dd>${ENGINE.propellants}</dd>
      ${ENGINE.facts.map((f) => `<dt>${f.label}</dt><dd>${value(f)}${f.estimate ? ' <span class="muted small">est.</span>' : ''}${src(f.src)}</dd>`).join('')}
    </dl>`;
}

function renderMaterials() {
  const temp = (t) => (typeof t === 'string' ? t : `${t.value < 0 ? 'Down to ' : '~'}${q(t.value, t.unit)}${t.note ? ` (${t.note})` : ''}`);
  $('#materials-table tbody').innerHTML = MATERIALS.map((m) => `
    <tr><th scope="row">${m.part}</th><td data-label="Material"><strong>${m.material}</strong></td><td data-label="Why">${m.why}${m.src ? src(m.src) : ''}</td><td class="nowrap" data-label="Temperatures">${temp(m.temp)}</td></tr>`).join('');
}

function renderBudget() {
  const lo = BUDGET.reduce((a, b) => a + b.low, 0);
  const hi = BUDGET.reduce((a, b) => a + b.high, 0);
  $('#budget-table tbody').innerHTML = BUDGET.map((b) => `<tr><td>${b.item}</td><td class="num">$${b.low}–${b.high}M</td></tr>`).join('')
    + `<tr class="total"><td>Total to first orbit</td><td class="num">$${(lo / 1000).toFixed(1)}–${(hi / 1000).toFixed(1)}B</td></tr>`;
}

function renderSources() {
  $('#sources-list').innerHTML = Object.values(SOURCES).map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`).join('');
}

// ---------- Charts (built once, updated when units change) ----------
const charts = {};
function chartSpecs() {
  const groups = { spacex: { label: 'SpaceX', color: '--series-2' }, other: { label: 'Other estimates / vehicles', color: '--series-1' } };
  const perMass = imperial() ? 'lb' : 'kg';
  return {
    dev: {
      caption: 'Falcon 9 development cost, billions of US dollars (FY2010)',
      rows: DEV_COST.map((d) => ({ label: d.label, value: d.value, group: d.spacex ? 'spacex' : 'other' })),
      groups, format: (v) => money(v * 1000), axisFormat: (v) => `$${+v.toFixed(2)}B`,
    },
    kg: {
      caption: `Launch cost per ${imperial() ? 'pound' : 'kilogram'} to low Earth orbit, 2018 dollars`,
      rows: COST_PER_KG.map((d) => ({ label: d.label, value: imperial() ? d.value / 2.20462 : d.value, group: d.spacex ? 'spacex' : 'other', note: d.note })),
      groups, format: (v) => `$${formatNumber(v)}/${perMass}`, axisFormat: (v) => `$${formatNumber(v / 1000, 1)}k`,
    },
    flight: {
      caption: 'Estimated cost of one reused Falcon 9 flight, millions of US dollars',
      rows: FLIGHT_COST.map((d) => ({ label: d.label, value: d.value, note: d.note })),
      format: (v) => money(v), axisFormat: (v) => `$${+v.toFixed(1)}M`,
    },
    dv: {
      caption: `Velocity budget to a 200 km orbit, ${imperial() ? 'miles per hour' : 'metres per second'}`,
      rows: DV_BUDGET.map((d) => ({ label: d.label, value: convert(d.value, 'm/s', units()).value, note: d.note })),
      format: (v) => `${formatNumber(v)} ${imperial() ? 'mph' : 'm/s'}`, axisFormat: (v) => formatNumber(v),
    },
  };
}
function renderCharts() {
  const specs = chartSpecs();
  for (const [key, spec] of Object.entries(specs)) {
    if (charts[key]) charts[key].update(spec);
    else charts[key] = barChart($(`#chart-${key}`), spec);
  }
  const flightTotal = FLIGHT_COST.reduce((a, b) => a + b.value, 0);
  $('#flight-total').innerHTML = `About $${Math.round(flightTotal)}M per flight by this estimate. Musk put it at about $${MUSK_MARGINAL.value}M in 2020.${src(MUSK_MARGINAL.src)} The 2026 list price is $${LIST_PRICE.value}M.${src(LIST_PRICE.src)}`;
}

// ---------- Rocket-equation calculator ----------
function initCalculator() {
  const form = $('#calc');
  const out = $('#calc-out');
  const verdict = $('#calc-verdict');
  const read = () => Object.fromEntries([...form.querySelectorAll('input[type=range]')].map((i) => [i.name, Number(i.value)]));
  let lastVerdict = '';
  const update = (announce) => {
    const v = read();
    form.querySelectorAll('output[data-for]').forEach((o) => {
      const val = v[o.dataset.for];
      o.textContent = o.dataset.u === 's' ? `${val} s` : o.dataset.u === '%' ? `${val}%` : formatQuantity(val * 1000, 'kg', units());
    });
    const stages = { ...STAGES, s1Isp: v.s1Isp, s2Isp: v.s2Isp, s1Prop: v.s1Prop * 1000, s2Prop: v.s2Prop * 1000, landingReserve: v.reserve / 100 };
    const r = twoStage({ ...stages, payload: v.payload * 1000 });
    const best = maxPayload(stages, DV_NEEDED);
    const ok = r.total >= DV_NEEDED;
    const scale = Math.max(r.total, DV_NEEDED);
    const speed = (x) => formatQuantity(x, 'm/s', units());
    const margin = r.total - DV_NEEDED;
    out.innerHTML = `
      <div class="dv-bar" aria-hidden="true">
        <span class="s1" style="width:${(r.dv1 / scale) * 100}%"></span><span class="s2" style="width:${(r.dv2 / scale) * 100}%"></span>
        <i class="need" style="left:${(DV_NEEDED / scale) * 100}%"></i>
      </div>
      <div class="legend"><span><i style="background:var(--series-1)"></i>Stage 1: ${speed(r.dv1)}</span><span><i style="background:var(--series-2)"></i>Stage 2: ${speed(r.dv2)}</span><span><i class="line"></i>Needed: ${speed(DV_NEEDED)}</span></div>
      <p class="verdict ${ok ? 'good' : 'bad'}"><span aria-hidden="true">${ok ? '✓' : '✕'}</span> ${ok ? 'Reaches orbit' : 'Falls back to Earth'}: total ${speed(r.total)}, margin ${margin >= 0 ? '+' : '−'}${speed(Math.abs(margin))}.</p>
      <p class="small muted">Most payload this rocket could carry to orbit: <strong>${formatQuantity(best, 'kg', units())}</strong>. Liftoff mass ${formatQuantity(r.liftoffMass, 'kg', units())}.</p>`;
    // Screen readers hear the verdict only when the slider is released.
    const text = `${ok ? 'Reaches orbit' : 'Falls back to Earth'}. Most payload ${formatQuantity(best, 'kg', units())}.`;
    if (announce && text !== lastVerdict) { verdict.textContent = text; lastVerdict = text; }
  };
  form.addEventListener('input', () => update(false));
  form.addEventListener('change', () => update(true));
  form.querySelector('[data-reset]').addEventListener('click', () => { form.reset(); update(true); });
  update(false);
  $('#orbit-speed').innerHTML = q(orbitalSpeed(200) / 1000, 'km/s', 2);
  return () => update(false);
}

// ---------- 3D scenes, loaded when they scroll near ----------
function lazy(el, load) {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '300px' });
  io.observe(el);
}

function no3d(el, reason = 'webgl') {
  const msg = reason === 'webgl'
    ? '3D needs WebGL, which this browser has turned off. Everything else on the page still works.'
    : 'The 3D model couldn’t load (the 3D library comes from a CDN). Check your connection and reload. Everything else on the page still works.';
  el.innerHTML = `<p class="no3d">${msg}</p>`;
}

function init3D() {
  const rocketEl = $('#rocket3d');
  const flightControls = $('#flight .flight-ui');
  const setFlightEnabled = (on) => flightControls.querySelectorAll('button, input, select').forEach((c) => { c.disabled = !on; });
  setFlightEnabled(false);
  if (!webglAvailable()) {
    [rocketEl, $('#engine3d'), $('#flight3d')].forEach((el) => no3d(el));
    flightControls.hidden = true;
    document.querySelectorAll('#top .viewer-controls, #engineering .viewer-controls').forEach((c) => { c.hidden = true; });
    return;
  }

  import('./rocket3d.js').then(({ mountRocket }) => {
    const r = mountRocket(rocketEl, $('#part-info'), $('#part-buttons'), { formatText: withUnits });
    const explode = $('#explode');
    r.setExploded(explode.checked); // the browser may restore the checkbox on reload
    explode.addEventListener('change', (e) => r.setExploded(e.target.checked));
  }).catch((err) => { console.error(err); no3d(rocketEl, 'load'); });

  lazy($('#engine3d'), () => import('./engine3d.js').then(({ mountEngine }) => {
    const e = mountEngine($('#engine3d'));
    const sync = { cutaway: (on) => e.setCutaway(on), hotfire: (on) => e.setFiring(on), labels: (on) => e.setLabels(on) };
    for (const [id, fn] of Object.entries(sync)) {
      const box = $(`#${id}`);
      fn(box.checked);
      box.addEventListener('change', (ev) => fn(ev.target.checked));
    }
  }).catch((err) => { console.error(err); no3d($('#engine3d'), 'load'); }));

  lazy($('#flight3d'), () => import('./flight3d.js').then(({ mountFlight }) => {
    const slider = $('#flight-time');
    slider.max = END_TIME;
    const playBtn = $('#flight-play');
    const status = $('#flight-status');
    const readout = $('#flight-readout');
    const list = $('#flight-events');
    list.innerHTML = FLIGHT_EVENTS.map((e) => `<li><button type="button" data-t="${e.t}"><span class="t">T+${fmtTime(e.t)}</span> ${e.name}</button></li>`).join('');
    let lastEvent = null;
    const f = mountFlight($('#flight3d'), {
      onUpdate({ time, upper, booster, event }) {
        slider.value = time;
        slider.setAttribute('aria-valuetext', `T plus ${fmtTime(time)}, ${event.name}`);
        // The live region changes only when the mission reaches a new event.
        if (event !== lastEvent) {
          lastEvent = event;
          status.innerHTML = `<strong>${event.name}</strong> <span class="muted">(T+${fmtTime(event.t)})</span><br><span class="small">${withUnits(event.text)}</span>`;
          list.querySelectorAll('button').forEach((b) => {
            const on = Number(b.dataset.t) === event.t;
            b.classList.toggle('current', on);
            if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
          });
        }
        readout.innerHTML = `<strong>T+${fmtTime(time)}</strong> · Second stage: ${q(upper.h, 'km')} up, ${q(upper.x, 'km')} downrange${booster ? ` · Booster: ${q(booster.h, 'km')} up` : ''}`;
      },
      onPlayState(p) { playBtn.textContent = p ? 'Pause' : 'Play'; },
    });
    f.setExaggeration(Number($('#exaggeration').value));
    setFlightEnabled(true);
    playBtn.addEventListener('click', () => (f.playing ? f.pause() : f.play()));
    slider.addEventListener('input', () => { f.pause(); f.seek(Number(slider.value)); });
    list.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { f.pause(); f.seek(Number(b.dataset.t)); } });
    $('#exaggeration').addEventListener('change', (e) => f.setExaggeration(Number(e.target.value)));
    $('#flight-reframe').addEventListener('click', () => f.reframe());
  }).catch((err) => { console.error(err); no3d($('#flight3d'), 'load'); flightControls.hidden = true; }));
}

function fmtTime(t) {
  const s = Math.round(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------- Feedback tab ----------
const MAX_BODY = 6000; // keeps the pre-filled issue URL well under GitHub's limit
function initFeedback() {
  const dialog = $('#feedback');
  const form = dialog.querySelector('form');
  const area = dialog.querySelector('textarea');
  let opener = null;
  document.querySelectorAll('[data-open-feedback]').forEach((b) => b.addEventListener('click', () => {
    opener = b;
    if (!dialog.open) dialog.showModal();
  }));
  area.addEventListener('input', () => area.setCustomValidity(''));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = area.value.trim();
    if (!text) { area.setCustomValidity('Write a message first.'); area.reportValidity(); return; }
    const kind = dialog.querySelector('select').value;
    const body = text.length > MAX_BODY ? `${text.slice(0, MAX_BODY)}\n\n…(truncated)` : text;
    const title = `${kind}: ${text.split('\n')[0].slice(0, 60)}`;
    window.open(`${FEEDBACK_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
    form.reset();
    dialog.close();
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
}

// ---------- Navigation highlight ----------
function initNav() {
  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => {
        const on = l.getAttribute('href') === `#${e.target.id}`;
        l.classList.toggle('active', on);
        if (on) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((l) => { const s = document.querySelector(l.getAttribute('href')); if (s) io.observe(s); });
}

// ---------- Start-up: each step isolated so one failure can't blank the page ----------
function step(name, fn) {
  try { return fn(); } catch (err) { console.error(`[${name}]`, err); return undefined; }
}

step('settings', initSettingsDialog);
step('specs', renderSpecs);
step('roadmap', renderRoadmap);
step('engine facts', renderEngineFacts);
step('materials', renderMaterials);
step('budget', renderBudget);
step('sources', renderSources);
step('charts', renderCharts);
const refreshCalculator = step('calculator', initCalculator);
step('feedback', initFeedback);
step('nav', initNav);
step('3d', init3D);
step('source links', () => document.querySelectorAll('[data-src]').forEach((e) => { e.innerHTML = src(e.dataset.src).trim(); }));
step('units', refreshQuantities);
step('shortcut hints', () => {
  // Show Ctrl instead of ⌘ outside Apple platforms.
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (mac) return;
  document.querySelectorAll('.kbd-mod').forEach((e) => { e.textContent = 'Ctrl'; });
  document.querySelectorAll('[data-open-settings]').forEach((b) => { b.title = 'Settings (Ctrl+,)'; });
});

let lastUnits = units();
window.addEventListener('settingschange', (e) => {
  if (e.detail.units === lastUnits) return;
  lastUnits = e.detail.units;
  step('units', refreshQuantities);
  step('charts', renderCharts);
  refreshCalculator?.();
});
