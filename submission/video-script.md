# ChatFleet demo recording plan — 2 minutes 50 seconds

All narration and captions below are in English. Capture real working software. Use original visuals and your own voice; background music is unnecessary.

## Before recording

- Complete a real Twitch broadcaster OAuth authorization in ChatFleet and verify an actual Twitch chat command changes the server state.
- Prepare OBS with the local read-only overlay at 1920 × 1080, or use a publicly accessible deployment. The current hosted preview is private.
- Keep the captain console open throughout the demonstration.
- Ask participating viewers to use all three commands, or use your own clearly identified separate test accounts. Do not describe simulated crew as live viewers.
- Keep the Codex build conversation and the project files/tests available for the build footage.

| Time | Screen and action | Narration |
| --- | --- | --- |
| 0:00–0:15 | Show captain console, Twitch channel, and the OBS overlay. | “This is ChatFleet. Your streamer is the captain, and everyone watching becomes part of the crew. Together, they have three minutes to bring nine people home.” |
| 0:15–0:40 | Show real messages sent in Twitch chat and corresponding received commands, meter changes, and crew names in ChatFleet. | “Engineers boost the ship. Defenders raise the shields. Scouts lock onto distress signals. Viewers play directly in Twitch chat.” |
| 0:40–1:05 | Capture three distinct viewers using scan, shield, and boost within eight seconds, and the Crew Sync event. | “Three different people coordinating all three roles unlock Crew Sync. One viewer cannot earn this bonus alone. Each person can act once every two seconds.” |
| 1:05–1:25 | Switch to the fast route; show a debris impact and the first rescue/sector change. | “The captain chooses the route. The drift is faster, but its debris hits harder. A successful rescue needs both travel and scanning. The next sector brings a new distress signal.” |
| 1:25–1:45 | Show OBS with actual Twitch footage and the synchronized overlay; briefly open the crew manifest. | “The overlay reads the same saved mission as the captain console. It works in a separate browser process, and the crew manifest gives people credit for participating.” |
| 1:45–2:20 | Show the actual Codex conversation, `lib/game.ts`, `lib/twitch.ts`, and passing `npm test`. | “We built this with OpenAI Codex. Codex helped implement the game engine, original visuals, Twitch EventSub integration, persistent room API, and tests. We tested cooldowns, duplicate events, teamwork, pause behavior, and Twitch reconnects.” |
| 2:20–2:40 | Show the mission complete screen from a genuine recorded run and the score. | “Nine people home, one shared adventure. The game has a labeled demo mode too, so you can try a full mission without connecting Twitch.” |
| 2:40–2:50 | End on the dashboard and project name; show the final source repository URL as a caption. | “ChatFleet. Your chat. Your crew.” |

## Capture notes

Record a whole real run first, then cut it to this timeline. Do not falsify the order of command delivery or imply an untested live integration was demonstrated. A second capture can show the Codex implementation and tests. Keep the final export shorter than 3 minutes and upload it publicly to YouTube. Include its URL in the Devpost submission.
