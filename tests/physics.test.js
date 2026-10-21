import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deltaV, massRatioFor, orbitalSpeed, thrustToWeight, twoStage, maxPayload, convert, formatQuantity } from '../js/physics.js';
import { STAGES, SPECS, DV_BUDGET } from '../js/data.js';

const spec = (id) => {
  const s = SPECS.find((x) => x.id === id);
  assert.ok(s, `no spec with id ${id}`);
  return s.value;
};

test('rocket equation matches a hand calculation', () => {
  // 300 s, mass ratio e → Δv = 300 · 9.80665
  assert.ok(Math.abs(deltaV(300, Math.E, 1) - 2941.995) < 0.01);
  assert.ok(Number.isNaN(deltaV(300, 1, 2)), 'dry heavier than wet is invalid');
  assert.ok(Math.abs(massRatioFor(deltaV(311, 10, 1), 311) - 10) < 1e-9);
});

test('circular orbit speed at 200 km is about 7.79 km/s', () => {
  assert.ok(Math.abs(orbitalSpeed(200) - 7784) < 10);
});

test('Falcon 9 liftoff thrust-to-weight is about 1.4', () => {
  const thrust = spec('thrust') * 1000;
  const mass = spec('mass');
  const twr = thrustToWeight(thrust, mass);
  assert.ok(twr > 1.3 && twr < 1.5, `twr ${twr}`);
});

// Stage masses are public estimates, so only a loose match is expected.
test('the stage-mass estimates add up to the published liftoff mass (within 2%)', () => {
  const { liftoffMass } = twoStage({ ...STAGES, payload: 22800 });
  const published = spec('mass');
  assert.ok(Math.abs(liftoffMass - published) / published < 0.02, `${liftoffMass}`);
});

test('expendable Falcon 9 with 22.8 t reaches roughly LEO Δv', () => {
  const needed = DV_BUDGET.reduce((a, b) => a + b.value, 0);
  const { total } = twoStage({ ...STAGES, payload: 22800 });
  assert.ok(needed > 8500 && needed < 9500, `needed ${needed}`);
  assert.ok(Math.abs(total - needed) / needed < 0.05, `total ${total} vs ${needed}`);
});

test('keeping propellant back for landing costs payload', () => {
  const needed = DV_BUDGET.reduce((a, b) => a + b.value, 0);
  const expendable = maxPayload(STAGES, needed);
  const reusable = maxPayload({ ...STAGES, landingReserve: 0.1 }, needed);
  // Published: 22.8 t expendable; at least 17.4 t with a droneship landing.
  assert.ok(Math.abs(expendable - spec('leo')) / spec('leo') < 0.03, `expendable ${expendable}`);
  assert.ok(reusable > 15500 && reusable < 18500, `reusable ${reusable}`);
  assert.equal(maxPayload({ ...STAGES, s1Prop: 1000, s2Prop: 1000 }, needed), 0);
});

test('unit conversion', () => {
  assert.deepEqual(convert(70, 'm', 'metric'), { value: 70, unit: 'm' });
  assert.equal(Math.round(convert(70, 'm', 'imperial').value), 230);
  assert.equal(Math.round(convert(3670, 'K', 'imperial').value), 6146);
  assert.equal(formatQuantity(549054, 'kg', 'metric'), '549,054 kg');
  assert.equal(formatQuantity(-0.3, 'm/s', 'metric'), '0 m/s', 'no "-0"');
  // One imperial speed unit everywhere.
  assert.equal(convert(7.8, 'km/s', 'imperial').unit, convert(7800, 'm/s', 'imperial').unit);
  assert.ok(Math.abs(convert(7.8, 'km/s', 'imperial').value - convert(7800, 'm/s', 'imperial').value) < 1);
});
