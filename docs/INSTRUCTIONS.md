# Instructions

## Use it online

Open **https://amalmehta.github.io/HowToBuildARocket/**. It works in any current browser with WebGL.

- **3D Falcon 9** (top): drag to rotate, scroll or pinch to zoom, click a part (or a chip below the model) to read about it. Tick **Exploded view** to separate the stages, open the fairing and deploy the legs.
- **Calculator** (Science): move the sliders to change payload, landing reserve, engine efficiency and propellant. It tells you whether the rocket still reaches orbit, and the most payload it could carry.
- **Merlin engine** (Engineering): tick **Cutaway** to slice the engine open and **Hot fire** to light it.
- **Flight** (bottom): press **Play**, drag the timeline, or click an event. Change **Altitude ×** to see the real proportions (×1). **Recentre** resets the camera.
- **Charts**: hover or tab to a bar for details. **Show as table** lists the numbers.
- **Settings**: the gear button, or ⌘, (Ctrl+, on Windows/Linux). Theme, metric/imperial units, 3D quality, reduced motion, auto-rotate.
- **Feedback**: the tab on the right edge opens a pre-filled GitHub issue.

## Run it locally

Requirements: any static file server. Python 3 or Node 18+ both work. Three.js loads from jsDelivr, so you need to be online.

```bash
git clone https://github.com/amalmehta/HowToBuildARocket.git
cd HowToBuildARocket
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk won't work, because browsers block ES modules on `file://`.

## Test it

```bash
npm test
```

Runs the physics and page-integrity tests with Node's built-in test runner. There are no dependencies to install.

## Change a number

Every figure lives in `js/data.js` with a source key. Edit the value there and reload. If a test checks it (for example liftoff mass or thrust), run `npm test`. A few headline figures also appear in the prose in `index.html`. Search for the old value to find them.

## Publish

The site deploys from the `main` branch root through GitHub Pages. Pushing to `main` updates it within about a minute.
