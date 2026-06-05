/**
 * discord-bot/start.js
 *
 * OpenEmbedded Bot — startup payload.
 *
 * Orchestrates the full boot sequence:
 *   1. Load environment
 *   2. Pre-flight env validation
 *   3. Database ping + schema init
 *   4. Bot + interaction handler construction
 *   5. On ready: slash command deploy + initial DB sync
 *   6. Periodic DB sync
 *   7. Graceful shutdown (SIGTERM / SIGINT)
 *
 * Place: discord-bot/start.js  (sibling to src/, not inside it)
 * Usage: node start.js
 */

'use strict';

// ── 1. Environment ─────────────────────────────────────────────────────────────
try { require('dotenv').config(); } catch { /* optional */ }

// ── Themed logger (mirrors src/utils/logger.js format) ───────────────────────
function ts() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
function makeLog(ns) {
    const tag = `[${ns}]`;
    return {
        info:  (...a) => console.log  (`${ts()} ${tag}`, ...a),
        warn:  (...a) => console.warn (`${ts()} ${tag}`, ...a),
        error: (...a) => console.error(`${ts()} ${tag}`, ...a),
        blank: ()     => console.log  (''),
    };
}

const log = makeLog('Startup');

// ── Startup banner ─────────────────────────────────────────────────────────────
console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║          OpenEmbedded Bot  —  start.js           ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');

// ── 2. Pre-flight env validation ───────────────────────────────────────────────
log.info('Phase 1/4 — Environment check');

const token  = process.env.DISCORD_BOT_TOKEN;
const appId  = process.env.DISCORD_CLIENT_ID;
const dbUrl  = process.env.DATABASE_URL;
const syncMs = Math.max(0, parseInt(process.env.DB_SYNC_INTERVAL ?? '60000', 10));

let envOk = true;

if (!token) {
    log.error('DISCORD_BOT_TOKEN is not set — cannot connect to Discord Gateway');
    envOk = false;
} else {
    log.info('DISCORD_BOT_TOKEN  ✓');
}

if (!appId) {
    log.warn('DISCORD_CLIENT_ID  not set — slash commands will NOT be deployed');
} else {
    log.info('DISCORD_CLIENT_ID  ✓');
}

if (!dbUrl) {
    log.warn('DATABASE_URL       not set — running without database (button actions empty)');
} else {
    log.info('DATABASE_URL       ✓');
}

log.info(`DB_SYNC_INTERVAL   ${syncMs > 0 ? `${syncMs / 1000}s` : 'disabled'}`);
log.info(`BOT_LOG_LEVEL      ${process.env.BOT_LOG_LEVEL ?? 'info (default)'}`);
log.blank();

if (!envOk) {
    log.error('Startup aborted — fix the missing required env vars above.');
    process.exit(1);
}

// ── Load src/ modules after env is validated ───────────────────────────────────
const { BotClient }          = require('./src/gateway/client');
const { InteractionHandler } = require('./src/interactions/handler');
const { deployCommands }     = require('./src/commands/registry');
const { initDb, pingDb }     = require('./src/db/index');
const { loadActionsFromDb }  = require('./src/db/actions');

// ── 3. Database ────────────────────────────────────────────────────────────────
(async () => {
    log.info('Phase 2/4 — Database');

    if (dbUrl) {
        const ping = await pingDb();
        if (ping.ok) {
            log.info(`Ping OK  (${ping.latencyMs}ms)`);
        } else {
            log.warn(`Ping failed: ${ping.error} — continuing without DB`);
        }
        await initDb();
    } else {
        log.warn('Skipped — DATABASE_URL not configured');
    }

    log.blank();

    // ── 4. Bot construction ────────────────────────────────────────────────────
    log.info('Phase 3/4 — Bot setup');

    const bot     = new BotClient();
    const handler = new InteractionHandler(bot);

    // Surface Gateway errors without crashing immediately
    bot.on('error', err => {
        const logErr = makeLog('Gateway');
        logErr.error(err.message);
    });

    // ── 5. Ready: deploy commands + initial sync ───────────────────────────────
    bot.on('ready', async (user) => {
        const logReady = makeLog('Ready');
        logReady.info(`Logged in as ${user.username}#${user.discriminator} (${user.id})`);
        log.blank();
        log.info('Phase 4/4 — Post-ready tasks');

        if (appId) {
            await deployCommands(token, appId);
        }

        await syncActions();

        if (syncMs > 0) {
            setInterval(syncActions, syncMs);
            makeLog('Sync').info(`Periodic DB sync every ${syncMs / 1000}s`);
        }

        log.blank();
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║              Bot is online and ready.            ║');
        console.log('╚══════════════════════════════════════════════════╝');
        console.log('');
    });

    // ── DB sync helper ─────────────────────────────────────────────────────────
    async function syncActions() {
        const logSync = makeLog('Sync');
        try {
            const actions = await loadActionsFromDb();
            const count   = Object.keys(actions).length;
            bot.setButtonActions(actions);
            handler.setActions(actions);
            if (count > 0) logSync.info(`Synced ${count} button action(s)`);
        } catch (err) {
            logSync.warn('DB sync failed:', err.message);
        }
    }

    // ── 6. Graceful shutdown ───────────────────────────────────────────────────
    function shutdown(signal) {
        log.blank();
        log.info(`${signal} received — shutting down gracefully…`);
        bot.disconnect();
        process.exit(0);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('uncaughtException', err => {
        makeLog('Process').error('Uncaught exception:', err.message);
        process.exit(1);
    });

    process.on('unhandledRejection', reason => {
        makeLog('Process').error('Unhandled rejection:', reason?.message ?? String(reason));
    });

    // ── Connect ────────────────────────────────────────────────────────────────
    log.info('Connecting to Discord Gateway…');
    log.blank();
    bot.connect(token);
})();
