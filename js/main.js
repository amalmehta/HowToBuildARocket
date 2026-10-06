import { SOURCES, SPECS, STAGES, ENGINE, ROADMAP, DV_BUDGET, MATERIALS, DEV_COST, COST_PER_KG, FLIGHT_COST, LIST_PRICE, BUDGET, FLIGHT_EVENTS } from './data.js';
import { twoStage, maxPayload, orbitalSpeed, formatNumber, formatQuantity, convert } from './physics.js';
import { barChart } from './charts.js';
import { getSettings, initSettingsDialog } from './settings.js';
import { webglAvailable } from './viewer.js';

const $ = (s, r = document) => r.querySelector(s);
const units = () => getSettings().units;
const src = (key) => SOURCES[key] ? `<a href="${SOURCES[key].url}" target="_blank" rel="noopener" title="${SOURCES[key].label}">source</a>` : '';
const DV_NEEDED = DV_BUDGET.reduce((a, b) => a + b.value, 0);

// ---------- Quantities that respect the units setting ----------
function q(value, unit, digits = 0) {
  return `<span class="q" data-v="${value}" data-u="${unit}" data-d="${digits}">${formatQuantity(value, unit, units(), digits)}</span>`;
}
function refreshQuantities() {
  document.querySelectorAll('.q').forEach((e) => {
    e.textContent = formatQuantity(Number(e.dataset.v), e.dataset.u, units(), Number(e.dataset.d));
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
        <p class="small"><strong>Falcon 9:</strong> ${r.ref}</p>
        <p class="small gate"><strong>Done when:</strong> ${r.gate}</p>
      </div>
    </li>`).join('');
}

function renderEngineFacts() {
  $('#engine-facts').innerHTML = `
    <dl class="facts">
      <dt>Cycle</dt><dd>${ENGINE.cycle}</dd>
      <dt>Propellants</dt><dd>${ENGINE.propellants}</dd>
      ${ENGINE.facts.map((f) => `<dt>${f.label}</dt><dd>${f.unit === 's' || f.unit === '' ? formatNumber(f.value, f.digits || 0) + (f.unit ? ' s' : '') : q(f.value, f.unit, f.digits || 0)}${f.estimate ? ' <span class="muted small">est.</span>' : ''}</dd>`).join('')}
    </dl>`;
}

function renderMaterials() {
  $('#materials-table tbody').innerHTML = MATERIALS.map((m) => `
    <tr><th scope="row">${m.part}</th><td><strong>${m.material}</strong></td><td>${m.why}</td><td class="nowrap">${m.temp}</td></tr>`).join('');
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

function renderCharts() {
  const groups = { spacex: { label: 'SpaceX', color: '--series-2' }, other: { label: 'Other estimates / vehicles', color: '--series-1' } };
  barChart($('#chart-dev'), {
    caption: 'Falcon 9 development cost, billions of US dollars',
    rows: DEV_COST.map((d) => ({ label: d.label, value: d.value, group: d.spacex ? 'spacex' : 'other' })),
    groups, format: (v) => `$${v < 1 ? (v * 1000).toFixed(0) + 'M' : v.toFixed(2) + 'B'}`,
    axisFormat: (v) => `$${v}B`,
  });
  barChart($('#chart-kg'), {
    caption: 'Launch cost per kilogram to low Earth orbit, 2018 dollars',
    rows: COST_PER_KG.map((d) => ({ label: d.label, value: units() === 'imperial' ? d.value / 2.20462 : d.value, group: d.spacex ? 'spacex' : 'other' })),
    groups, format: (v) => `$${formatNumber(v)}/${units() === 'imperial' ? 'lb' : 'kg'}`,
    axisFormat: (v) => `$${formatNumber(v / 1000)}k`,
  });
  barChart($('#chart-flight'), {
    caption: 'Estimated cost of one Falcon 9 flight, millions of US dollars',
    rows: FLIGHT_COST.map((d) => ({ label: d.label, value: d.value, note: d.note })),
    format: (v) => `$${v < 1 ? v.toFixed(1) : formatNumber(v)}M`,
    axisFormat: (v) => `$${v}M`,
  });
  barChart($('#chart-dv'), {
    caption: 'Velocity budget to a 200 km orbit, metres per second',
    rows: DV_BUDGET.filter((d) => d.value > 0).map((d) => ({ label: d.label, value: units() === 'imperial' ? d.value * 2.23694 : d.value, note: d.note })),
    format: (v) => `${formatNumber(v)} ${units() === 'imperial' ? 'mph' : 'm/s'}`,
  });
  const flightTotal = FLIGHT_COST.reduce((a, b) => a + b.value, 0);
  $('#flight-total').textContent = `About $${Math.round(flightTotal)}M per flight, against a published price of $${LIST_PRICE.value}M.`;
}

// ---------- Rocket-equation calculator ----------
function initCalculator() {
  const form = $('#calc');
  const out = $('#calc-out');
  const read = () => Object.fromEntries([...form.querySelectorAll('input[type=range]')].map((i) => [i.name, Number(i.value)]));
  const update = () => {
    const v = read();
    form.querySelectorAll('output[data-for]').forEach((o) => {
      const val = v[o.dataset.for];
      o.textContent = o.dataset.u === 's' ? `${val} s` : o.dataset.u === '%' ? `${val}%` : formatQuantity(val * 1000, 'kg', units());
    });
    const stages = { ...STAGES, s1Isp: v.s1Isp, s2Isp: v.s2Isp, s1Prop: v.s1Prop * 1000, s2Prop: v.s2Prop * 1000, landingReserve: v.reserve / 100 };
    const r = twoStage({ ...stages, payload: v.payload * 1000 });
    const best = maxPayload(stages, DV_NEEDED);
    const ok = r.total >= DV_NEEDED;
    const pct = Math.min(100, (r.total / DV_NEEDED) * 100);
    const u = units() === 'imperial' ? 'mph' : 'm/s';
    const speed = (x) => `${formatNumber(convert(x, 'm/s', units()).value)} ${u}`;
    out.innerHTML = `
      <div class="dv-bar" role="img" aria-label="Velocity reached ${Math.round(pct)}% of what orbit needs">
        <span class="s1" style="width:${(r.dv1 / Math.max(r.total, DV_NEEDED)) * 100}%"></span><span class="s2" style="width:${(r.dv2 / Math.max(r.total, DV_NEEDED)) * 100}%"></span>
        <i class="need" style="left:${(DV_NEEDED / Math.max(r.total, DV_NEEDED)) * 100}%"></i>
      </div>
      <div class="legend"><span><i style="background:var(--series-1)"></i>Stage 1: ${speed(r.dv1)}</span><span><i style="background:var(--series-2)"></i>Stage 2: ${speed(r.dv2)}</span><span><i class="line"></i>Needed: ${speed(DV_NEEDED)}</span></div>
      <p class="verdict ${ok ? 'good' : 'bad'}"><span aria-hidden="true">${ok ? '✓' : '✕'}</span> ${ok ? 'Reaches orbit' : 'Falls back to Earth'}: total ${speed(r.total)}, ${ok ? '+' : ''}${speed(r.total - DV_NEEDED)} margin.</p>
      <p class="small muted">Most payload this rocket could carry to orbit: <strong>${formatQuantity(best, 'kg', units())}</strong>. Liftoff mass ${formatQuantity(r.liftoffMass, 'kg', units())}.</p>`;
  };
  form.addEventListener('input', update);
  form.querySelector('[data-reset]').addEventListener('click', () => { form.reset(); update(); });
  window.addEventListener('settingschange', update);
  update();
  $('#orbit-speed').innerHTML = q(orbitalSpeed(200) / 1000, 'km/s', 2);
}

// ---------- 3D scenes, loaded when they scroll near ----------
function lazy(el, load) {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '300px' });
  io.observe(el);
}

function no3d(el) {
  el.innerHTML = '<p class="no3d">3D needs WebGL, which this browser has turned off. Everything else on the page still works.</p>';
}

function init3D() {
  const has = webglAvailable();
  const rocketEl = $('#rocket3d');
  if (!has) { [rocketEl, $('#engine3d'), $('#flight3d')].forEach(no3d); return; }

  import('./rocket3d.js').then(({ mountRocket }) => {
    const r = mountRocket(rocketEl, $('#part-info'), $('#part-buttons'));
    $('#explode').addEventListener('change', (e) => r.setExploded(e.target.checked));
  }).catch((err) => { console.error(err); no3d(rocketEl); });

  lazy($('#engine3d'), () => import('./engine3d.js').then(({ mountEngine }) => {
    const e = mountEngine($('#engine3d'));
    $('#cutaway').addEventListener('change', (ev) => e.setCutaway(ev.target.checked));
    $('#hotfire').addEventListener('change', (ev) => e.setFiring(ev.target.checked));
    $('#labels').addEventListener('change', (ev) => e.setLabels(ev.target.checked));
  }).catch((err) => { console.error(err); no3d($('#engine3d')); }));

  lazy($('#flight3d'), () => import('./flight3d.js').then(({ mountFlight, END_TIME }) => {
    const slider = $('#flight-time');
    slider.max = END_TIME;
    const playBtn = $('#flight-play');
    const status = $('#flight-status');
    const list = $('#flight-events');
    list.innerHTML = FLIGHT_EVENTS.map((e) => `<li><button type="button" data-t="${e.t}"><span class="t">T+${fmtTime(e.t)}</span> ${e.name}</button></li>`).join('');
    const f = mountFlight($('#flight3d'), {
      onUpdate({ time, upper, booster, event }) {
        slider.value = time;
        status.innerHTML = `<strong>T+${fmtTime(time)}</strong> · ${event.name}<br><span class="small">${event.text}</span><br>
          <span class="small muted">Second stage: ${q(upper.h, 'km')} up, ${q(upper.x, 'km')} downrange${booster ? ` · Booster: ${q(booster.h, 'km')} up` : ''}</span>`;
        list.querySelectorAll('button').forEach((b) => b.classList.toggle('current', Number(b.dataset.t) === event.t));
      },
      onPlayState(p) { playBtn.textContent = p ? 'Pause' : 'Play'; playBtn.setAttribute('aria-pressed', String(p)); },
    });
    playBtn.addEventListener('click', () => (f.playing ? f.pause() : f.play()));
    slider.addEventListener('input', () => { f.pause(); f.seek(Number(slider.value)); });
    list.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { f.pause(); f.seek(Number(b.dataset.t)); } });
    $('#exaggeration').addEventListener('change', (e) => f.setExaggeration(Number(e.target.value)));
    $('#flight-reframe').addEventListener('click', () => f.reframe());
  }).catch((err) => { console.error(err); no3d($('#flight3d')); }));
}

function fmtTime(t) {
  const s = Math.round(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------- Feedback tab ----------
function initFeedback() {
  const dialog = $('#feedback');
  document.querySelectorAll('[data-open-feedback]').forEach((b) => b.addEventListener('click', () => dialog.showModal()));
  dialog.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = dialog.querySelector('textarea').value.trim();
    const kind = dialog.querySelector('select').value;
    if (!text) return;
    const title = `${kind}: ${text.split('\n')[0].slice(0, 60)}`;
    const url = `https://github.com/amalmehta/HowToBuildARocket/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
    dialog.close();
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
}

// ---------- Navigation highlight ----------
function initNav() {
  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((l) => { const s = document.querySelector(l.getAttribute('href')); if (s) io.observe(s); });
}

initSettingsDialog();
renderSpecs();
renderRoadmap();
renderEngineFacts();
renderMaterials();
renderBudget();
renderSources();
renderCharts();
initCalculator();
initFeedback();
initNav();
init3D();
document.querySelectorAll('[data-src]').forEach((e) => { e.innerHTML = src(e.dataset.src); });
window.addEventListener('settingschange', () => { refreshQuantities(); renderCharts(); });
