// Preferences live in one place: the Settings dialog (⌘, or Ctrl+,).
// Only the choices a visitor actually makes are saved, so "match system"
// defaults keep following the OS (theme and reduced motion).

const KEY = 'rocket-settings';
const reduceMotionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

// Allowed values for each setting; the first is the default.
export const OPTIONS = {
  theme: ['system', 'light', 'dark'],
  units: ['metric', 'imperial'],
  quality: ['high', 'low'],
  motion: ['system', 'full', 'reduced'],
  autorotate: [true, false],
};
export const DEFAULTS = Object.fromEntries(Object.entries(OPTIONS).map(([k, v]) => [k, v[0]]));

// Keep only known keys with allowed values (storage can hold anything).
export function sanitize(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, allowed] of Object.entries(OPTIONS)) {
    if (k in raw && allowed.includes(raw[k])) out[k] = raw[k];
  }
  return out;
}

let chosen = {};
try { chosen = sanitize(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* storage blocked or corrupt: use defaults */ }

// Effective settings, with "system" motion resolved to full or reduced.
export function getSettings() {
  const s = { ...DEFAULTS, ...chosen };
  s.motionChoice = s.motion;
  if (s.motion === 'system') s.motion = reduceMotionQuery?.matches ? 'reduced' : 'full';
  return s;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(chosen)); } catch { /* ignore */ }
}
function notify() {
  apply();
  window.dispatchEvent(new CustomEvent('settingschange', { detail: getSettings() }));
}

export function setSetting(key, value) {
  if (!OPTIONS[key]?.includes(value)) return;
  if (value === DEFAULTS[key]) delete chosen[key]; else chosen[key] = value;
  save();
  notify();
}

export function resetSettings() {
  chosen = {};
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  notify();
}

function apply() {
  const s = getSettings();
  const root = document.documentElement;
  if (s.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', s.theme);
  root.dataset.motion = s.motion;
}

// Follow OS reduced-motion changes while "Match system" is selected.
reduceMotionQuery?.addEventListener?.('change', () => { if (getSettings().motionChoice === 'system') notify(); });

export function initSettingsDialog() {
  apply();
  const dialog = document.getElementById('settings');
  const form = dialog.querySelector('form');
  let opener = null;

  const sync = () => {
    const s = { ...DEFAULTS, ...chosen };
    form.querySelectorAll('input[name]').forEach((el) => {
      if (el.type === 'radio') el.checked = el.value === String(s[el.name]);
      else if (el.type === 'checkbox') el.checked = Boolean(s[el.name]);
    });
  };

  form.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.name || !(el.name in OPTIONS)) return;
    setSetting(el.name, el.type === 'checkbox' ? el.checked : el.value);
  });
  dialog.querySelector('[data-reset]').addEventListener('click', () => { resetSettings(); sync(); });
  dialog.addEventListener('close', () => opener?.focus());

  const open = (from) => {
    if (dialog.open || document.querySelector('dialog[open]')) return; // don't stack on another dialog
    opener = from || document.activeElement;
    sync();
    dialog.showModal();
  };
  document.querySelectorAll('[data-open-settings]').forEach((b) => b.addEventListener('click', () => open(b)));
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.isComposing || e.repeat || e.key !== ',') return;
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.isContentEditable || /^(TEXTAREA|INPUT|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    open();
  });
}
