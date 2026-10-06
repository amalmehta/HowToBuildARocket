import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deltaV, massRatioFor, orbitalSpeed, thrustToWeight, twoStage, maxPayload, convert, formatQuantity } from '../js/physics.js';
import { STAGES, SPECS, DV_BUDGET } from '../js/data.js';

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
  const thrust = SPECS.find((s) => s.label === 'Liftoff thrust').value * 1000;
  const mass = SPECS.find((s) => s.label === 'Liftoff mass').value;
  const twr = thrustToWeight(thrust, mass);
  assert.ok(twr > 1.3 && twr < 1.5, `twr ${twr}`);
});

// Stage masses are public estimates, so only a loose match is expected.
test('the stage-mass estimates add up to the published liftoff mass (within 2%)', () => {
  const { liftoffMass } = twoStage({ ...STAGES, payload: 22800 });
  const published = SPECS.find((s) => s.label === 'Liftoff mass').value;
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
  assert.ok(expendable > 15000 && expendable < 30000, `expendable ${expendable}`);
  assert.ok(reusable < expendable * 0.9, `reusable ${reusable}`);
  assert.equal(maxPayload({ ...STAGES, s1Prop: 1000, s2Prop: 1000 }, needed), 0);
});

test('unit conversion', () => {
  assert.deepEqual(convert(70, 'm', 'metric'), { value: 70, unit: 'm' });
  assert.equal(Math.round(convert(70, 'm', 'imperial').value), 230);
  assert.equal(Math.round(convert(3670, 'K', 'imperial').value), 6146);
  assert.equal(formatQuantity(549054, 'kg', 'metric'), '549,054 kg');
});
