// Every number on the site lives here, with where it came from.
// Figures marked `estimate: true` are public estimates, not SpaceX-published.

export const SOURCES = {
  spacex: { label: 'SpaceX — Falcon 9 vehicle page', url: 'https://www.spacex.com/vehicles/falcon-9/' },
  sfnPrice: { label: 'Spaceflight Now (Feb 2026) — Falcon 9 standard price $74M for 2026', url: 'https://spaceflightnow.com/2026/02/24/live-coverage-spacex-to-launch-29-starlink-satellites-on-falcon-9-rocket-from-cape-canaveral-8/' },
  nasaCost: { label: 'NASA (2011) — Falcon 9 Launch Vehicle NAFCOM Cost Estimates', url: 'https://www.nasa.gov/wp-content/uploads/2015/01/586023main_8-3-11_nafcom.pdf' },
  nasaMarket: { label: 'NASA (2011) — Commercial Market Assessment for Crew and Cargo Systems', url: 'https://www.faa.gov/about/office_org/headquarters_offices/ast/media/Commercial%20Market%20Assessment%20Report%20Final.pdf' },
  nasaCots: { label: 'NASA (2014) — COTS: A New Era in Spaceflight', url: 'https://www.nasa.gov/wp-content/uploads/2016/08/sp-2014-617.pdf' },
  jones: { label: 'Jones, H. (2018) — The Recent Large Reduction in Space Launch Cost, ICES-2018-81', url: 'https://ntrs.nasa.gov/citations/20200001093' },
  musk: { label: 'Inverse (2020) — Musk: a reused Falcon 9 costs about $15M per flight', url: 'https://www.inverse.com/innovation/spacex-elon-musk-falcon-9-economics' },
  faa: { label: 'eCFR — 14 CFR Part 450, launch and reentry licence requirements', url: 'https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-450' },
  nasaRocketEq: { label: 'NASA Glenn — Ideal rocket equation', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/' },
  dvBudget: { label: 'Wikipedia — Delta-v budget (Earth to low Earth orbit)', url: 'https://en.wikipedia.org/wiki/Delta-v_budget' },
  sutton: { label: 'Sutton & Biblarz — Rocket Propulsion Elements (9th ed.)', url: 'https://www.wiley.com/en-us/Rocket+Propulsion+Elements%2C+9th+Edition-p-9781118753651' },
  wiki: { label: 'Wikipedia — Falcon 9 (secondary source for mass and payload estimates)', url: 'https://en.wikipedia.org/wiki/Falcon_9' },
  wikiFT: { label: 'Wikipedia — Falcon 9 Full Thrust (densified propellant, titanium grid fins)', url: 'https://en.wikipedia.org/wiki/Falcon_9_Full_Thrust' },
  merlin: { label: 'Wikipedia — SpaceX Merlin (engine figures)', url: 'https://en.wikipedia.org/wiki/SpaceX_Merlin' },
  mcgregor: { label: 'Wikipedia — SpaceX Rocket Development and Test Facility (McGregor)', url: 'https://en.wikipedia.org/wiki/SpaceX_Rocket_Development_and_Test_Facility' },
  al2195: { label: 'Wikipedia — 2195 aluminium alloy', url: 'https://en.wikipedia.org/wiki/2195_aluminium_alloy' },
  cotsWiki: { label: 'Wikipedia — Commercial Orbital Transportation Services', url: 'https://en.wikipedia.org/wiki/Commercial_Orbital_Transportation_Services' },
  blackmore: { label: 'Blackmore, L. (2016) — Autonomous Precision Landing of Space Rockets, The Bridge 46(4)', url: 'https://www.nae.edu/164270/Autonomous-Precision-Landing-of-Space-Rockets' },
};

// Falcon 9 Block 5 headline specs (SI). `id` is a stable key for code and tests.
export const SPECS = [
  { id: 'height', label: 'Height', value: 70, unit: 'm', src: 'spacex' },
  { id: 'diameter', label: 'Diameter', value: 3.7, unit: 'm', digits: 1, src: 'spacex' },
  { id: 'mass', label: 'Liftoff mass', value: 549054, unit: 'kg', src: 'spacex' },
  { id: 'leo', label: 'Payload to low Earth orbit', value: 22800, unit: 'kg', src: 'spacex', note: 'booster expended' },
  { id: 'gto', label: 'Payload to geostationary transfer orbit', value: 8300, unit: 'kg', src: 'spacex', note: 'booster expended' },
  { id: 'thrust', label: 'Liftoff thrust', value: 7607, unit: 'kN', src: 'wiki', note: '9 × Merlin 1D' },
];

// Stage masses are public estimates; SpaceX publishes only totals, so these
// add up to about 520 t (plus payload) rather than the published 549 t.
export const STAGES = {
  s1Dry: 25600, s1Prop: 395700, s1Isp: 296,   // rough midpoint of sea-level 282 s and vacuum 311 s
  s2Dry: 3900, s2Prop: 92670, s2Isp: 348,
  fairing: 1700,
  estimate: true, src: 'wiki',
};

export const ENGINE = {
  name: 'Merlin 1D',
  cycle: 'Gas-generator, open cycle',
  propellants: 'Liquid oxygen (LOX) + RP-1 (rocket-grade kerosene)',
  facts: [
    { label: 'Sea-level thrust (each)', value: 845, unit: 'kN', src: 'spacex' },
    { label: 'Specific impulse, sea level', value: 282, unit: 's', src: 'merlin' },
    { label: 'Specific impulse, vacuum', value: 311, unit: 's', src: 'merlin' },
    { label: 'Specific impulse, Merlin Vacuum (MVac)', value: 348, unit: 's', src: 'merlin' },
    { label: 'Chamber pressure', value: 9.7, unit: 'MPa', digits: 1, src: 'merlin', estimate: true },
    { label: 'Flame temperature (theoretical, about 3,670 K)', value: 3400, unit: '°C', src: 'sutton', estimate: true },
  ],
};

// A from-scratch programme, modelled on how SpaceX actually did it (2002–2018).
// Phase costs leave out staff, which the budget table counts separately.
export const ROADMAP = [
  {
    phase: 'Company and capital', years: 'Year 0', cost: 'Raise $0.5–1.6B over 5 years',
    what: 'Incorporate, raise money, hire 20–50 core engineers (propulsion, structures, avionics, and guidance, navigation and control). Pick a single anchor customer. SpaceX had NASA’s Commercial Orbital Transportation Services (COTS) programme: a $278M award, later raised to about $396M.',
    ref: 'SpaceX was founded in 2002. Musk put in about $100M of his own money over its early years.', gate: 'Funded for at least 3 launch attempts.', src: 'cotsWiki',
  },
  {
    phase: 'Requirements and architecture', years: 'Year 0–1', cost: '~$5M',
    what: 'Fix the target orbit and payload, then trade off propellants, engine cycle, stage count, diameter and reuse. Choose a design you can test cheaply and often. Falcon 9 picked liquid oxygen and kerosene (LOX/RP-1), one engine design for both stages, and a 3.7 m diameter that fits on US highways.',
    ref: 'One engine design for both stages means one production line.', gate: 'Architecture frozen; Δv budget closes with margin.',
  },
  {
    phase: 'Engine development', years: 'Year 0–4', cost: '$50–150M',
    what: 'This is the slowest and most important part. Design the injector, combustion chamber, nozzle, turbopump and gas generator. Expect hundreds of hot-fire tests, burned-through chambers and turbopump failures. Build the engine in-house to control cost and iteration speed.',
    ref: 'Merlin 1A (2006) → 1C → 1D (2013) → 1D Block 5 (2018).', gate: 'Full-duration hot fire at rated thrust, repeatedly.', src: 'merlin',
  },
  {
    phase: 'Test infrastructure', years: 'Year 0–2', cost: '$20–60M',
    what: 'Build or lease test stands for engines and whole stages, plus propellant storage, cryogenic plumbing and data acquisition. Each test you can run quickly makes the design better faster.',
    ref: 'SpaceX leased the McGregor, Texas site in 2003, and later bought land around it.', gate: 'Can test an engine every day, and a whole stage within a week.', src: 'mcgregor',
  },
  {
    phase: 'Structures and tanks', years: 'Year 1–4', cost: '$30–80M',
    what: 'Make the propellant tanks with a common dome between oxidiser and fuel, plus the interstage and thrust structure. The tank walls are aluminium-lithium, friction-stir welded. Prove them with proof-pressure and burst tests, and work out manufacturing tolerances.',
    ref: 'The Octaweb thrust structure holds 9 engines and spreads their loads.', gate: 'Tank passes burst test at ≥1.25× maximum expected pressure.',
  },
  {
    phase: 'Avionics, guidance and software', years: 'Year 1–4', cost: '$20–60M',
    what: 'Flight computers (triple-redundant), inertial navigation plus GPS, engine controllers, telemetry, and flight termination. Run simulations of every flight phase with the real flight computers connected (hardware-in-the-loop).',
    ref: 'Mostly commercial off-the-shelf processors, with redundancy handled in software.', gate: 'Thousands of simulated flights pass, including injected faults.',
  },
  {
    phase: 'Integration and qualification', years: 'Year 3–5', cost: '$30–100M',
    what: 'Assemble the stages, then put them through vibration, acoustic and thermal-vacuum tests, plus a full-duration static fire of the whole stage. Every anomaly feeds back into the design.',
    ref: 'Each new Falcon 9 core does an acceptance static fire at McGregor.', gate: 'Stage completes a full-duration static fire.', src: 'mcgregor',
  },
  {
    phase: 'Launch site and licensing', years: 'Year 2–5', cost: '$50–100M',
    what: 'Lease a pad, build a horizontal integration hangar, transporter-erector, propellant farms and range interfaces. Get an FAA launch licence under Part 450, an environmental review, and compliance with US export-control rules (ITAR, the International Traffic in Arms Regulations).',
    ref: 'Space Launch Complex 40 (SLC-40) at Cape Canaveral, leased and rebuilt. Falcon 9 was first licensed under the older Parts 415 and 417; Part 450 replaced them in 2021.', gate: 'FAA licence issued; range safety approves flight termination.', src: 'faa',
  },
  {
    phase: 'First flights', years: 'Year 4–6', cost: 'per attempt: vehicle plus ops',
    what: 'Plan on early failures. Instrument everything, fly, learn and fly again. Commercial customers trust you only after a run of successes.',
    ref: 'Falcon 1 failed three times before reaching orbit on 28 Sep 2008. Falcon 9 flew first on 4 Jun 2010.', gate: 'Payload in the target orbit.', src: 'wiki',
  },
  {
    phase: 'Reuse and scaled operations', years: 'Year 6–16', cost: 'mostly self-funded from launches',
    what: 'Add grid fins, landing legs, a reaction control system and engine restarts. Practise landings on the ocean surface first, then on land and droneships. Refurbish boosters and fairings, and launch more often to bring the cost per flight down.',
    ref: 'First landing 21 Dec 2015; first reflight 30 Mar 2017; Block 5 (built for reuse) flew May 2018. By March 2026 one booster had flown 34 times.', gate: 'Booster turnaround measured in weeks.', src: 'wiki',
  },
];

// Where the energy goes on the way to a 200 km orbit (approximate, m/s).
// Losses are at the optimistic end of the usual 1.5–2 km/s range.
export const DV_BUDGET = [
  { label: 'Orbital velocity', value: 7790, note: 'Circular speed at 200 km' },
  { label: 'Gravity losses', value: 1300, note: 'Fighting gravity while climbing' },
  { label: 'Aerodynamic drag', value: 150, note: 'Small for a large rocket' },
  { label: 'Steering losses', value: 100, note: 'Thrust not aligned with velocity' },
  { label: 'Earth’s rotation credit', value: -410, note: 'Free speed launching due east from 28.5° N (465 m/s × cos 28.5°)' },
];

export const MATERIALS = [
  { part: 'Propellant tanks (both stages)', material: 'Aluminium-lithium alloy 2195', why: 'About 5% lighter and 30% stronger than the 2219 alloy it replaced on the Shuttle tank. Friction-stir welding joins it without melting the metal.', temp: { value: -207, unit: '°C', note: 'densified LOX' }, src: 'al2195' },
  { part: 'Interstage and fairing', material: 'Carbon fibre over an aluminium honeycomb core', why: 'Very stiff for its weight. It doesn’t hold propellant, so it never sees cryogenic temperatures.', temp: 'Ambient to aero-heating' },
  { part: 'Grid fins', material: 'Cast and machined titanium', why: 'Survive re-entry heating with no ablative coating. The aluminium fins used until 2017 charred and had to be replaced after each flight.', temp: 'Re-entry heating', src: 'wikiFT' },
  { part: 'Landing legs', material: 'Carbon fibre with aluminium honeycomb', why: 'Four legs about 18 m across, light enough to carry to orbit and back.', temp: 'Ambient' },
  { part: 'Combustion chamber liner', material: 'Copper alloy, regeneratively cooled', why: 'Copper conducts heat very well, so kerosene flowing through channels in the wall carries the heat away.', temp: { value: 3400, unit: '°C', note: 'gas side, approx.' } },
  { part: 'Nozzle extension (Merlin Vacuum)', material: 'Niobium alloy (reportedly C-103)', why: 'Radiation-cooled. It glows orange-hot in vacuum without melting.', temp: { value: 1300, unit: '°C', note: 'approx.' }, src: 'merlin' },
  { part: 'Turbopump and hot gas parts', material: 'Inconel nickel superalloys', why: 'Keep their strength in hot, high-pressure gas.', temp: 'Hundreds of °C' },
  { part: 'Octaweb thrust structure', material: 'Aluminium', why: 'Spreads the load of 9 engines evenly and shields engines from each other if one fails.', temp: 'Base heating' },
  { part: 'Thermal protection (engine bay)', material: 'Ablative and insulating blankets', why: 'Engine plumes heat the base of the rocket during re-entry.', temp: 'Plume heating' },
];

// Bars: Falcon 9 development cost, billions of US dollars (FY2010).
// NASA figures: NAFCOM study (2011), initial and updated runs. SpaceX figure:
// company-reported ~$300M for Falcon 9 plus ~$90M for Falcon 1, quoted in
// NASA's 2011 Commercial Market Assessment. NASA COTS money paid for part of it.
export const DEV_COST = [
  { label: 'SpaceX-reported (Falcon 1 + Falcon 9)', value: 0.39, spacex: true, src: 'nasaMarket' },
  { label: 'NASA model, updated, fixed price', value: 0.443, spacex: false, src: 'nasaCost' },
  { label: 'NASA model, updated, cost-plus', value: 1.383, spacex: false, src: 'nasaCost' },
  { label: 'NASA model, initial, commercial', value: 1.695, spacex: false, src: 'nasaCost' },
  { label: 'NASA model, initial, traditional', value: 3.977, spacex: false, src: 'nasaCost' },
];

// Bars: cost to low Earth orbit, $/kg (Jones 2018, Table A2). Falcon figures
// are 2018 list prices ÷ maximum expendable payload; Saturn V and Shuttle are
// inflation-adjusted to 2018 dollars.
export const COST_PER_KG = [
  { label: 'Space Shuttle', value: 61720, spacex: false, src: 'jones' },
  { label: 'Saturn V', value: 5200, spacex: false, src: 'jones' },
  { label: 'Falcon 9', value: 2720, spacex: true, src: 'jones', note: 'About 1/23 of the Shuttle’s cost per kilogram' },
  { label: 'Falcon Heavy', value: 1410, spacex: true, src: 'jones', note: 'About 1/44 of the Shuttle’s cost per kilogram' },
];

// Where one reused Falcon 9 flight's cost goes. This split is the site's own
// estimate. The only SpaceX-attributed figure is Musk's 2020 statement of
// about $15M marginal cost, about $10M of it the new second stage.
export const FLIGHT_COST = [
  { label: 'New second stage', value: 10, note: 'Thrown away every flight (Musk, 2020)', src: 'musk' },
  { label: 'Booster wear (amortised)', value: 3, note: 'Spread over 30+ flights; estimate' },
  { label: 'Launch ops and range', value: 3, note: 'Pad, crew, droneship, recovery fleet; estimate' },
  { label: 'Fairing recovery', value: 1, note: 'A new fairing is about $6M; estimate' },
  { label: 'Propellant', value: 0.4, note: 'Roughly $0.2–0.5M of LOX, RP-1 and helium; estimate' },
];
export const MUSK_MARGINAL = { value: 15, src: 'musk' };
export const LIST_PRICE = { value: 74, src: 'sfnPrice', label: 'Standard Falcon 9 price, 2026 (US$M, up to 5.5 t to GTO)' };

export const BUDGET = [
  { item: 'Engine development and production line', low: 100, high: 300 },
  { item: 'Structures, tanks and tooling', low: 50, high: 150 },
  { item: 'Avionics, guidance and flight software', low: 30, high: 100 },
  { item: 'Test sites and facilities', low: 50, high: 150 },
  { item: 'Launch pad and ground systems', low: 50, high: 150 },
  { item: 'People (300–1,000 staff over 5 years)', low: 150, high: 500 },
  { item: 'Test flights and expected failures', low: 50, high: 200 },
];

// Clickable parts in the 3D model. Text may hold {q:value:unit} tokens, which
// are shown in the visitor's chosen units.
export const PARTS = {
  engines: { name: 'Nine Merlin 1D engines', material: 'Copper-alloy chamber, Inconel turbopump', text: 'Nine engines in an octagonal ring around a centre engine (the Octaweb). If one engine fails, the other eight can still finish the mission.' },
  legs: { name: 'Landing legs', material: 'Carbon fibre / aluminium honeycomb', text: 'Folded flat against the rocket for ascent, then deployed by helium pistons seconds before touchdown. About {q:18:m} across when open.' },
  s1: { name: 'First stage', material: 'Aluminium-lithium 2195', text: 'About {q:41:m} tall. Holds roughly {q:400:t} of LOX and RP-1, burns for about 2.5 minutes, then flies back to land.' },
  gridfins: { name: 'Grid fins', material: 'Titanium', text: 'Four lattice fins that steer the booster through the atmosphere on the way down, like a hypersonic rudder.' },
  interstage: { name: 'Interstage', material: 'Carbon fibre composite', text: 'Connects the stages and covers the second-stage engine nozzle. Pneumatic pushers separate the stages.' },
  s2: { name: 'Second stage', material: 'Aluminium-lithium 2195', text: 'One Merlin Vacuum engine with a large niobium nozzle. It can restart several times to reach different orbits.' },
  mvac: { name: 'Merlin Vacuum', material: 'Niobium nozzle extension', text: 'Its expansion ratio is about 165:1, much larger than the sea-level engines (about 16:1), because there is no air pressure in vacuum to push back.' },
  fairing: { name: 'Payload fairing', material: 'Carbon fibre composite', text: '{q:13.1:m:1} tall and {q:5.2:m:1} wide. Protects the payload through the atmosphere, then splits in two about 3 minutes into flight. Both halves parachute down for reuse.' },
  payload: { name: 'Payload', material: '—', text: 'Up to {q:22800:kg} to low Earth orbit when the booster is expended, and at least {q:17400:kg} when it lands on a droneship.' },
};

// Simplified timeline for a droneship-recovery mission to a ~200 km orbit.
export const FLIGHT_EVENTS = [
  { t: 0, name: 'Liftoff', text: '9 engines, {q:7607:kN} of thrust, about 1.4 times the vehicle’s weight.' },
  { t: 72, name: 'Max-Q', text: 'Peak aerodynamic pressure. Engines throttle down to protect the structure.' },
  { t: 150, name: 'Main engine cutoff', text: 'About {q:70:km} up and {q:2.3:km/s:1}. The first stage’s job is done.' },
  { t: 153, name: 'Stage separation', text: 'Pneumatic pushers separate the stages. The booster flips around with cold-gas thrusters.' },
  { t: 160, name: 'Second-stage ignition', text: 'Merlin Vacuum lights and burns for about 6 minutes.' },
  { t: 195, name: 'Fairing separation', text: 'Above most of the atmosphere, the fairing halves fall away.' },
  { t: 400, name: 'Entry burn', text: 'Three engines relight to slow the booster and shield it from re-entry heating.' },
  { t: 500, name: 'Landing burn', text: 'One engine. The booster has to reach zero speed exactly at zero height, because it can’t hover.' },
  { t: 520, name: 'Touchdown', text: 'Lands on a droneship about {q:600:km} downrange.' },
  { t: 530, name: 'Second-stage cutoff', text: 'Orbit reached: about {q:7.8:km/s:1}, once around the Earth every 88 minutes.' },
];

// Flight-path key points: [time s, downrange km, altitude km]. The scene
// draws smooth curves through them; tests check they line up with the events.
export const END_TIME = 600;
export const SHIP_DOWNRANGE_KM = 600;
export const FLIGHT_TRACKS = {
  stack: [[0, 0, 0], [40, 1, 6], [72, 8, 13], [110, 32, 36], [150, 80, 70]],
  upper: [[150, 80, 70], [200, 170, 110], [300, 450, 165], [400, 850, 190], [530, 1650, 200], [600, 2196, 200]],
  booster: [[153, 82, 72], [220, 200, 118], [280, 300, 128], [340, 420, 110], [400, 530, 60], [460, 590, 15], [500, 600, 3], [520, 600, 0]],
};
