# ChatFleet

## Tagline
Your chat. Your crew. A cooperative rescue mission powered by the people watching your stream.

## Inspiration
A good stream has moments when everyone in chat suddenly pulls in the same direction. We wanted to turn that feeling into a game: the streamer has the captain's chair, and every viewer gets something useful to do. A single short command should make someone feel part of the adventure.

## What it does
ChatFleet turns a Twitch chat into the crew of a starship on a three-minute rescue expedition. Engineers send `!boost`, defenders send `!shield`, and scouts send `!scan`. The crew travels through three original space environments to rescue nine stranded people.

The central mechanic is Crew Sync. Three distinct viewers using all three roles within eight seconds trigger a shared bonus. It rewards coordination and gives the streamer a reason to call for particular roles. Each viewer has a two-second cooldown, keeping participation fairer than unlimited command spam.

The streamer chooses a safe or fast route, watches hull, shields, and fuel, and can pause the mission. A read-only OBS overlay makes the action watchable. A crew manifest recognizes individual contributions, and the flight recorder exports the mission's recent events.

A clearly labeled demo mode lets judges try the full game immediately with simulated crew. Twitch mode starts a clean mission and accepts live input through Twitch OAuth and EventSub WebSockets.

## How we built it
We built ChatFleet with OpenAI Codex during the submission period. Codex implemented and refined the deterministic TypeScript game engine, React interface, original SVG spacecraft and planets, Twitch adapter, room API, D1 persistence, tests, and deployment configuration. The build conversation includes the design decisions and fixes discovered during testing.

The backend runs on Cloudflare Workers through Vinext. Every mission has an authoritative D1 state record. Concurrent updates use optimistic compare-and-swap, and server time drives travel, impacts, fuel recovery, and mission expiry. A captain capability protects write actions; overlay URLs contain only the random mission ID. Twitch tokens stay in the captain tab's memory.

The game uses no runtime AI inference. Codex is the development tool that helped create the experience; viewers need only their Twitch chat to participate.

## Challenges
The important challenge was making teamwork real in the implementation. A single viewer cycling through commands cannot trigger Crew Sync. We also separated simulated and Twitch input, made pause/resume preserve the mission clock, bounded event history, handled duplicate chat messages, and prevented simultaneous updates from losing crew actions.

## Accomplishments
The project includes a complete playable expedition, three visually distinct sectors, a captain dashboard, a crew manifest, a recorder, and a server-synchronized overlay. The test suite covers both game rules and mocked Twitch lifecycle events. Local integration checks exercise the actual database and mission API.

## What we learned
An audience game needs legible consequences. Clear role cards, a visible rescue clock, and short shared bonuses help a streamer explain what chat should do next. Building a deterministic engine first also made it practical to test edge cases before connecting a live channel.

## What's next
After live channel verification, we would test pacing with small and larger communities, add streamer-authored rescue scenarios, and explore raid-to-raid expeditions that carry a shared story between communities.

## Built with
OpenAI Codex, TypeScript, React, Vinext, Cloudflare Workers, Cloudflare D1, Twitch OAuth, Twitch EventSub WebSockets, original SVG, CSS, Node.js test runner.

## Required Codex session ID
`01a1888f-7e4d-7313-ae4c-811abfe88106`

## Fill before submission
- Code repository URL: https://github.com/Xiao-Yiwen/chatfleet
- Public YouTube demo URL: pending recording and upload.
- Actual Twitch channel demonstrated: pending real-channel end-to-end test.
- Working project URL: https://chatfleet-mission-control.yiwenxiao96.chatgpt.site (public access verified).

Do not submit until the pending fields above are complete. The demo's simulated viewers are not evidence of live Twitch delivery.
