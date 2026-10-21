PROJECT NAME: how_to_build_a_rocket

META-INSTRUCTIONS:

<Read it all before acting. Ask about anything unclear, contradictory or
 underspecified — before starting and mid-build. Ask in the question widget
 (AskUserQuestion): related questions batched, concrete options, your
 recommendation first. Plain text only if the widget isn't available.>

<Don't expand scope. Anything not listed here is a proposal, including changes
 to this file — propose it, don't do it.>

<Prefer doing over describing: run the code, write the files, test it.>

<Always in scope, no proposal needed: when it goes on GitHub, a README that is
 easy to read at a glance — a line on what it is, then clear visuals
 (screenshots, a diagram or a chart), then links. Everything else goes in
 linked files: docs/INSTRUCTIONS.md (setup, run, use),
 docs/SYSTEM-DESIGN.md (see below) and docs/FILE-STRUCTURE.md (what's where). If what you're
 building is an application rather than a script, also a small unobtrusive feedback tab, and a settings
 button or tab (⌘, on the Mac) that gathers its preferences in one place.>

<If what you're building is an application, build it as a Mac app first; the
 website comes after, as its own step.>

<Name things the way a person would say them — "Goal Tracker", not
 goal_tracker — for the app, its windows, titles, files people open, repo
 descriptions and README headings. When you create the GitHub repo, name it
 with no "_" or "-": one word or joined words, e.g. GoalTracker.>

<Always in scope: a system design doc in the codebase, docs/SYSTEM-DESIGN.md,
 kept current as the build changes. Cover the architecture (with a Mermaid
 diagram), each component's job, the main flows, where data lives, the key
 design decisions and their trade-offs, how it's tested, and known limits.>

<Finish by listing every deliverable: path, what it is, how to check it works.>

<Git rules (no Claude attribution, never commit .claude/) are in
 ~/.claude/CLAUDE.md and apply on their own — nothing to repeat here.>

<Keep the changelog at the bottom current.>

CONTEXT:

figure out how to build a rocket from scatch. take falcon x from example. include a roadmap of all the steps, the hard science, the engineering, the materials, the cost, etc. include 3d visualizations

DELIVERABLES:

website with the afforementioned contents

OPEN QUESTIONS / ASSUMPTIONS:

Asked and answered (2026-10-05):
- "Falcon x" means Falcon 9 (Block 5).
- Scale is the orbital path a company would take, not a hobby rocket.
- It is a content website, not an application: no Mac app. It still has a small feedback tab and a settings dialog (⌘,), because it has 3D and unit choices.
- Published as the GitHub repo HowToBuildARocket, served on GitHub Pages.

Decided without asking:
- Plain static site (HTML/CSS/ES modules, no build step). Three.js r170 loaded from jsDelivr.
- The three 3D visualisations are a Falcon 9 model (exploded view, clickable parts), a Merlin 1D engine (cutaway, hot fire) and a flight profile over the Earth (timeline). The models are built in code from simple shapes, not downloaded meshes.
- Stage masses, chamber conditions, per-flight cost shares and the new-company budget are public estimates, labelled as such on the page. Headline specs come from SpaceX. Development cost estimates come from NASA's 2011 NAFCOM study; SpaceX's own figure is company-reported, via NASA's 2011 Commercial Market Assessment. The 2026 list price ($74M) comes from Spaceflight Now. Cost per kg comes from Jones (2018, NASA NTRS).
- The calculator uses the ideal rocket equation plus a fixed loss budget (about 8,930 m/s to a 200 km orbit). It gives about 22.6 t expendable against the published 22.8 t, and about 17 t with a 10% landing reserve against the published 17.4 t.
- The feedback tab opens a pre-filled GitHub issue rather than sending data anywhere.
- Light and dark themes follow the system by default. Metric is the default, with imperial available.

CHANGELOG:

- 2026-09-15 — added meta-instruction: built-out applications include a small feedback tab
- 2026-09-15 — added meta-instruction: no "Claude" attribution in commits, PRs, or branches
- 2026-09-16 — added meta-instruction: always include a README when adding to GitHub
- 2026-09-16 — changed meta-instruction: ask clarifying questions in the question widget
- 2026-09-17 — added meta-instructions: Claude never a contributor; never commit .claude/
- 2026-09-26 — compressed the meta-instructions and every field prompt; git rules moved to the global instruction file
- 2026-09-27 — added meta-instruction: applications are built as a Mac app first, then a website
- 2026-09-28 — folded inputs, instructions, constraints, deliverables and done criteria into one free-form CONTEXT
- 2026-09-28 — changed meta-instruction: a README on GitHub always includes a visual
- 2026-09-28 — added meta-instruction: name things like a person would, never snake_case
- 2026-09-28 — changed meta-instruction: README leads with visuals; instructions live in a linked guide
- 2026-09-28 — changed meta-instruction: README is visuals and links; details in docs/INSTRUCTIONS.md and docs/FILE-STRUCTURE.md
- 2026-09-29 — changed meta-instruction: GitHub repo names have no "_" or "-"
- 2026-10-02 — added a DELIVERABLES field after CONTEXT
- 2026-10-02 — added meta-instruction: every project has a system design doc at docs/SYSTEM-DESIGN.md
- 2026-10-05 — created
- 2026-10-05 — built the website: roadmap, science, engineering, materials, cost, three 3D scenes, calculator, settings, feedback, docs and tests
- 2026-10-05 — added meta-instruction: applications include a settings button or tab
- 2026-10-06 — made the hero rocket bigger and more detailed (taller viewer, raceways, detailed Merlins, grid-fin lattice, legs with struts, thruster pods, image-based lighting, shadows)
- 2026-10-06 — added an app icon (favicon.svg, favicon.ico, apple-touch-icon.png)
- 2026-10-20 — fixed and polished 100 things found by a five-part audit (facts and sources, code bugs, accessibility and mobile, 3D and charts, docs and tests); see the polish PR
