# How to Build a Rocket

A from-scratch roadmap to an orbital rocket, using Falcon 9 as the example: the physics, engineering, materials and cost, with interactive 3D models.

**[Open the site →](https://amalmehta.github.io/HowToBuildARocket/)**

![The site: Falcon 9 3D model next to the headline specs](docs/images/hero.png)

| Falcon 9, exploded | Merlin 1D cutaway, hot fire | Ten minutes to orbit |
|---|---|---|
| ![Exploded Falcon 9 with legs deployed](docs/images/rocket-exploded.png) | ![Merlin engine cutaway with plume](docs/images/engine.png) | ![Flight paths over the Earth](docs/images/flight-card.png) |

![Cost charts: development cost and cost per kilogram](docs/images/cost.png)

```mermaid
flowchart LR
  A[1 Company and capital] --> B[2 Architecture] --> C[3 Engine development]
  B --> D[4 Test sites] & E[5 Structures] & F[6 Avionics and software]
  C & D & E & F --> G[7 Integration and qualification] --> I[9 First flights] --> J[10 Reuse at scale]
  H[8 Launch site and licence] --> I
```

## Links

- [Instructions](docs/INSTRUCTIONS.md): use it, run it locally, test it
- [System design](docs/SYSTEM-DESIGN.md): architecture, flows, decisions, limits
- [File structure](docs/FILE-STRUCTURE.md): what's where
- [Project brief](how_to_build_a_rocket.md)
- [Send feedback](https://github.com/amalmehta/HowToBuildARocket/issues/new)
