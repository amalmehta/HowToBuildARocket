// Every number on the site lives here, with where it came from.
// Figures marked `estimate: true` are public estimates, not SpaceX-published.

export const SOURCES = {
  spacex: { label: 'SpaceX — Falcon 9 vehicle page', url: 'https://www.spacex.com/vehicles/falcon-9/' },
  spacexRideshare: { label: 'SpaceX — Rideshare program', url: 'https://www.spacex.com/rideshare/' },
  nasaCost: { label: 'NASA (2011) — Falcon 9 Launch Vehicle NAFCOM Cost Estimates', url: 'https://www.nasa.gov/wp-content/uploads/2015/01/586023main_8-3-11_nafcom.pdf' },
  nasaCots: { label: 'NASA (2014) — COTS: A New Era in Spaceflight', url: 'https://www.nasa.gov/wp-content/uploads/2016/08/sp-2014-617.pdf' },
  jones: { label: 'Jones, H. (2018) — The Recent Large Reduction in Space Launch Cost, ICES-2018-81', url: 'https://ntrs.nasa.gov/citations/20200001093' },
  faa: { label: 'FAA — 14 CFR Part 450 launch and reentry licensing', url: 'https://www.faa.gov/space/licenses' },
  nasaRocketEq: { label: 'NASA Glenn — Ideal rocket equation', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/' },
  sutton: { label: 'Sutton & Biblarz — Rocket Propulsion Elements (9th ed.)', url: 'https://www.wiley.com/en-us/Rocket+Propulsion+Elements%2C+9th+Edition-p-9781118753651' },
  wiki: { label: 'Wikipedia — Falcon 9 (secondary source for mass estimates)', url: 'https://en.wikipedia.org/wiki/Falcon_9' },
};

// Falcon 9 Block 5 headline specs (SI). Source: SpaceX vehicle page.
export const SPECS = [
  { label: 'Height', value: 70, unit: 'm', src: 'spacex' },
  { label: 'Diameter', value: 3.7, unit: 'm', digits: 1, src: 'spacex' },
  { label: 'Liftoff mass', value: 549054, unit: 'kg', src: 'spacex' },
  { label: 'Payload to low Earth orbit', value: 22800, unit: 'kg', src: 'spacex', note: 'expendable' },
  { label: 'Payload to GTO', value: 8300, unit: 'kg', src: 'spacex', note: 'expendable' },
  { label: 'Liftoff thrust', value: 7607, unit: 'kN', src: 'spacex', note: '9 × Merlin 1D' },
];

// Stage masses are public estimates; SpaceX publishes only totals.
export const STAGES = {
  s1Dry: 25600, s1Prop: 395700, s1Isp: 296,   // average of sea-level 282 s and vacuum 311 s
  s2Dry: 3900, s2Prop: 92670, s2Isp: 348,
  fairing: 1700,
  estimate: true, src: 'wiki',
};

export const ENGINE = {
  name: 'Merlin 1D',
  cycle: 'Gas-generator, open cycle',
  propellants: 'Liquid oxygen + RP-1 (rocket-grade kerosene)',
  facts: [
    { label: 'Sea-level thrust (each)', value: 845, unit: 'kN', src: 'spacex' },
    { label: 'Specific impulse, sea level', value: 282, unit: 's', src: 'spacex' },
    { label: 'Specific impulse, vacuum (MVac)', value: 348, unit: 's', src: 'spacex' },
    { label: 'Chamber pressure', value: 9.7, unit: 'MPa', digits: 1, src: 'wiki', estimate: true },
    { label: 'Combustion temperature', value: 3670, unit: 'K', src: 'sutton', estimate: true },
    { label: 'Mixture ratio (O/F by mass)', value: 2.36, unit: '', digits: 2, src: 'wiki', estimate: true },
  ],
};

// A from-scratch programme, modelled on how SpaceX actually did it (2002–2018).
export const ROADMAP = [
  {
    phase: 'Company and capital', years: 'Year 0', cost: '$100–300M to first orbit',
    what: 'Incorporate, raise money, hire 20–50 core engineers (propulsion, structures, avionics, GNC). Pick a single customer anchor — SpaceX had NASA COTS (about $396M) and early DoD contracts.',
    ref: 'SpaceX founded 2002 with ~$100M of founder capital.', gate: 'Funded for at least 3 launch attempts.',
  },
  {
    phase: 'Requirements and architecture', years: 'Year 0–1', cost: '~$5M',
    what: 'Fix the target orbit and payload, then trade off propellants, engine cycle, stage count, diameter and reuse. Choose a design you can test cheaply and often. Falcon 9 picked LOX/RP-1, one engine design for both stages, and a 3.7 m diameter that fits on US highways.',
    ref: 'One engine design for both stages means one production line.', gate: 'Architecture frozen; Δv budget closes with margin.',
  },
  {
    phase: 'Engine development', years: 'Year 0–4', cost: '$50–150M',
    what: 'This is the slowest and most important part. Design the injector, combustion chamber, nozzle, turbopump and gas generator. Expect hundreds of hot-fire tests, burned-through chambers and turbopump failures. Build the engine in-house to control cost and iteration speed.',
    ref: 'Merlin 1A (2006) → 1C → 1D (2013) → 1D Block 5 (2018).', gate: 'Full-duration hot fire at rated thrust, repeatedly.',
  },
  {
    phase: 'Test infrastructure', years: 'Year 0–2', cost: '$20–60M',
    what: 'Build or lease test stands for engines and whole stages, plus propellant storage, cryogenic plumbing and data acquisition. Each test you can run quickly makes the design better faster.',
    ref: 'SpaceX bought the McGregor, Texas site in 2003.', gate: 'Can test an engine every day, and a whole stage within a week.',
  },
  {
    phase: 'Structures and tanks', years: 'Year 1–4', cost: '$30–80M',
    what: 'Make the propellant tanks with a common dome between oxidiser and fuel, plus the interstage and thrust structure. The tank walls are aluminium-lithium, friction-stir welded. Prove them with proof-pressure and burst tests, and work out manufacturing tolerances.',
    ref: 'The Octaweb thrust structure holds 9 engines and spreads their loads.', gate: 'Tank passes burst test at ≥1.25× maximum expected pressure.',
  },
  {
    phase: 'Avionics, guidance and software', years: 'Year 1–4', cost: '$20–60M',
    what: 'Flight computers (triple-redundant), inertial navigation plus GPS, engine controllers, telemetry, and flight termination. Run hardware-in-the-loop simulations of every flight phase.',
    ref: 'Mostly commercial off-the-shelf processors, with redundancy handled in software.', gate: 'Thousands of simulated flights pass, including injected faults.',
  },
  {
    phase: 'Integration and qualification', years: 'Year 3–5', cost: '$30–100M',
    what: 'Assemble the stages, then put them through vibration, acoustic and thermal-vacuum tests, plus a full-duration static fire of the whole stage. Every anomaly feeds back into the design.',
    ref: 'Each Falcon 9 core does an acceptance static fire at McGregor.', gate: 'Stage completes a full-duration static fire.',
  },
  {
    phase: 'Launch site and licensing', years: 'Year 2–5', cost: '$50–100M',
    what: 'Lease a pad, build a horizontal integration hangar, transporter-erector, propellant farms and range interfaces. Get an FAA Part 450 launch licence, an environmental review and export-control (ITAR) compliance.',
    ref: 'SLC-40 at Cape Canaveral, leased and rebuilt.', gate: 'FAA licence issued; range safety approves flight termination.',
  },
  {
    phase: 'First flights', years: 'Year 4–6', cost: 'per attempt: vehicle plus ops',
    what: 'Plan on early failures. Instrument everything, fly, learn and fly again. Commercial customers trust you only after a run of successes.',
    ref: 'Falcon 1 failed three times before reaching orbit on 28 Sep 2008. Falcon 9 flew first on 4 Jun 2010.', gate: 'Payload in the target orbit.',
  },
  {
    phase: 'Reuse and scaled operations', years: 'Year 6–16', cost: 'mostly self-funded from launches',
    what: 'Add grid fins, landing legs, a reaction control system and engine restarts. Practise landings on the ocean surface first, then on land and droneships. Refurbish boosters and fairings, and launch more often to bring the cost per flight down.',
    ref: 'First landing 21 Dec 2015; first reflight 30 Mar 2017; Block 5 (built for reuse) flew May 2018.', gate: 'Booster turnaround measured in weeks.',
  },
];

// Where the energy goes on the way to a 200 km orbit (approximate, m/s).
export const DV_BUDGET = [
  { label: 'Orbital velocity', value: 7790, note: 'Circular speed at 200 km' },
  { label: 'Gravity losses', value: 1300, note: 'Fighting gravity while climbing' },
  { label: 'Aerodynamic drag', value: 150, note: 'Small for a large rocket' },
  { label: 'Steering losses', value: 100, note: 'Thrust not aligned with velocity' },
  { label: 'Earth’s rotation credit', value: -370, note: 'Free speed launching east from 28.5° N' },
];

export const MATERIALS = [
  { part: 'Propellant tanks (both stages)', material: 'Aluminium-lithium alloy 2195', why: 'About 10% lighter and stronger than conventional aluminium. Friction-stir welding avoids melting the joints.', temp: 'Down to −207 °C (densified LOX)' },
  { part: 'Interstage and fairing', material: 'Carbon fibre over an aluminium honeycomb core', why: 'Very stiff for its weight. It doesn’t hold propellant, so it never sees cryogenic temperatures.', temp: 'Ambient to aero-heating' },
  { part: 'Grid fins', material: 'Cast and machined titanium', why: 'Survive re-entry heating with no ablative coating. The earlier aluminium fins charred and had to be replaced each flight.', temp: '> 1,000 °C transient' },
  { part: 'Landing legs', material: 'Carbon fibre with aluminium honeycomb', why: 'Four legs about 18 m across, light enough to carry to orbit and back.', temp: 'Ambient' },
  { part: 'Combustion chamber liner', material: 'Copper alloy, regeneratively cooled', why: 'Copper conducts heat very well, so kerosene flowing through channels in the wall carries the heat away.', temp: '~3,400 °C gas side' },
  { part: 'Nozzle extension (MVac)', material: 'Niobium alloy (C-103)', why: 'Radiation-cooled. It glows orange-hot in vacuum without melting.', temp: '~1,300 °C' },
  { part: 'Turbopump and hot gas parts', material: 'Inconel nickel superalloys', why: 'Keep their strength in hot, oxygen-rich, high-pressure gas.', temp: 'Hundreds of °C' },
  { part: 'Octaweb thrust structure', material: 'Aluminium', why: 'Spreads the load of 9 engines evenly and shields engines from each other if one fails.', temp: 'Base heating' },
  { part: 'Thermal protection (engine bay)', material: 'Ablative/insulating blankets', why: 'Engine plumes heat the base of the rocket during re-entry.', temp: 'Plume heating' },
];

// Bars: Falcon 9 development cost, billions of US dollars.
// Model figures: NASA NAFCOM study (2011). SpaceX figure: company-reported
// ~$300M for Falcon 9 plus ~$90M for Falcon 1, as quoted in NASA's 2011
// Commercial Market Assessment for Crew and Cargo Systems.
export const DEV_COST = [
  { label: 'SpaceX-reported (F1 + F9)', value: 0.39, spacex: true, src: 'nasaCost' },
  { label: 'NASA model, commercial', value: 1.695, spacex: false, src: 'nasaCost' },
  { label: 'NASA model, traditional', value: 3.977, spacex: false, src: 'nasaCost' },
];

// Bars: cost to low Earth orbit, $/kg in 2018 dollars (Jones 2018, Table A2).
export const COST_PER_KG = [
  { label: 'Space Shuttle', value: 61720, spacex: false },
  { label: 'Saturn V', value: 5200, spacex: false },
  { label: 'Falcon 9', value: 2720, spacex: true },
  { label: 'Falcon Heavy', value: 1410, spacex: true },
];

// Where one Falcon 9 flight's cost goes. Shares are estimates assembled from
// public statements by SpaceX; treat them as orders of magnitude.
export const FLIGHT_COST = [
  { label: 'New second stage', value: 10, note: 'Thrown away every flight' },
  { label: 'Booster reuse (amortised)', value: 7, note: 'Spread over 20+ flights' },
  { label: 'Launch ops and range', value: 5, note: 'Pad, crew, droneship, recovery fleet' },
  { label: 'Fairing recovery', value: 1, note: 'A new fairing is about $6M' },
  { label: 'Propellant', value: 0.4, note: 'Roughly $0.2–0.5M of LOX, RP-1 and helium' },
];
export const LIST_PRICE = { value: 69.75, src: 'spacex', label: 'Published standard launch price, 2024 (US$M)' };

export const BUDGET = [
  { item: 'Engine development and production line', low: 100, high: 300 },
  { item: 'Structures, tanks and tooling', low: 50, high: 150 },
  { item: 'Avionics, GNC and flight software', low: 30, high: 100 },
  { item: 'Test sites and facilities', low: 50, high: 150 },
  { item: 'Launch pad and ground systems', low: 50, high: 150 },
  { item: 'People (300–1,000 staff over 5 years)', low: 150, high: 500 },
  { item: 'Test flights and expected failures', low: 50, high: 200 },
];

// Clickable parts in the 3D model. Heights are metres from the base.
export const PARTS = {
  engines: { name: 'Nine Merlin 1D engines', material: 'Copper-alloy chamber, Inconel turbopump', text: 'Nine engines in an octagonal ring around a centre engine (the Octaweb). If one engine fails, the other eight can still finish the mission.' },
  legs: { name: 'Landing legs', material: 'Carbon fibre / aluminium honeycomb', text: 'Folded flat against the rocket for ascent, then deployed by helium pistons seconds before touchdown.' },
  s1: { name: 'First stage', material: 'Aluminium-lithium 2195', text: 'About 41 m tall. Holds roughly 400 t of LOX and RP-1, burns for about 2.5 minutes, then flies back to land.' },
  gridfins: { name: 'Grid fins', material: 'Titanium', text: 'Four lattice fins that steer the booster through the atmosphere on the way down, like a hypersonic rudder.' },
  interstage: { name: 'Interstage', material: 'Carbon fibre composite', text: 'Connects the stages and covers the second-stage engine nozzle. Pneumatic pushers separate the stages.' },
  s2: { name: 'Second stage', material: 'Aluminium-lithium 2195', text: 'One Merlin Vacuum engine with a large niobium nozzle. It can restart several times to reach different orbits.' },
  mvac: { name: 'Merlin Vacuum', material: 'Niobium nozzle extension', text: 'Its expansion ratio is about 165:1, much larger than the sea-level engines, because there is no air pressure in vacuum to push back.' },
  fairing: { name: 'Payload fairing', material: 'Carbon fibre composite', text: '13 m tall and 5.2 m wide. Protects the payload through the atmosphere, then splits in two. Both halves parachute down for reuse.' },
  payload: { name: 'Payload', material: '—', text: 'Up to 22.8 t to low Earth orbit when the booster is expended, about 17 t when it lands on a droneship.' },
};

// Simplified flight timeline for a droneship-recovery mission to a ~200 km orbit.
export const FLIGHT_EVENTS = [
  { t: 0, name: 'Liftoff', text: '9 engines, 7.6 MN of thrust, about 1.4 times the vehicle’s weight.' },
  { t: 72, name: 'Max-Q', text: 'Peak aerodynamic pressure. Engines throttle down to protect the structure.' },
  { t: 150, name: 'Main engine cutoff', text: 'About 70 km up and 2.3 km/s. The first stage’s job is done.' },
  { t: 153, name: 'Stage separation', text: 'Pneumatic pushers separate the stages. The booster flips around with cold-gas thrusters.' },
  { t: 160, name: 'Second-stage ignition', text: 'Merlin Vacuum lights and burns for about 6 minutes.' },
  { t: 195, name: 'Fairing separation', text: 'Above most of the atmosphere, the fairing halves fall away.' },
  { t: 400, name: 'Entry burn', text: 'Three engines relight to slow the booster and shield it from re-entry heating.' },
  { t: 500, name: 'Landing burn', text: 'One engine. The booster has to reach zero speed exactly at zero height, because it can’t hover.' },
  { t: 520, name: 'Touchdown', text: 'Lands on a droneship about 600 km downrange.' },
  { t: 530, name: 'Second-stage cutoff', text: 'Orbit reached: about 7.8 km/s, once around the Earth every 88 minutes.' },
];
