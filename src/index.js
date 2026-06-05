/**
 * discord-bot/src/index.js
 *
 * OpenEmbedded Bot — entry point for both standalone deployment and library use.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  STANDALONE DEPLOYMENT (bot hosting server)                              │
 * │  ─────────────────────────────────────────                               │
 * │  1. Copy .env.example → .env and fill in your values, OR set env vars   │
 * │     directly on your host (Railway, Fly.io, DigitalOcean, etc.)         │
 * │  2. npm install                                                          │
 * │  3. npm start                                                            │
 * │                                                                          │
 * │  Required env vars:                                                      │
 * │    DISCORD_BOT_TOKEN   — Bot token from Discord Developer Portal         │
 * │    DISCORD_CLIENT_ID   — Application ID from Developer Portal            │
 * │    DATABASE_URL        — postgresql://... (same DB as your backend)      │
 * │                                                                          │
 * │  What runs here:                                                         │
 * │    • Discord Gateway WebSocket (handles interactions, shows presence)    │
 * │    • Slash commands: /ping /status /connections /stats /help             │
 * │    • Button / select-menu interaction handler                            │
 * │    • DB sync: reloads button actions every DB_SYNC_INTERVAL ms           │
 * │    • Schema init: creates tables on first run automatically              │
 * │                                                                          │
 * │  LIBRARY MODE (imported by the backend in this monorepo)                │
 * │  ──────────────────────────────────────────────────────                  │
 * │    const { BotClient, userPresence } = require('discord-bot');           │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

const { BotClient }          = require('./gateway/client');
const { userPresence, UserPresence } = require('./presence/userPresence');
const { InteractionHandler } = require('./interactions/handler');
const { deployCommands }     = require('./commands/registry');
const { makeLogger }         = require('./utils/logger');

const log = makeLogger('OpenEmbedded Bot');

// ── Library exports ───────────────────────────────────────────────────────────
module.exports = {
    BotClient,
    UserPresence,
    userPresence,
    InteractionHandler,
    deployCommands,
    makeLogger,
};

// ── Standalone mode ───────────────────────────────────────────────────────────
if (require.main === module) {
    // Wrap in async IIFE so we can await at the top level
    (async () => {
        // Load .env file (only in standalone mode; backend manages its own env)
        try { require('dotenv').config(); } catch { /* dotenv optional */ }

        const token  = process.env.DISCORD_BOT_TOKEN;
        const appId  = process.env.DISCORD_CLIENT_ID;
        const syncMs = parseInt(process.env.DB_SYNC_INTERVAL ?? '60000', 10);

        if (!token) {
            log.error('DISCORD_BOT_TOKEN is required. See .env.example for setup.');
            process.exit(1);
        }
        if (!appId) {
            log.warn('DISCORD_CLIENT_ID not set — slash commands will NOT be deployed.');
        }
        if (!process.env.DATABASE_URL) {
            log.warn('DATABASE_URL not set — running without database (button actions will be empty).');
        }

        // ── DB: ensure schema exists on first deployment ──────────────────────
        const { initDb }            = require('./db/index');
        const { loadActionsFromDb } = require('./db/actions');

        await initDb(); // safe no-op if DATABASE_URL missing or tables already exist

        // ── Bot setup ─────────────────────────────────────────────────────────
        const bot     = new BotClient();
        const handler = new InteractionHandler(bot);

        // Crash guard
        bot.on('error', err => log.error('Gateway error:', err.message));

        // ── On ready: deploy slash commands + load actions from DB ────────────
        bot.on('ready', async (user) => {
            log.info(`Logged in as ${user.username}#${user.discriminator} (${user.id})`);

            if (appId) {
                await deployCommands(token, appId);
            }

            await syncActions();

            // Periodic DB sync so the bot picks up new button configs from the UI
            if (syncMs > 0) {
                setInterval(syncActions, syncMs);
                log.info(`DB sync every ${syncMs / 1000}s`);
            }
        });

        async function syncActions() {
            try {
                const actions = await loadActionsFromDb();
                const count   = Object.keys(actions).length;
                bot.setButtonActions(actions);
                handler.setActions(actions);
                if (count > 0) log.info(`Synced ${count} button action(s) from DB`);
            } catch (err) {
                log.warn('DB sync failed:', err.message);
            }
        }

        // ── Graceful shutdown ─────────────────────────────────────────────────
        async function shutdown(signal) {
            log.info(`${signal} received — shutting down gracefully…`);
            bot.disconnect();
            process.exit(0);
        }

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT',  () => shutdown('SIGINT'));
        process.on('uncaughtException', err => {
            log.error('Uncaught exception:', err.message);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason) => {
            log.error('Unhandled rejection:', reason?.message ?? reason);
        });

        // ── Connect ───────────────────────────────────────────────────────────
        log.info('Starting OpenEmbedded Bot…');
        bot.connect(token);
    })();
}
