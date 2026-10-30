# Devpost required fields

## 1. Code repository URL

https://github.com/Xiao-Yiwen/chatfleet

## 2. Codex session ID

01a1888f-7e4d-7313-ae4c-811abfe88106

## 3. Main technology requirement

ChatFleet was built with OpenAI Codex, which helped implement and refine the TypeScript game engine, React interface, original SVG space visuals, persistent room API, Twitch adapter, automated tests, and deployment configuration.

The Twitch integration uses Twitch OAuth with the user:read:chat permission. The Twitch Helix API creates a channel.chat.message subscription, and Twitch EventSub WebSockets receive chat commands such as !boost, !shield, and !scan. These commands update the shared rescue mission. The adapter includes message deduplication, keepalive monitoring, reconnect handling, and authorization checks.

React and Vinext provide the web interface. Cloudflare Workers run the backend, and Cloudflare D1 stores mission state. An OBS Browser Source overlay reads the same saved mission as the captain console.

The public demo clearly labels simulated crew. The game and local API have been tested, and Twitch lifecycle tests use mocked events. Live Twitch authorization and actual channel delivery still require end-to-end verification.

## 4. How streamers and their community use the project

The streamer acts as the captain. After configuring a Twitch application and authorizing their broadcaster account, they launch a three-minute rescue mission and can add its read-only overlay to OBS. The captain chooses between a safer route and a faster, higher-risk route, monitors the ship, and can pause or restart the mission.

Viewers participate directly in Twitch chat: !boost powers the engines, !shield restores protection, and !scan locates stranded survivors. Each viewer can act once every two seconds. Three distinct viewers using all three roles within eight seconds trigger a Crew Sync bonus, rewarding coordination.

Together, the community aims to rescue nine people across three sectors. The crew manifest shows individual contributions, and the flight recorder captures recent events for export. Streamers and judges can also try the full game in demo mode without connecting a Twitch account.
