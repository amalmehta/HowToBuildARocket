// Small hand-rolled SVG charts: horizontal bars with hover tooltips,
// a legend, and a table view for screen readers and copying numbers.

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

function tooltip(host) {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.hidden = true;
  host.appendChild(tip);
  return {
    show(html, x, y) {
      tip.innerHTML = html;
      tip.hidden = false;
      const hw = host.clientWidth;
      const w = tip.offsetWidth;
      tip.style.left = `${Math.min(Math.max(4, x - w / 2), hw - w - 4)}px`;
      tip.style.top = `${y - tip.offsetHeight - 10}px`;
    },
    hide() { tip.hidden = true; },
  };
}

// The smallest "round" axis maximum at or above v (1, 2, 2.5 or 5 × 10ⁿ).
export function niceMax(v) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v * (1 - 1e-12));
}

// Axis range with a round tick step (1, 2, 2.5 or 5 × 10ⁿ) giving about five
// ticks, preferring the tighter range on ties. Includes zero.
export function niceScale(lo, hi) {
  lo = Math.min(0, lo); hi = Math.max(0, hi);
  const span = hi - lo || 1;
  let best = null;
  for (let p = Math.floor(Math.log10(span)) - 2; p <= Math.floor(Math.log10(span)) + 1; p++) {
    for (const m of [1, 2, 2.5, 5]) {
      const step = m * 10 ** p;
      const a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step;
      const n = Math.round((b - a) / step);
      const score = Math.abs(n - 5) + (n < 3 ? 10 : 0);
      if (!best || score < best.score || (score === best.score && b - a < best.hi - best.lo)) best = { lo: a, hi: b, step, score };
    }
  }
  return { lo: best.lo, hi: best.hi, step: best.step };
}

// Millions of dollars → "$390M", "$1.38B", "$0.4M" (no trailing zeros).
export function money(millions) {
  if (millions >= 1000) return `$${+(millions / 1000).toFixed(2)}B`;
  if (millions < 1) return `$${+millions.toFixed(1)}M`;
  return `$${+millions.toFixed(millions < 10 ? 1 : 0)}M`;
}

