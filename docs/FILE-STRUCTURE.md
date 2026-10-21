# File Structure

```
HowToBuildARocket/
├── index.html              The whole page: sections, prose, cycle diagram, Settings and Feedback dialogs
├── 404.html                "Page not found" page that GitHub Pages serves for bad links
├── share.png               1200×630 preview image for links shared on social media
├── site.webmanifest        App name, colours and icons for "Add to Home Screen"
├── favicon.svg             App icon (vector, used by modern browsers)
├── favicon.ico             Fallback icon for older browsers
├── apple-touch-icon.png    180 px icon for iOS home screens
├── css/
│   └── style.css           Design tokens (light and dark), layout, charts, dialogs, responsive rules
├── js/
│   ├── main.js             Entry point: renders sections from data, calculator, lazy 3D, feedback, nav
│   ├── data.js             Every figure on the site (including flight-path key points), with sources
│   ├── physics.js          Rocket equation, staging, max payload, orbital speed, units, flight-path smoothing
│   ├── charts.js           SVG horizontal bar charts with tooltips, legend and table view
│   ├── settings.js         Preferences (theme, units, quality, motion) and the ⌘, dialog
│   ├── viewer.js           Shared Three.js renderer, camera, controls, lights, picking, context-loss handling
│   ├── webgl.js            WebGL check, kept separate so the page works if Three.js fails to load
│   ├── rocket3d.js         Falcon 9 3D model with exploded view and part info
│   ├── engine3d.js         Merlin 1D 3D model with cutaway, plume and labels
│   └── flight3d.js         3D flight profile over the Earth with timeline
├── tests/
│   ├── physics.test.js     Physics and unit tests
│   ├── data.test.js        Data integrity: materials, parts, sources, flight tracks vs events, settings, chart helpers
│   └── site.test.js        Page integrity: IDs, files, sources, nav anchors, doc links, 404 and share image
├── docs/
│   ├── INSTRUCTIONS.md     Setup, run, use
│   ├── SYSTEM-DESIGN.md    Architecture, flows, decisions, testing, limits
│   ├── FILE-STRUCTURE.md   This file
│   └── images/             README screenshots
├── how_to_build_a_rocket.md  The project brief
├── package.json            `npm test` and `npm start` scripts (no dependencies)
├── .nojekyll               Tells GitHub Pages to serve files as-is
├── .gitignore
└── README.md
```
