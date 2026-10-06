// Preferences live in one place: the Settings dialog (⌘, or Ctrl+,).
// Stored in localStorage when available; the site works without it.

const KEY = 'rocket-settings';
const reducedMotionOS = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const DEFAULTS = {
  theme: 'system',      // system | light | dark
  units: 'metric',      // metric | imperial
  quality: 'high',      // high | low (3D pixel ratio and detail)
  motion: reducedMotionOS ? 'reduced' : 'full',
  autorotate: true,
};

let current = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  current = { ...DEFAULTS, ...saved };
} catch { /* storage blocked: keep defaults */ }

export function getSettings() {
  return { ...current };
}

export function setSetting(key, value) {
  current[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignore */ }
  apply();
  window.dispatchEvent(new CustomEvent('settingschange', { detail: getSettings() }));
}

export function resetSettings() {
  current = { ...DEFAULTS };
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  apply();
  window.dispatchEvent(new CustomEvent('settingschange', { detail: getSettings() }));
}

function apply() {
  const root = document.documentElement;
  if (current.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', current.theme);
  root.dataset.motion = current.motion;
}

export function initSettingsDialog() {
  apply();
  const dialog = document.getElementById('settings');
  const form = dialog.querySelector('form');

  const sync = () => {
    for (const [k, v] of Object.entries(current)) {
      const inputs = form.querySelectorAll(`[name="${k}"]`);
      inputs.forEach((el) => {
        if (el.type === 'radio') el.checked = el.value === String(v);
        else if (el.type === 'checkbox') el.checked = Boolean(v);
      });
    }
  };

  form.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.name) return;
    setSetting(el.name, el.type === 'checkbox' ? el.checked : el.value);
  });
  dialog.querySelector('[data-reset]').addEventListener('click', () => { resetSettings(); sync(); });

  const open = () => { sync(); if (!dialog.open) dialog.showModal(); };
  document.querySelectorAll('[data-open-settings]').forEach((b) => b.addEventListener('click', open));
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); open(); }
  });
}
