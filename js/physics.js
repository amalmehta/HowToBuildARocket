// Pure physics and unit helpers. No DOM, so they run in Node tests too.

export const G0 = 9.80665; // standard gravity, m/s²
export const EARTH_RADIUS_KM = 6371;
export const MU_EARTH = 398600.4418; // km³/s²

// Tsiolkovsky rocket equation: Δv = Isp · g0 · ln(m0 / mf)
export function deltaV(ispSeconds, wetMass, dryMass) {
  if (!(wetMass > 0) || !(dryMass > 0) || dryMass > wetMass) return NaN;
  return ispSeconds * G0 * Math.log(wetMass / dryMass);
}

// Mass ratio needed for a given Δv.
export function massRatioFor(dv, ispSeconds) {
  return Math.exp(dv / (ispSeconds * G0));
}

// Circular orbital speed at altitude (km), returned in m/s.
export function orbitalSpeed(altitudeKm) {
  return Math.sqrt(MU_EARTH / (EARTH_RADIUS_KM + altitudeKm)) * 1000;
}

// Thrust-to-weight ratio at liftoff.
export function thrustToWeight(thrustNewtons, massKg) {
  return thrustNewtons / (massKg * G0);
}

// Two-stage vehicle. Stage masses in kg. `landingReserve` is the fraction of
// first-stage propellant kept back for boostback, entry and landing burns.
// The fairing rides through stage 1 and the first `fairingFrac` of the
// stage-2 burn (Falcon 9 drops it about 35 s into a ~400 s burn).
export function twoStage({ s1Dry, s1Prop, s1Isp, s2Dry, s2Prop, s2Isp, payload, fairing = 0, landingReserve = 0, fairingFrac = 0.09 }) {
  const s2Wet = s2Dry + s2Prop + payload;
  const early = s2Prop * fairingFrac;
  const dv2 = deltaV(s2Isp, s2Wet + fairing, s2Wet + fairing - early)
    + deltaV(s2Isp, s2Wet - early, s2Dry + payload);

  const reserve = s1Prop * landingReserve;
  const s1Wet = s1Dry + s1Prop + fairing + s2Wet;
  const s1Burnout = s1Dry + reserve + fairing + s2Wet;
  const dv1 = deltaV(s1Isp, s1Wet, s1Burnout);

  return { dv1, dv2, total: dv1 + dv2, liftoffMass: s1Wet };
}

// Largest payload (kg) that still reaches `targetDv`, found by bisection.
export function maxPayload(stages, targetDv, hi = 100000) {
  let lo = 0;
  if (twoStage({ ...stages, payload: 0 }).total < targetDv) return 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (twoStage({ ...stages, payload: mid }).total >= targetDv) lo = mid;
    else hi = mid;
  }
  return lo;
}

// Unit conversion. Every quantity is stored in SI and converted on display.
const IMPERIAL = {
  m: { unit: 'ft', f: 3.28084 },
  km: { unit: 'mi', f: 0.621371 },
  kg: { unit: 'lb', f: 2.20462 },
  t: { unit: 'short tons', f: 1.10231 },
  MN: { unit: 'lbf', f: 224809 },
  kN: { unit: 'lbf', f: 224.809 },
  'm/s': { unit: 'mph', f: 2.23694 },
  'km/s': { unit: 'mph', f: 2236.94 }, // one imperial speed unit everywhere
  MPa: { unit: 'psi', f: 145.038 },
  K: { unit: '°F', convert: (k) => (k - 273.15) * 9 / 5 + 32 },
  '°C': { unit: '°F', convert: (c) => c * 9 / 5 + 32 },
  'kg/m³': { unit: 'lb/ft³', f: 0.062428 },
  '$/kg': { unit: '$/lb', f: 1 / 2.20462 },
};

export function convert(value, unit, system) {
  if (system !== 'imperial' || !IMPERIAL[unit]) return { value, unit };
  const c = IMPERIAL[unit];
  return { value: c.convert ? c.convert(value) : value * c.f, unit: c.unit };
}

export function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const d = abs >= 100 ? Math.min(digits, 0) : digits;
  // Avoid "-0" for tiny negatives that round to zero.
  if (Math.round(abs * 10 ** d) === 0) value = 0;
  // A real minus sign reads better than a hyphen.
  return value.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 }).replace(/^-/, '−');
}

export function formatQuantity(value, unit, system, digits = 0) {
  const c = convert(value, unit, system);
  return `${formatNumber(c.value, digits)} ${c.unit}`;
}

// Replace {q:value:unit[:digits]} tokens in text. `wrap(value, unit, digits)`
// returns the replacement (plain text, or a live-updating span).
export function fillQuantities(text, wrap) {
  return text.replace(/\{q:(-?[\d.]+):([^:}]+)(?::(\d))?\}/g, (_, v, u, d) => wrap(Number(v), u, Number(d || 0)));
}

// Monotone cubic interpolation (Fritsch–Carlson) through [t, ...values] key
// points sorted by t. Smooth, passes through every key point, and never
// overshoots between them (so altitude can't dip below zero before landing).
export function monotoneTrack(keys) {
  const n = keys.length;
  const ts = keys.map((k) => k[0]);
  const dims = keys[0].length - 1;
  const slopes = [];
  for (let d = 0; d < dims; d++) {
    const y = keys.map((k) => k[d + 1]);
    const delta = [];
    for (let i = 0; i < n - 1; i++) delta.push((y[i + 1] - y[i]) / (ts[i + 1] - ts[i]));
    const m = new Array(n);
    m[0] = delta[0]; m[n - 1] = delta[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (delta[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / delta[i], b = m[i + 1] / delta[i], h = a * a + b * b;
      if (h > 9) { const s = 3 / Math.sqrt(h); m[i] = s * a * delta[i]; m[i + 1] = s * b * delta[i]; }
    }
    slopes.push({ y, m });
  }
  const start = ts[0], end = ts[n - 1];
  return {
    start, end,
    at(t) {
      t = Math.min(Math.max(t, start), end);
      let i = 0;
      while (i < n - 2 && t > ts[i + 1]) i++;
      const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h;
      const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
      return slopes.map(({ y, m }) => h00 * y[i] + h10 * h * m[i] + h01 * y[i + 1] + h11 * h * m[i + 1]);
    },
  };
}
