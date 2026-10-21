# Milestone acceptance and test record

Last local verification: **22 October 2026**. Node 24.19.0 on the development host. Production target remains Node >=22.12 for building, modern desktop browsers for playing.

## Actual status

| Milestone | Implemented | Verified here | Remaining acceptance |
| --- | --- | --- | --- |
| 1. Movement, camera, cosmetics, paid job | Yes | Movement bounds/collisions, job stages/rewards, cosmetic-only persistence tests pass | Visual camera, animation and keyboard play on WebGL2 hardware |
| 2. Two-player online test | PeerJS host/guest and a dedicated production test page | Transport-boundary and privacy tests pass; free signalling opened a room | Two separate computers; same-network then cross-network; successful channel/gameplay run still required |
| 3. Complete match | Contracts, reporting, evidence, defence, ballot, elimination, endings | Full simulated match, ties, expiry, disconnects and victory tests pass | Complete human multiplayer match and visual elimination |
| 4. Polish/content | Original GLB village, multiple jobs, UI, shadows, instancing/batching, chimes | GLB format/structure, shared collision map, batch bounds and production paths pass | Screenshots, performance, narrow-screen layout and cross-browser checks |

**26 automated tests passed locally; `npm run build` passed locally and in GitHub Actions.** The available browser reported its WebGL renderer disabled. This prevents honest graphical QA here; it is not evidence that the game fails on a normal WebGL2 browser. The production connection-test page successfully opened a room through PeerJS signalling, but the guest data channel timed out, including after a local-HTTP identity compatibility fix. No successful two-computer test is claimed. Bots, mocked inboxes, successful signalling and two tabs are never recorded as two real computers.

