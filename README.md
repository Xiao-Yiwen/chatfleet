# ChatFleet

**Your chat. Your crew.** A cooperative starship rescue game for Twitch, built with OpenAI Codex for the Codex × TwitchCon Hackathon 2026.

The streamer captains a ship. Viewers operate its engines, shields, and scanners with chat commands. Three different viewers coordinating all three roles unlock **Crew Sync**. Rescue nine people across three sectors before the three-minute window closes.

## Try the demo

Public playable demo: https://chatfleet-mission-control.yiwenxiao96.chatgpt.site

Click **Launch mission**. Simulated crew are enabled by default, and every simulated action is labeled as demo input. Click the command cards or type `!boost`, `!shield`, or `!scan` into the demo composer to join in. Turn off **Simulated crew** for a manual challenge. No Twitch account, OpenAI API key, or paid runtime service is needed for the demo.

## Run locally

Requires Node.js **22.18+** (tested with 25.2.1), npm, and a modern browser.

```sh
npm ci
npm run build
npm run db:migrate:local
npm run dev -- --port 5177
```

Open http://127.0.0.1:5177. Run the migration once per fresh local database. For subsequent launches, use only the final command. The local database is persisted under the ignored `.wrangler/state` directory.

For a production build preview, stop the dev server and run `npm start -- --port 5177` after building. The included Cloudflare/Vinext setup provides the local D1 database; a separate Cloudflare account is not required for local testing.

中文说明：[README.zh-CN.md](README.zh-CN.md).

## The game

| Command | Role | Effect |
| --- | --- | --- |
| `!boost` | Engineer | +5 distance on the safe route, +7 on the fast route; costs 3 fuel |
| `!shield` | Defender | Restores 9 shield points, up to 100 |
| `!scan` | Scout | Adds 3 scan points; 12 locks the survivor signal |

Each sector requires 100 distance and 12 scan points. Each completed sector saves three people. Ship movement and fuel recharge also advance with the server clock. Debris strikes every 12 seconds: 16 damage on the safe route and 24 on the fast route. Shields absorb damage before hull integrity. Hull depletion or 180 elapsed seconds ends the mission.

Three distinct people issuing all three commands within eight seconds trigger Crew Sync: +75 points, +8 distance, and +6 shields. Syncs have a five-second global cooldown. A viewer can act once every two seconds across all commands. Each accepted action earns 10 points, each rescue earns 300, and a successful expedition adds a time and hull bonus.

The captain can switch routes, pause/resume, reset a mission, inspect crew contributions, and export the latest 55 events as JSON. Reset clears that mission's crew, score, and recorder. One mission supports up to 1,000 unique participating crew members; this is a capacity guard, not a load-test claim.

## Connect a real Twitch channel

Real integration is implemented using Twitch OAuth and **EventSub WebSockets**, not a simulated connection badge.

1. Register an application at https://dev.twitch.tv/console/apps. Use the Chat Bot category. You need only its public **Client ID**.
2. Register the exact redirect URL shown in ChatFleet's **Connection settings**. Local default: `http://127.0.0.1:5177/?oauth=callback`.
3. Enter the Client ID and choose **Authorize with Twitch**. Sign in as the broadcaster whose own chat you want to use. The app requests `user:read:chat` only.
4. Wait for **TWITCH CONNECTED**, then launch the mission. Viewers send commands in that Twitch channel.
5. Keep the captain tab open. Twitch's access token exists only in that tab's memory and never reaches the game backend. A page reload requires authorization again.

Switching between demo and Twitch starts a clean mission. Simulated crew are disabled in Twitch mode. The bridge validates token ownership/scope, subscribes after the welcome event, deduplicates message IDs, monitors keepalives, transfers reconnect sessions, resubscribes after unexpected disconnects, validates the token periodically, and reports revoked or expired authorization.

**Verification status:** game and adapter tests and local API/browser checks have passed. A real Twitch account was not connected during this build; live authorization and actual channel delivery still need an end-to-end test. The token-less adapter tests use explicit mocks.

Official references: [OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/), [EventSub WebSockets](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/), [chat event](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage).

## OBS overlay

Choose **OBS overlay**, copy the mission URL, then add a Browser Source at 1920 × 1080. The overlay polls the same authoritative mission record as the captain console. It works across browser processes, not just between tabs sharing browser storage. The background outside the overlay panels is transparent.

The overlay URL contains a random mission ID and no control key or Twitch token. Write actions require the captain key, stored only in the captain browser's local storage; the database stores its SHA-256 hash. All viewers with the URL can read that mission when the deployment itself is accessible.

The hosted demo is now **public**, with anonymous access verified. OBS can use a hosted mission overlay URL when it has network access, or use the local URL. The overlay dialog still contains a note from the initial private-preview deployment; the current access policy is public.

## Architecture and state

- React 19 / TypeScript mission dashboard with original SVG spacecraft, planets, animation, responsive styles, reduced-motion support, keyboard controls, and modal focus management.
- Vinext on Cloudflare Workers, using the supplied Sites integration.
- Cloudflare D1 holds rooms, a hashed captain capability, and the bounded JSON game state. Schema migration is in `drizzle/`.
- Pure deterministic engine in `lib/game.ts`; server-authoritative time, bounded recorder/replay history, mode separation, cooldowns, and distinct-player synergy.
- Optimistic compare-and-swap updates prevent concurrent command writes from silently overwriting each other. The browser serializes its writes and ignores stale poll responses.
- A browser-side Twitch bridge forwards authorized chat actions to the same game API. The captain device is trusted; this prototype is not a server-side attestation of Twitch message authenticity.
- Read-only overlays retrieve current state once per second. An open captain tab generates demo crew or receives real Twitch events. No cron, background agent, or AI inference is needed to play.

## Verification

```sh
npm test
npm run typecheck
npm run build
# With the local server running:
npm run test:api
```

There are 26 game/adapter tests and 10 local API integration checks. API checks create isolated test missions, avoid printing captain credentials, and test persistence, read-only responses, rejected unauthorized writes, invalid origins/payloads, concurrent updates, mode separation, and room isolation. Browser QA covers the mission, pause/resume, crew table, recorder, overlay, and narrow/wide layouts.

## Submission materials

- `submission/devpost.md`: English project description.
- `submission/video-script.md`: a 2:50 recording plan, including the required real Twitch and Codex footage.
- `submission/checklist.zh-CN.md`: remaining account-dependent submission steps and the verified deadline.
- `submission/codex-build-log.md`: implementation record and the actual Codex thread ID.

This repository was newly created during the submission period. Codex generated and iterated on the engine, adapter, server API, interface, tests, and documentation in session `01a1888f-7e4d-7313-ae4c-811abfe88106`. No runtime OpenAI model is required. Generated demo input must not be presented as evidence of a real Twitch connection.

License: MIT. Original spacecraft and planet art are implemented as source SVG; no external artwork, music, or fonts are required.
