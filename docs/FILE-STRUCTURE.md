# File Structure

```
HowToBuildARocket/
├── index.html              The whole page: sections, prose, cycle diagram, Settings and Feedback dialogs
├── css/
│   └── style.css           Design tokens (light and dark), layout, charts, dialogs, responsive rules
├── js/
│   ├── main.js             Entry point: renders sections from data, calculator, lazy 3D, feedback, nav
│   ├── data.js             Every figure on the site, with source keys and estimate flags
│   ├── physics.js          Rocket equation, staging, max payload, orbital speed, unit conversion
│   ├── charts.js           SVG horizontal bar charts with tooltips, legend and table view
│   ├── settings.js         Preferences (theme, units, quality, motion) and the ⌘, dialog
│   ├── viewer.js           Shared Three.js renderer, camera, controls, lights, picking
│   ├── rocket3d.js         Falcon 9 3D model with exploded view and part info
│   ├── engine3d.js         Merlin 1D 3D model with cutaway, plume and labels
│   └── flight3d.js         3D flight profile over the Earth with timeline
├── tests/
│   ├── physics.test.js     Physics and unit tests
│   └── site.test.js        Page integrity: IDs, files, sources, nav anchors
├── docs/
│   ├── INSTRUCTIONS.md     Setup, run, use
│   ├── SYSTEM-DESIGN.md    Architecture, flows, decisions, testing, limits
│   ├── FILE-STRUCTURE.md   This file
│   └── images/             README screenshots
├── how_to_build_a_rocket.md  The project brief
├── package.json            `npm test` and `npm start` scripts (no dependencies)
├── .nojekyll               Tells GitHub Pages to serve files as-is
└── README.md
```