// rows: [{ label, value, group, note }]
// groups: { key: { label, color } } — color is a CSS variable name
// Returns { update(spec), destroy() } so the chart can change units in place.
export function barChart(host, spec) {
  let { rows, groups, format, axisFormat = format, caption } = spec;
  host.classList.add('chart');
  host.innerHTML = '';

  const legend = document.createElement('div');
  legend.className = 'legend';
  host.appendChild(legend);

  const wrap = document.createElement('div');
  wrap.className = 'chart-plot';
  host.appendChild(wrap);
  const tip = tooltip(wrap);

  const details = document.createElement('details');
  details.className = 'table-view';
  host.appendChild(details);

  const renderLegend = () => {
    const show = groups && Object.keys(groups).length > 1;
    legend.hidden = !show;
    legend.innerHTML = show ? Object.values(groups).map((g) => `<span><i style="background:var(${g.color})"></i>${g.label}</span>`).join('') : '';
  };
  const renderTable = () => {
    const notes = rows.some((r) => r.note);
    const body = rows.map((r) => `<tr><td>${r.label}</td><td class="num">${format(r.value)}</td>${notes ? `<td>${r.note || ''}</td>` : ''}</tr>`).join('');
    details.innerHTML = `<summary>Show as table</summary><table><caption class="sr-only">${caption}</caption><thead><tr><th scope="col">Item</th><th scope="col" class="num">Value</th>${notes ? '<th scope="col">Note</th>' : ''}</tr></thead><tbody>${body}</tbody></table>`;
  };

  let current = 0; // which bar holds the chart's tab stop
  const draw = () => {
    tip.hide();
    if (current >= rows.length) current = 0;
    const focusedRow = wrap.querySelector('.bar-row:focus')?.dataset.i;
    wrap.querySelector('svg')?.remove();
    const W = Math.max(240, wrap.clientWidth);
    const svg = el('svg', { viewBox: `0 0 ${W} 10`, width: W, height: 10, role: 'group', 'aria-label': caption });
    wrap.prepend(svg);
    // Measure the longest label; if it won't fit beside the bars, put labels above them.
    const probe = el('text', { class: 'row-label' }, svg);
    let longest = 0;
    for (const r of rows) { probe.textContent = r.label; longest = Math.max(longest, probe.getComputedTextLength?.() || r.label.length * 7); }
    probe.remove();
    const stacked = W < 520 || longest + 12 > W * 0.45;
    const labelW = stacked ? 0 : Math.ceil(longest + 12);
    const rowH = stacked ? 48 : 34, gap = 10, top = 6, bottom = 26;
    const H = top + rows.length * rowH + bottom;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('height', H);
    const valueRoom = 72;
    const scale = niceScale(Math.min(...rows.map((r) => r.value)), Math.max(...rows.map((r) => r.value)));
    const negRoom = scale.lo < 0 ? 8 : 0; // room for a value label left of a negative bar
    const plotW = W - labelW - valueRoom - negRoom;
    const x = (v) => labelW + negRoom + ((v - scale.lo) / (scale.hi - scale.lo)) * plotW;
    const x0 = x(0);

    // Gridlines and ticks (every other tick on narrow layouts).
    const nTicks = Math.round((scale.hi - scale.lo) / scale.step);
    for (let i = 0; i <= nTicks; i++) {
      const v = scale.lo + scale.step * i;
      const isZero = Math.abs(v) < scale.step * 1e-6;
      el('line', { x1: x(v), x2: x(v), y1: top, y2: H - bottom, class: isZero ? 'axis' : 'grid' }, svg);
      if (stacked && i % 2 && i !== nTicks) continue;
      const t = el('text', { x: x(v), y: H - 8, class: 'tick', 'text-anchor': i === 0 && stacked ? 'start' : i === nTicks && stacked ? 'end' : 'middle' }, svg);
      t.textContent = axisFormat(isZero ? 0 : v);
    }

    rows.forEach((r, i) => {
      const y = top + i * rowH;
      // One tab stop per chart; arrow keys move between bars (roving tabindex).
      const g = el('g', { class: 'bar-row', tabindex: i === current ? 0 : -1, role: 'img', 'aria-label': `${r.label}: ${format(r.value)}${r.note ? `. ${r.note}` : ''}`, 'data-i': i }, svg);
      const name = stacked
        ? el('text', { x: 0, y: y + 14, class: 'row-label' }, g)
        : el('text', { x: labelW - 10, y: y + rowH / 2 + 4, class: 'row-label', 'text-anchor': 'end' }, g);
      name.textContent = r.label;
      const by = stacked ? y + 20 : y + gap / 2;
      const bh = stacked ? 20 : rowH - gap;
      const end = x(r.value);
      const w = Math.max(1, Math.abs(end - x0));
      const dir = r.value < 0 ? -1 : 1;
      const rad = Math.min(4, w / 2);
      // Bar with a rounded data end and a square end on the zero line.
      el('path', {
        d: `M${x0},${by} h${dir * (w - rad)} a${rad},${rad} 0 0 ${dir > 0 ? 1 : 0} ${dir * rad},${rad} v${bh - 2 * rad} a${rad},${rad} 0 0 ${dir > 0 ? 1 : 0} ${-dir * rad},${rad} h${-dir * (w - rad)} z`,
        style: `fill: var(${groups?.[r.group]?.color || '--series-1'})`,
        class: 'bar',
      }, g);
      const val = r.value < 0
        ? el('text', { x: x0 + 6, y: by + bh / 2 + 4, class: 'value' }, g)
        : el('text', { x: end + 6, y: by + bh / 2 + 4, class: 'value' }, g);
      val.textContent = format(r.value);
      // Bigger hit target than the bar itself.
      const hit = el('rect', { x: 0, y, width: W, height: rowH, class: 'hit' }, g);
      const show = () => {
        g.classList.add('hover');
        const gl = groups?.[r.group]?.label;
        tip.show(`<strong>${r.label}</strong><br>${format(r.value)}${gl ? ` · ${gl}` : ''}${r.note ? `<br><span class="muted">${r.note}</span>` : ''}`, Math.max(end, x0) / W * wrap.clientWidth, (y / H) * svg.getBoundingClientRect().height);
      };
      const hide = () => { g.classList.remove('hover'); tip.hide(); };
      hit.addEventListener('pointerenter', show);
      hit.addEventListener('pointerleave', hide);
      g.addEventListener('focus', show);
      g.addEventListener('blur', hide);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { hide(); return; }
        const next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: rows.length - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        current = Math.max(0, Math.min(rows.length - 1, next));
        const rowsEls = svg.querySelectorAll('.bar-row');
        rowsEls.forEach((r, k) => r.setAttribute('tabindex', k === current ? 0 : -1));
        rowsEls[current].focus();
      });
      if (String(i) === focusedRow) g.focus();
    });
  };

  renderLegend();
  renderTable();
  draw();
  let lastW = wrap.clientWidth;
  const ro = new ResizeObserver(() => { if (wrap.clientWidth !== lastW) { lastW = wrap.clientWidth; draw(); } });
  ro.observe(wrap);

  return {
    // Keeps the table's open/closed state and keyboard focus.
    update(next) {
      ({ rows, groups, format, axisFormat = next.format, caption } = next);
      renderLegend();
      const open = details.open;
      renderTable();
      details.open = open;
      draw();
    },
    destroy() { ro.disconnect(); host.innerHTML = ''; },
  };
}
