# Trusted host networking

## Topology

One player's browser hosts the authoritative simulation. Up to seven guests establish PeerJS WebRTC data channels to that host. Guests do not simulate authority and do not exchange gameplay state directly with each other. Public village snapshots and recipient-specific private snapshots are sent at approximately 10 Hz; the simulation runs at 20 Hz. Client movement requests are sampled at 20 Hz. Rendering interpolates received positions.

1. The host generates an eight-character room code locally and registers `mossmere-CODE` with PeerJS Cloud.
2. A guest registers a temporary peer, then asks PeerJS to connect to the host ID.
3. A versioned hello exchanges a cosmetic profile. The host binds that connection to a new player ID. A client-supplied `playerId` cannot change this binding.
4. Sequence numbers reject replay/out-of-order messages. The boundary limits packet size to 4,096 serialized characters and rate-limits each admitted peer to an 80-message burst, refilling at 60/second.
5. Movement supplies a bounded direction, never a position or elapsed time. The host performs speed normalization, fixed-step movement, collision, proximity checks, rewards, contract authorization, reporting, phase changes and voting.
6. `publicSnapshot` explicitly allows safe fields. `privateSnapshot(id)` is sent only through that player's channel. It includes only that recipient's contract, job, pairing and ballot. The authoritative object is never broadcast or persisted.

This is logical recipient privacy against ordinary clients. **The host has all state in memory and can inspect or change it.** Host-generated randomness is not cryptographically fair or externally auditable. Room codes are not accounts, passwords or authentication. Share them privately. A determined modified client or disruptive peer is outside this prototype's threat model. Rate limits are basic guards, not denial-of-service protection. Public positions, living status and match coins are visible to all peers; there is no interest-management or hidden-movement protection.

## Signalling and ICE

The pinned PeerJS client uses its default free PeerJS Cloud signalling endpoint. Signalling brokers IDs, session offers and ICE candidates. Gameplay travels through WebRTC data channels after connection. It does not use GitHub commits, file writes, GitHub Actions, repository polling or a database to synchronize a match.

`PEER_OPTIONS` explicitly sets a public STUN server (`stun:stun.l.google.com:19302`) and **no TURN servers**. This overrides any provider defaults so the prototype does not silently depend on a relay or paid account. STUN discovers network addressing; it cannot relay traffic through every firewall. Symmetric NAT, enterprise filtering, blocked UDP, some school networks, VPNs and mobile carriers can prevent direct peer connections. Same-Wi-Fi success does not prove different-network success.

No reliable universally free TURN service is promised. Do not paste public relay credentials from the internet into the project. Running your own TURN server or using a paid relay is outside the zero-additional-cost prototype. The practical no-cost fallback is another network, another host or offline practice. HTTPS on GitHub Pages supplies a suitable secure browser origin. No microphone, camera or geolocation permission is requested.

PeerJS Cloud and public STUN are third-party services with no project-specific availability guarantee. Their current free availability does not make the frontend self-sufficient for online play forever. If signalling is unavailable, existing data connections may survive while new joins fail; the implementation attempts to reconnect signalling. If it cannot open the signalling connection within 15 seconds, it reports a failure. No API keys are configured.

## Failure policy

| Event | Behaviour |
| --- | --- |
| Wrong code / absent host | PeerJS error or 15-second connection timeout, with retry advice. |
| Incompatible protocol, oversized hello, full room | Reject; no player admitted. |
| Guest tries joining mid-match | Reject and ask them to join the next room. |
| Guest channel closes | In lobby remove the player; during match mark disconnected/dead and cancel pair/contract participation. |
| No guest packets for 10 seconds | Host drops that guest. Heartbeats are sent every two seconds. |
| Host connection closes / no public snapshot for 10 seconds | Guest exits the session with a clear explanation. No host migration or reconnection token. |
| Host tab suspended for more than five seconds between callbacks | Host ends the room rather than claiming it is still synchronizing. |
| Signalling disconnects while data channels are alive | Show degraded status and attempt signalling reconnect. Existing game channels can continue. |
| Accused disconnects during trial | Cancel conviction; disconnect already removes them. Other voter disconnects do not reduce the frozen majority threshold. |

The host must keep its tab active. Browser background throttling can slow simulation or cause a timeout. No offline progress, server continuation, rollback recovery, identity verification, reconnect-resume or host migration is implemented. The only supported recovery is a new room.

## What acceptance actually means

Run `network-test.html` on **two separate computers**, then on different networks. Confirm both views converge, earned rewards are host-issued, an uncontracted murder is rejected by the rule tests, and loss paths are understandable. Record results in `docs/TESTING.md`. Two tabs exercise actual PeerJS signalling and channels but do not validate cross-device NAT traversal. A WebGL-capable computer is separately needed to validate the rendered game.

References: [PeerJS API](https://peerjs.com/client/api/peer), [FAQ](https://peerjs.com/client/faq), [Cloud](https://peerjs.com/server/cloud). Checked 21 October 2026. The installed client is pinned to 1.5.5; package-lock.json fixes its dependency tree.
