# OpenEmbedded Bot

Self-hosted Discord bot for [OpenEmbedded](https://github.com/Dhuruvdev/OpenEmbedded) — the Discord UI component builder.

Handles button/select-menu interactions, slash commands, role assignment, and DB-synced action execution. Runs completely independently from the main app — it only shares a PostgreSQL database.

---

## How it connects to the rest of OpenEmbedded

```
┌─────────────────────────┐        ┌──────────────────────┐
│  OpenEmbedded Frontend  │──API──▶│  OpenEmbedded Backend│
│  (React / Vite)         │        │  (Express)           │
└─────────────────────────┘        └──────────┬───────────┘
                                              │ writes
                                              ▼
                                   ┌──────────────────────┐
                                   │  PostgreSQL Database  │
                                   │  • button_actions     │
                                   │  • sent_messages      │
                                   └──────────┬───────────┘
                                              │ reads (every 60s)
                                              ▼
                                   ┌──────────────────────┐
                                   │  OpenEmbedded Bot     │◀── this repo
                                   │  (this repo)          │
                                   └──────────────────────┘
```

The bot **never calls the backend API directly**. It reads button action configs from the shared database every 60 seconds (configurable). When a user clicks a button in Discord, the bot executes the configured steps (reply, give role, DM user, etc.).

---

## Quick start

### 1. Clone & install

```bash
git clone https://github.com/Dhuruvdev/OpenEmbedded.bot.git
cd OpenEmbedded.bot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in all values
```

### 3. Run

```bash
npm start
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_BOT_TOKEN` | ✅ | Bot token from the Discord Developer Portal |
| `DISCORD_CLIENT_ID` | ✅ | Application ID from General Information |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (same DB as the backend) |
| `DB_SYNC_INTERVAL` | optional | How often (ms) to reload actions from DB. Default: `60000`. Set to `0` to sync once on startup only. |
| `BOT_LOG_LEVEL` | optional | Log level: `debug` \| `info` \| `warn` \| `error`. Default: `info` |

> **Note:** The backend uses `NEON_DATABASE_URL` internally. For the bot, set `DATABASE_URL` to the same Neon (or any PostgreSQL) connection string the backend uses.

---

## Database schema

The bot automatically creates its tables on first startup — no manual migrations needed.

```sql
-- Button action mappings set from the OpenEmbedded UI
CREATE TABLE IF NOT EXISTS button_actions (
    custom_id  TEXT        PRIMARY KEY,
    steps      JSONB       NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Message audit log
CREATE TABLE IF NOT EXISTS sent_messages (
    id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    channel_id    TEXT        NOT NULL,
    guild_id      TEXT,
    payload       JSONB       NOT NULL DEFAULT '{}',
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_by_email TEXT
);
```

---

## Slash commands

| Command | Description |
|---|---|
| `/ping` | Check bot latency |
| `/status` | Gateway connection status |
| `/connections` | Live status of DB, API, and Gateway |
| `/stats` | Usage statistics (actions configured, messages sent) |
| `/help` | List all commands |

---

## Docker

```bash
# Build
docker build -t openembedded-bot .

# Run (with .env file)
docker run --env-file .env openembedded-bot

# Or with individual env vars
docker run \
  -e DISCORD_BOT_TOKEN=your_token \
  -e DISCORD_CLIENT_ID=your_client_id \
  -e DATABASE_URL=postgresql://... \
  openembedded-bot
```

---

## Deploy on Railway / Fly.io / DigitalOcean

Set the three required environment variables in your host's dashboard, then deploy from this repo. No build step needed — the bot runs directly with `node src/index.js`.

**Railway:** Connect this repo → set env vars → deploy.  
**Fly.io:** `fly launch` → `fly secrets set DISCORD_BOT_TOKEN=... DISCORD_CLIENT_ID=... DATABASE_URL=...` → `fly deploy`.

---

## Project structure

```
src/
├── index.js              Entry point (standalone + library mode)
├── commands/             Slash command definitions and handler
│   ├── registry.js       Deploy + route commands
│   └── ping|status|connections|stats|help.js
├── db/
│   ├── index.js          PostgreSQL connection pool + initDb()
│   └── actions.js        button_actions queries
├── gateway/
│   └── client.js         Discord Gateway WebSocket client (v10)
├── interactions/
│   ├── handler.js        Routes incoming interactions
│   └── actions.js        Executes button/select-menu step sequences
├── presence/
│   ├── userPresence.js   User Rich Presence via headless sessions
│   └── activities.js     Activity payload templates
└── utils/
    ├── api.js            Discord REST API wrapper
    └── logger.js         Structured logger
```
