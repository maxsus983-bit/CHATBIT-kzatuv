# Minecraft Bedrock 26.30 Autonomous AI Agent

Telegram-controlled Minecraft Bedrock agent built around the real `bedrock-protocol` client.

## Current verified protocol target

The project targets Bedrock `1.26.30`. The PrismarineJS `bedrock-protocol` package currently lists `1.26.30` support, and its history records 1.26.30 support in the 3.57.0 release.

## Important reality

This repository does **not** fake capabilities.

The protocol client can receive packets such as chat, player/entity events and movement state, but a complete Minecraft bot requires correct packet-level implementations for every gameplay interaction. Where this repository does not have a verified implementation, it reports the limitation instead of pretending that a block was placed, mined, crafted, or seen.

## Requirements

- Node.js 22+
- npm
- A Bedrock server reachable by UDP
- Telegram bot token
- Telegram owner numeric ID
- OpenRouter API key/model if AI interpretation is desired

## Install

```bash
npm install
```

Copy:

```bash
cp .env.example .env
```

Fill:

```env
MINECRAFT_HOST=your.real.bedrock.host
MINECRAFT_PORT=27295
MINECRAFT_VERSION=1.26.30
MINECRAFT_USERNAME=AI_BOT

TELEGRAM_BOT_TOKEN=...
TELEGRAM_OWNER_ID=...

OPENROUTER_API_KEY=...
OPENROUTER_MODEL=...
OPENROUTER_FALLBACK_MODELS=...
```

### Authentication

For a server that permits offline/guest connections:

```env
MINECRAFT_OFFLINE=true
```

For an online-authenticated server:

```env
MINECRAFT_OFFLINE=false
```

The client uses the official authentication flow provided by the protocol library. Never put Microsoft credentials into source code.

## Run

```bash
npm start
```

Development:

```bash
npm run dev
```

Tests:

```bash
npm test
```

## Telegram examples

```text
Qani?
Nima bo‘lyapti?
Nima ko‘ryapsan?
Playerlar
Steve ni kuzat
10 blok oldinga yur
Oldimga kel
Chatga Salom hammaga deb yoz
Avtomatik o‘yna
O‘zing mustaqil harakat qil
To‘xta
```

## Commands

```text
/status
/players
/location
/memory
/tasks
/chat Salom
/autonomous
/stop
/pause
/resume
```

## Architecture

```text
Telegram
   |
   v
Natural Language / Commands
   |
   v
AI Brain
   |
   +--> Task Manager
   |
   +--> Memory
   |
   v
Minecraft Client
   |
   v
Bedrock Protocol
   |
   v
Minecraft Server

Minecraft packets
   |
   v
World Observer
   |
   +--> Player Tracker
   +--> Entity Tracker
   +--> Chat Monitor
   +--> Event Bus
   |
   v
Memory / Telegram Reports
```

## Security

`.env`, database files and logs are ignored by git.

Telegram commands are restricted to `TELEGRAM_OWNER_ID`.

OpenRouter and Telegram secrets are never intentionally written to logs.

## Known limitations

This first complete runtime provides real connection, protocol observation, chat, player/entity tracking, memory, Telegram control, AI intent interpretation, task tracking, and a conservative autonomous loop.

Advanced actions such as reliable arbitrary block breaking/placement, full inventory transaction handling, crafting, combat automation and robust obstacle-aware pathfinding require additional verified Bedrock packet implementations and world/chunk state handling. They are intentionally not faked.

## Troubleshooting

### Protocol mismatch

Use the exact server version:

```env
MINECRAFT_VERSION=1.26.30
```

Do not mix 26.20/26.30/26.40 packet schemas.

### Aternos

Do not put an Aternos website/redirect URL into `MINECRAFT_HOST`. The agent needs the actual Bedrock server hostname/IP and Bedrock UDP port shown by the server/host.

### Bot connects but movement does not happen

Movement is packet-level and server-side validation matters. Check the exact server version, spawn state and protocol logs before changing packet fields.

## Development rule

Never add a feature by inventing an API. Verify the packet/schema first, implement it, test it against a real 1.26.30 server, and only then expose it to the AI tool system.
