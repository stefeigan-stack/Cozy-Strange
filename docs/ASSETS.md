# Original assets and free dependencies

| Asset | Source | License / regeneration |
| --- | --- | --- |
| Cottages, trees, pines, well, press, lantern posts, fences, bench, flowers, crates | Original procedural geometry in `src/render/models.js` | Project MIT; `npm run assets` |
| Articulated villager, clothing, hats, face | Original procedural geometry and material palettes | Project MIT; same GLB kit |
| Terrain, river, bridge, paths, grass, clouds and smoke | Original Three.js scene code | Project MIT |
| Game interface, tiny icons and favicon | Original HTML/CSS/SVG | Project MIT |
| Optional reward chime | Web Audio oscillator code | Project MIT; no audio files |
| Typeface | Installed system UI fonts and Georgia fallback | No font file distributed or remote font requested |
| Three.js 0.186.1 and glTF tools | Installed npm package | MIT; notice included |
| PeerJS 1.5.5 | Installed npm package | MIT; notice included |
| Vite 8.0.13 | Installed npm package; build-time only | MIT; notice included |

No paid asset pack, downloaded game art, borrowed character design, texture service, API key, fal generation, image generator or generative-model bill was used. The selected fal plugin was consulted only for its usage constraints. All art is authored as geometry in this repository.

## GLB pipeline

1. Edit the geometry in `src/render/models.js`. Model and joint names are part of the renderer contract.
2. Run `npm run assets`. The official Three.js GLTFExporter writes a glTF 2.0 binary with an embedded buffer and no external textures.
3. Run `npm run test:milestone4`; it checks structure, model names, walkable job stations and the actual GLB header/JSON.
4. `GLTFLoader` loads `import.meta.env.BASE_URL + 'assets/mossmere-kit.glb'`. Meshes share geometry; per-character customization clones only materials.

External glTF art may be added later only after verifying its specific license, retaining required notices and ensuring its styling is original to the game. There is currently no need for external assets.
