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

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v);
}

// rows: [{ label, value, group, note }]
// groups: { key: { label, color } } — color is a CSS variable name
export function barChart(host, { rows, groups, format, axisFormat = format, caption }) {
  host.classList.add('chart');
  host.innerHTML = '';

  if (groups && Object.keys(groups).length > 1) {
    const legend = document.createElement('div');
    legend.className = 'legend';
    legend.innerHTML = Object.values(groups).map((g) => `<span><i style="background:var(${g.color})"></i>${g.label}</span>`).join('');
    host.appendChild(legend);
  }

  const wrap = document.createElement('div');
  wrap.className = 'chart-plot';
  host.appendChild(wrap);
  const tip = tooltip(wrap);

  const draw = () => {
    wrap.querySelector('svg')?.remove();
    const W = Math.max(240, wrap.clientWidth);
    // Narrow screens put each label above its bar instead of beside it.
    const stacked = W < 520;
    const labelW = stacked ? 0 : Math.min(220, W * 0.38);
    const rowH = stacked ? 48 : 34, gap = 10, top = 6, bottom = 26;
    const H = top + rows.length * rowH + bottom;
    const plotW = W - labelW - (stacked ? 70 : 64);
    const max = niceMax(Math.max(...rows.map((r) => r.value)));
    const x = (v) => labelW + (v / max) * plotW;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': caption });
    wrap.prepend(svg);

    // Gridlines and ticks.
    const ticks = stacked ? 2 : 4;
    for (let i = 0; i <= ticks; i++) {
      const v = (max / ticks) * i;
      el('line', { x1: x(v), x2: x(v), y1: top, y2: H - bottom, class: i === 0 ? 'axis' : 'grid' }, svg);
      const t = el('text', { x: x(v), y: H - 8, class: 'tick', 'text-anchor': i === 0 && stacked ? 'start' : 'middle' }, svg);
      t.textContent = axisFormat(v);
    }

    rows.forEach((r, i) => {
      const y = top + i * rowH;
      const g = el('g', { class: 'bar-row', tabindex: 0 }, svg);
      const name = stacked
        ? el('text', { x: 0, y: y + 14, class: 'row-label' }, g)
        : el('text', { x: labelW - 10, y: y + rowH / 2 + 4, class: 'row-label', 'text-anchor': 'end' }, g);
      name.textContent = r.label;
      const w = Math.max(2, x(r.value) - labelW);
      const by = stacked ? y + 20 : y + gap / 2;
      const bh = stacked ? 20 : rowH - gap;
      // Bar with a rounded data end and a square baseline end.
      el('path', {
        d: `M${labelW},${by} h${Math.max(0, w - 4)} a4,4 0 0 1 4,4 v${bh - 8} a4,4 0 0 1 -4,4 h${-Math.max(0, w - 4)} z`,
        style: `fill: var(${groups?.[r.group]?.color || '--series-1'})`,
        class: 'bar',
      }, g);
      const val = el('text', { x: x(r.value) + 6, y: by + bh / 2 + 4, class: 'value' }, g);
      val.textContent = format(r.value);
      // Bigger hit target than the bar itself.
      const hit = el('rect', { x: 0, y, width: W, height: rowH, class: 'hit' }, g);
      const show = () => {
        g.classList.add('hover');
        const gl = groups?.[r.group]?.label;
        tip.show(`<strong>${r.label}</strong><br>${format(r.value)}${gl ? ` · ${gl}` : ''}${r.note ? `<br><span class="muted">${r.note}</span>` : ''}`, x(r.value) / W * wrap.clientWidth, (y / H) * svg.getBoundingClientRect().height);
      };
      const hide = () => { g.classList.remove('hover'); tip.hide(); };
      hit.addEventListener('pointerenter', show);
      hit.addEventListener('pointerleave', hide);
      g.addEventListener('focus', show);
      g.addEventListener('blur', hide);
    });
  };

  draw();
  let lastW = wrap.clientWidth;
  new ResizeObserver(() => { if (wrap.clientWidth !== lastW) { lastW = wrap.clientWidth; draw(); } }).observe(wrap);

  // Table view.
  const details = document.createElement('details');
  details.className = 'table-view';
  details.innerHTML = `<summary>Show as table</summary><table><thead><tr><th>Item</th><th class="num">Value</th>${rows.some((r) => r.note) ? '<th>Note</th>' : ''}</tr></thead><tbody>${rows.map((r) => `<tr><td>${r.label}</td><td class="num">${format(r.value)}</td>${rows.some((x) => x.note) ? `<td>${r.note || ''}</td>` : ''}</tr>`).join('')}</tbody></table>`;
  host.appendChild(details);
  return { redraw: draw };
}