The initial production commit `fa884537fb1660f709bab1aa70b9c7cda06fa4e0` passed the [GitHub Actions build and Pages deployment](https://github.com/stefeigan-stack/Cozy-Strange/actions/runs/39616936617) after enabling Pages with GitHub Actions as its source. The [published page](https://stefeigan-stack.github.io/Cozy-Strange/) was opened successfully. The added 26th test covers lobby pair cleanup when both partners leave.

## Automated commands

```sh
npm ci
npm run assets
npm run test:milestone1
npm run test:milestone2
npm run test:milestone3
npm run test:milestone4
npm test
npm run build
```

`npm test` runs the Node built-in runner. `npm run assets` must precede the GLB format test on a clean checkout. The CI workflow runs it automatically. No test service or billable API is needed. Test helpers directly place host state to arrange controlled scenarios; these helpers are never imported into the production entrypoints.

## Milestone 1 — walk, look, dress, earn

1. Run `npm run dev`; open the printed URL in a WebGL2-enabled desktop browser. Expect the 3D village behind the title menu, no fatal error and no missing model requests.
2. Change name, coat, complexion, hair and hat. Enter practice. Confirm the character matches. Reload, return to customization and confirm cosmetics persist.
3. Walk using WASD and arrow keys; drag to orbit; scroll to zoom; hold Shift to run. Test diagonal speed, houses, shoreline and the river. Only the bridge crosses the river.
4. Follow the gold marker to the bakery at (−12, −7). Press E. Follow the new marker to the glasshouse at (6, −7). Press E. Expect exactly 18 coins and the next job.
5. Press E from out of range and repeat the completed delivery interaction. Neither should grant extra coins. Start a new village; expect coins to reset while cosmetics persist.
6. Toggle the journal, overhead camera and low-power graphics setting. Inspect labels and controls at a typical 1366×768 window. Check a narrow window for overlapping controls; mobile movement is not implemented.

Automated: `movement.test.js`, `jobs.test.js`, `profile.test.js`.

## Milestone 2 — two real computers

Prerequisites: deploy the same build to GitHub Pages. Use two separate physical computers, with current browsers and network access. Record browser versions and connection types. First use the same Wi-Fi; repeat using different networks such as home Wi-Fi and a mobile hotspot.

1. On computer A, open **network-test.html** next to the deployed game. Set name **Host test** and click **Host test village**. Expect a room code and a single host row.
2. On B, open the same page, set **Guest test**, paste A's code, and join. Within 15 seconds both must show two rows and the same authoritative positions. No CPU rows may appear.
3. Hold movement controls on A, then B. Both views should converge after movement stops. Walk into a cottage and the river; expect collision. Verify lobby coins are earned only after valid pickup/delivery.
4. Bring both players to (6, 6), join the press queue, then ready both players and wait three seconds. Expect 26 coins each, exactly once. Walk one away while pressing; progress must reset.
5. The guest Start button must be disabled; the host starts. Both views change to `roam`, and lobby money resets to zero. After 35 seconds at most one player's private view contains a contract; the other contains `null`. The host itself retains all authoritative state by design.
6. Close the guest tab. The host should remove it in lobby or mark it disconnected during a match. Reopen; late joining a started match must be rejected.
7. Create a new room, reconnect, then close the host tab. The guest must show an explicit connection-loss message and must not pretend the match is running. Try a nonexistent code: expect a useful failure within 15 seconds.
8. Repeat with A and B on different networks. A failure behind restrictive NAT is a documented limitation, not a pass. No TURN relay is configured. Record the actual result and use offline practice or another network.
9. Repeat the successful case in the main 3D game, using the same controls and room flow. Complete an actual bread delivery and paired job on both machines.

Automated (supporting checks only): `network.test.js` validates the authority boundary, ordering, size/rate checks and timeouts. `privacy.test.js` inspects actual fanout messages. These do **not** validate browsers, NAT traversal or PeerJS availability.

| Date | Build/commit | Computer A / browser / network | Computer B / browser / network | Join / movement / jobs | Failure handling | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | — | — | — | — | — | Not yet accepted |

## Milestone 3 — one full match

Use four or more real people after milestone 2 succeeds. For quick offline exploration, use practice, understanding that its villagers are explicitly computers. The default match lasts eight minutes; the title-screen settings offer three and fifteen minutes too.

1. Start with zero coins and all players alive. Complete solo and paired jobs while exploring.
2. Wait for a private contract. Confirm only its holder sees a target and countdown. Others cannot activate F murder. Check wrong-target, distant-target and expired-contract rejection in the automated tests.
3. The holder approaches the named target and presses F. Confirm a stylized disappearance and a fallen lantern; the contract clears. A living witness approaches and presses R.
4. Confirm movement pauses, the well-side court opens, and three evidence observations appear. Discuss and nominate. Tied nominations should spare everyone.
5. Nominate one player clearly. Only that accused player may send a defence during the defence phase.
6. During voting, cast one sealed ballot per living player. Try changing it: reject. With four living voters, two guilty votes must spare; three guilty votes must convict. Missing ballots cannot count as guilty.
7. Observe the convicted character fade out publicly. They can spectate but cannot participate in gameplay/chat/votes. The village reopens after the verdict unless the endgame is reached.
8. Check dawn shared victory. In a separate configured last-survivor match, the time limit with several survivors must produce no winner. In prosperity mode, reaching the coin goal alive ends the match.
9. Close a victim's/contract holder's connection and verify cleanup. Close a voter's connection after voting opens: the original required majority must remain. Close the accused connection: no conviction should be added.

Automated: `match.test.js` and the co-op cases in `jobs.test.js`.

## Milestone 4 — content and production

1. Run `npm run build` then `npm run preview`. Use the built app, not just Vite's development server.
2. Check the main page and connection-test page at a repository subpath. Inspect the browser network panel: JS, CSS, favicon and `assets/mossmere-kit.glb` must all succeed; no root `/assets/` requests or runtime art CDNs.
3. Inspect all six cottages, bridge, orchard, herb garden and well. Confirm jobs remain reachable; names and markers remain readable against the landscape.
4. Compare all wardrobe options on the actual 3D avatar. Check walking, running and public elimination animations.
5. Toggle sound and low-power mode. Record browser, GPU, window size and observed frame rate. Check recent Chrome and Firefox, and Safari if available. No performance claim is accepted without measurement.
6. Check no personal/API credentials, paid asset requests, runtime fal calls or remote image/font requests. Retain original and third-party licenses in the production folder.
7. The GitHub workflow must have a successful test/build job and a successful Pages deployment. A local build alone is not proof of a live deployment.

Automated: `assets.test.js` and `scripts/check-build.mjs`.
