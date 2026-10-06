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
export function twoStage({ s1Dry, s1Prop, s1Isp, s2Dry, s2Prop, s2Isp, payload, fairing = 0, landingReserve = 0 }) {
  const s2Wet = s2Dry + s2Prop + payload;
  const s2Burnout = s2Dry + payload;
  const dv2 = deltaV(s2Isp, s2Wet, s2Burnout);

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
  kN: { unit: 'lbf', f: 224.809 },
  'm/s': { unit: 'mph', f: 2.23694 },
  'km/s': { unit: 'mi/s', f: 0.621371 },
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
  return value.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

export function formatQuantity(value, unit, system, digits = 0) {
  const c = convert(value, unit, system);
  return `${formatNumber(c.value, digits)} ${c.unit}`;
}
