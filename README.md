# Mossmere

**A quiet village. A private contract. A well-side trial.**

[Play Mossmere](https://stefeigan-stack.github.io/Cozy-Strange/) · [Two-computer connection test](https://stefeigan-stack.github.io/Cozy-Strange/network-test.html)

An original Three.js + Vite browser game in the `Cozy-Strange` repository. Intended for small groups of trusted friends. The static frontend is ready for GitHub Pages. There are no paid assets, generations, APIs, subscriptions, game servers or required purchases.

This is a prototype, **not cheat-resistant public multiplayer**. The player's browser hosting the room runs the simulation and can inspect or alter every secret. WebRTC connections do not work on every network without TURN. See [NETWORKING.md](docs/NETWORKING.md).

## Run it

Use Node **22.12 or newer** (Node 22 LTS recommended).

```sh
npm ci
npm run assets
npm run dev
```

Open the localhost URL Vite prints. Do not double-click `index.html`: ES modules and GLB loading require an HTTP server. The main game requires WebGL2. Recent desktop Chrome, Firefox, Edge and Safari are intended targets; keyboard and mouse are recommended.

```sh
npm test
npm run build
npm run preview
```

`npm run build` regenerates the original GLB kit, builds **dist/** and verifies the static paths. Both `index.html` and `network-test.html` are production entrypoints. All dependencies and art are bundled; there are no runtime asset CDNs. The first build has a roughly 544 KB local GLB and a roughly 623 KB uncompressed Three.js chunk.

## Play

Choose **Enter practice** for one human and five clearly labelled computer villagers. This is offline testing, not multiplayer. The simple bots follow jobs, pursue contracts and make fallible trial guesses; they are not a substitute for testing with people.

Choose **Play with friends → Open a village** for online play. Share the eight-character room code privately. Other players choose **Join**. The host opens the Village panel (Tab) and chooses **Begin the day** once everyone is present. 2–8 players are supported; 4–8 is recommended for meaningful trials. No bots are admitted to online sessions.

The lobby permits movement and practice jobs. Starting the match resets lobby coins and jobs so everyone starts equally. Keep the host tab active and the host computer awake. Late joins are rejected; disconnected players forfeit the current match and cannot resume it. A new room is required after host loss or for a rematch.

| Control | Action |
| --- | --- |
| WASD / arrows | Camera-relative movement |
| Shift | Run |
| Drag the world | Orbit camera |
| Mouse wheel | Zoom |
| E / interaction button | Job interaction; join paired job; ready at press |
| F | Fulfil an active contract against its specified target |
| R | Report a nearby fallen lantern |
| J | Pocket journal |
| M | Overhead camera |
| Tab | Village / room panel |
| Esc | Settings |

Follow the golden marker to the bakery, collect bread and deliver it to the glasshouse for **18 coins**. Herb gathering earns **12**, filling watering cans earns **10**. Jobs cycle automatically. At the orchard press, press E to join a queue. The host randomly pairs queued villagers. Once paired, both press E again and remain within range for **three seconds** to earn **26 coins each**. Readiness lasts six seconds; press E again if your partner is late. Departure or elimination cancels the pair.

Your name, coat, complexion, hair and hat persist in browser-local storage. They are all free. There is no cosmetic currency or account service. Match coins, position, jobs, contracts, votes and alive/dead state are never saved into the cosmetic profile. Refreshing does not restore a match. Change appearance from the title screen between matches.

## Contracts and trials

- The host assigns at most **one** temporary contract at a time to a random connected living player, against another living target. The previous holder is skipped at the next assignment when possible. There are no permanent murderer roles.
- The first contract arrives after 35 seconds; it lasts 65 seconds, with a 25-second gap after completion, cancellation or expiry. Exact rules are in `src/sim/config.js`.
- Only the contract holder receives its private target and expiry. Other players cannot perform a murder action. The host checks phase, identity, expiry, correct target, 1.8m range and a clear path.
- Victims leave a fallen lantern. A living player within 2.5m can report it, cancelling any active contract and gathering the village around the well.
- **Discussion (35s):** living players share text evidence and nominate a suspect. The highest nomination count advances; a tie or no nomination releases everyone.
- **Defence (20s):** only the accused may speak.
- **Vote (25s):** living players, including the accused, each seal one convict/spare vote. The electorate is frozen when voting begins. Conviction requires strictly more than half of that electorate; abstention, disconnection or a tie cannot lower the threshold.
- **Verdict (7s):** a convicted villager's lantern rises and the character fades out publicly. No gore. Eliminated villagers spectate; they cannot work, kill, discuss, nominate or vote.

Evidence is generated from the simulation: a coat-coloured thread, place and time, and names of nearby villagers with a clear view. It is fallible evidence, not a reveal of the killer's identity. Matching coats can be innocent. Public snapshots never contain the assassin ID or unreported evidence. Ballot choices remain private until the aggregate verdict.

## Configurable endings

From the title screen, press Esc to configure the ending and day length before opening a room or practice session. The host's settings are authoritative.

| Setting | Rule |
| --- | --- |
| Survive until dawn (default) | At the time limit, all living connected villagers win together. |
| Last survivor (provisional) | One survivor wins. If multiple remain at the time limit, the match is unresolved with no winner. |
| Prosperity | First living villager(s) to reach 180 match coins win; remaining survivors share victory if dawn arrives first. |

Every mode also ends when one living connected villager remains, or with no winners if none remain. Default length is eight minutes. The simulation settings also expose survivor count, coin goal and each phase duration for further design experiments. This prototype does not settle the final game's rules.

## Deploy to GitHub Pages for free

The repository must be public to use Pages on GitHub Free. No custom domain, backend or token is required.

1. In **stefeigan-stack/Cozy-Strange → Settings → Pages**, choose **GitHub Actions** under Source.
2. Push this source to `main` (or run **Test, build and deploy Mossmere** from the Actions tab).
3. The workflow installs locked dependencies, regenerates the GLB, runs the tests, builds the production frontend, uploads `dist`, then deploys Pages.
4. Use the URL returned by the successful deployment. The expected project path is `/Cozy-Strange/`.

`vite.config.js` uses `base: './'`. HTML, JS, CSS, favicon and dynamically loaded GLB paths are relative, so the same build works beneath `/Cozy-Strange/` or another repository name. Do not replace the GLB URL with `/assets/...`. There is no client router or deep-link fallback to configure. The test page is at `network-test.html` beside `index.html`.

If the deploy job says it cannot find a Pages site, complete step 1 and rerun the job. If GitHub's app permission excludes workflow writes, add the provided workflow file through the GitHub editor. Never put a personal access token, fal key or TURN secret into source, `VITE_*` variables or public workflow text. GitHub's short-lived built-in deployment token is used only by Actions and is not in the frontend.

Static fallback: run `npm run build`, publish the **contents** of `dist` to a `gh-pages` branch and select that branch/root in Pages settings. No GitHub file or commit is used for game synchronization; GitHub serves the frontend only.

## Structure and tests

```text
src/sim/       Pure host rules, world collision data, offline bots
src/net/       PeerJS transport, protocol boundary, host authority, diagnostic
src/render/    Three.js scene, character animation, procedural kit source
src/ui/        DOM interface and styles
src/profile.js Cosmetic-only storage and sanitization
scripts/       GLB generator and production-path checks
tests/         Node built-in test runner, no paid test services
docs/          Networking, milestone acceptance, architecture and licenses
```

See [TESTING.md](docs/TESTING.md) for explicit milestone commands and two-computer acceptance steps. Automated tests pass locally, including the full simulated match and per-recipient privacy checks. The development browser lacks WebGL, so rendered gameplay QA remains required on a WebGL2-capable machine. A two-computer, cross-network test must be recorded before treating milestone 2 as accepted. Do not mistake unit tests, bots, or two browser tabs for that acceptance gate.

## Free asset pipeline

`src/render/models.js` defines original low-poly geometry. `npm run assets` uses Three.js's GLTFExporter to generate `public/assets/mossmere-kit.glb`. The game loads it with GLTFLoader and instantiates named models. No third-party art was downloaded. There are no fal generation requests, model subscriptions or image-generation bills. Fonts are system fonts; small icons are original inline SVG; optional chimes use browser oscillators.

Original source and assets are provided under MIT; see [LICENSE](LICENSE), [ASSETS.md](docs/ASSETS.md) and the bundled [third-party notices](public/THIRD_PARTY_NOTICES.txt).

Primary references: [PeerJS getting started](https://peerjs.com/client/getting-started), [PeerJS networking caveats](https://peerjs.com/client/faq), [Vite static deployment](https://vite.dev/guide/static-deploy), [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
