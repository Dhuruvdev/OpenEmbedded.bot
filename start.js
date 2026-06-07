'use strict';

/**
 * start.js — Universal startup script for OpenEmbedded Bot
 *
 * Compatible with: Replit, Pterodactyl, VPS, bare Node.js
 * Node.js: >= 18
 * Usage:   node start.js
 *
 * Boot sequence:
 *   1. Load .env / validate required environment variables
 *   2. Database connectivity + schema init
 *   3. Slash command deployment (global)
 *   4. Bot login
 */

// ── 0. Load environment ────────────────────────────────────────────────────────
try { require('dotenv').config(); } catch { /* dotenv is optional */ }

const fs   = require('fs');
const path = require('path');

// ── TTY-safe logger (ANSI only when stdout is a real terminal) ─────────────────
const IS_TTY = Boolean(process.stdout.isTTY);

const c = IS_TTY ? {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    red:    '\x1b[31m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    blue:   '\x1b[34m',
    cyan:   '\x1b[36m',
} : Object.fromEntries(
    ['reset','bold','dim','red','green','yellow','blue','cyan'].map(k => [k, ''])
);

function ts() {
    return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function log(level, ns, ...args) {
    const icon = level === 'info'  ? `${c.green}✔${c.reset}` :
                 level === 'warn'  ? `${c.yellow}!${c.reset}` :
                 level === 'error' ? `${c.red}✖${c.reset}`   :
                                    `${c.cyan}●${c.reset}`;
    console.log(`${c.dim}${ts()}${c.reset} ${icon} ${c.bold}[${ns}]${c.reset}`, ...args);
}

function section(title) {
    const pad = '─'.repeat(Math.max(0, 50 - title.length));
    console.log(`\n${c.bold}${c.blue}── ${title} ${pad}${c.reset}`);
}

function fatal(msg) {
    console.error(`\n${c.red}${c.bold}✖ FATAL: ${msg}${c.reset}\n`);
    process.exit(1);
}

// ── Banner (plain ASCII so it renders on every host) ──────────────────────────
console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║        OpenEmbedded  ·  Discord Management Bot           ║');
console.log('║        Professional Server Platform  ·  v2.0.0           ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('  Moderation  |  Verification  |  AutoMod  |  Welcome  |  Tickets');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 1 — Environment validation
// ═══════════════════════════════════════════════════════════════════════════════
section('PHASE 1 — Environment');

const REQUIRED_ENV = [
    {
        key:      'DISCORD_BOT_TOKEN',
        validate: v => v.length > 40 && v.includes('.'),
        hint:     'Bot token from Discord Developer Portal → Bot → Reset Token',
    },
    {
        key:      'DISCORD_CLIENT_ID',
        validate: v => /^\d{17,20}$/.test(v),
        hint:     'Application ID from Discord Developer Portal → General Information',
    },
];

const OPTIONAL_ENV = [
    { key: 'DATABASE_URL',   hint: 'PostgreSQL URL — persistence disabled without it' },
    { key: 'BOT_OWNER_ID',  hint: 'Your Discord user ID — enables >>owner commands' },
    { key: 'BOT_LOG_LEVEL', hint: 'debug | info | warn | error  (default: info)' },
];

let envOk = true;

for (const e of REQUIRED_ENV) {
    const val = process.env[e.key];
    if (!val) {
        log('error', 'Env', `${e.key} is NOT SET  →  ${e.hint}`);
        envOk = false;
    } else if (e.validate && !e.validate(val)) {
        log('warn',  'Env', `${e.key} is set but looks malformed  →  ${e.hint}`);
    } else {
        log('info',  'Env', `${e.key}  ${c.dim}${val.slice(0, 8)}${'•'.repeat(10)} (set)${c.reset}`);
    }
}

for (const e of OPTIONAL_ENV) {
    const val = process.env[e.key];
    if (val) {
        const display = e.key === 'DATABASE_URL'
            ? val.replace(/:([^:@]{1,64})@/, ':****@').slice(0, 60)
            : val;
        log('info', 'Env', `${e.key}  ${c.dim}${display}${c.reset}`);
    } else {
        log('step', 'Env', `${e.key}  ${c.dim}not set — ${e.hint}${c.reset}`);
    }
}

if (!envOk) {
    console.log('');
    console.log('  Set the required secrets and restart.');
    console.log('  On Replit  →  Secrets tab in the sidebar');
    console.log('  On Pterodactyl  →  Startup Variables panel');
    console.log('  On VPS  →  create a .env file in the project root');
    fatal('Required environment variables are missing.');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 2 — 5  (async)
// ═══════════════════════════════════════════════════════════════════════════════
(async () => {

    // ── PHASE 2 — Database ─────────────────────────────────────────────────────
    section('PHASE 2 — Database');

    if (!process.env.DATABASE_URL) {
        log('warn', 'DB', 'DATABASE_URL not set — running without persistence');
        log('step', 'DB', 'Warnings, tickets, mod-logs and settings will not be saved');
    } else {
        log('step', 'DB', 'Connecting…');
        try {
            const postgres = require('postgres');
            const sql = postgres(process.env.DATABASE_URL, {
                max: 2, idle_timeout: 10, connect_timeout: 15, onnotice: () => {},
            });
            const [{ version }] = await sql`SELECT version()`;
            const pgVer = version?.match(/PostgreSQL ([\d.]+)/)?.[1] ?? '?';
            log('info', 'DB', `PostgreSQL ${pgVer} — connected`);

            log('step', 'DB', 'Verifying schema…');
            await runSchema(sql);
            log('info', 'DB', 'Schema ready — 10 tables verified');
            await sql.end({ timeout: 2 });
        } catch (err) {
            log('warn', 'DB', `Unreachable: ${err.message}`);
            log('warn', 'DB', 'Continuing without database — persistence disabled');
        }
    }

    // ── PHASE 3 — Slash command deployment ────────────────────────────────────
    section('PHASE 3 — Slash Commands');

    await deploySlashCommands().catch(err =>
        log('warn', 'Deploy', `Deployment failed: ${err.message} — existing commands remain active`)
    );

    // ── PHASE 4 — Bot launch ──────────────────────────────────────────────────
    section('PHASE 4 — Bot Launch');

    const {
        Client,
        GatewayIntentBits,
        Collection,
        Partials,
    } = require('discord.js');

    const { loadCommands }      = require('./src/handlers/commandHandler');
    const { loadEvents }        = require('./src/handlers/eventHandler');
    const { loadOwnerCommands } = require('./src/handlers/ownerHandler');
    const { initSchema }        = require('./src/database/schema');
    const { makeLogger }        = require('./src/utils/logger');

    const botLog = makeLogger('Bot');

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildPresences,
        ],
        partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
    });

    client.commands  = new Collection();
    client.cooldowns = new Collection();

    botLog.info('Initialising database schema…');
    await initSchema();

    botLog.info('Loading slash commands…');
    await loadCommands(client);

    botLog.info('Loading owner commands…');
    loadOwnerCommands();

    botLog.info('Registering event handlers…');
    loadEvents(client);

    botLog.info('Connecting to Discord Gateway…');
    await client.login(process.env.DISCORD_BOT_TOKEN);

    // ── Graceful shutdown ──────────────────────────────────────────────────────
    const proc = makeLogger('Process');
    process.on('uncaughtException',  err    => proc.error('Uncaught exception:',  err.stack));
    process.on('unhandledRejection', reason => proc.error('Unhandled rejection:', reason?.stack ?? reason));
    process.on('SIGTERM', () => { proc.info('SIGTERM — shutting down'); client.destroy(); process.exit(0); });
    process.on('SIGINT',  () => { proc.info('SIGINT  — shutting down'); client.destroy(); process.exit(0); });

})().catch(err => fatal(err.stack ?? err.message));

// ═══════════════════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════════════════

async function deploySlashCommands() {
    const { REST, Routes } = require('discord.js');
    const cmdDir = path.join(__dirname, 'src', 'commands');

    const commands = [];
    const skipped  = [];

    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (e.name === 'owner') continue;
                walk(full);
            } else if (e.name.endsWith('.js')) {
                try {
                    const mod = require(full);
                    if (mod?.data?.toJSON) {
                        commands.push(mod.data.toJSON());
                    } else {
                        skipped.push(e.name);
                    }
                } catch (err) {
                    log('warn', 'Deploy', `Could not load ${e.name}: ${err.message}`);
                }
            }
        }
    }
    walk(cmdDir);

    if (commands.length === 0) {
        log('warn', 'Deploy', 'No slash commands found — skipping');
        return;
    }

    log('step', 'Deploy', `Found ${commands.length} command(s)${skipped.length ? `, skipped ${skipped.length} non-slash file(s)` : ''}`);

    const rest  = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    const appId = process.env.DISCORD_CLIENT_ID;

    // Fetch existing commands to preserve Entry Point commands (Activities)
    const existing    = await rest.get(Routes.applicationCommands(appId));
    const entryPoints = existing.filter(cmd => cmd.type === 4);
    if (entryPoints.length) {
        log('step', 'Deploy', `Preserving ${entryPoints.length} Entry Point command(s)`);
    }

    await rest.put(Routes.applicationCommands(appId), {
        body: [...commands, ...entryPoints],
    });

    log('info', 'Deploy', `${commands.length} command(s) deployed globally${entryPoints.length ? ` (+ ${entryPoints.length} entry point(s))` : ''}`);
    log('step', 'Deploy', 'Global commands propagate within ~1 hour across all servers');
}

async function runSchema(sql) {
    await sql`CREATE TABLE IF NOT EXISTS button_actions (
        custom_id TEXT PRIMARY KEY, steps JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS sent_messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, channel_id TEXT NOT NULL,
        guild_id TEXT, payload JSONB NOT NULL DEFAULT '{}',
        sent_at TIMESTAMPTZ NOT NULL DEFAULT now(), sent_by_email TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY, log_channel_id TEXT, mod_log_channel TEXT,
        mod_role_id TEXT, prefix TEXT NOT NULL DEFAULT '!', locale TEXT NOT NULL DEFAULT 'en',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS verification_settings (
        guild_id TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT false,
        role_id TEXT, unverified_role_id TEXT, channel_id TEXT,
        method TEXT NOT NULL DEFAULT 'button', log_channel_id TEXT,
        protected_categories TEXT[] NOT NULL DEFAULT '{}', rules_text TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS verification_log (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL, method TEXT NOT NULL DEFAULT 'button',
        verified_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS warnings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL, moderator_id TEXT NOT NULL, reason TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings (guild_id, user_id)`;
    await sql`CREATE TABLE IF NOT EXISTS moderation_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL, moderator_id TEXT NOT NULL, action TEXT NOT NULL,
        reason TEXT, duration_ms BIGINT, extra JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE INDEX IF NOT EXISTS idx_modlogs_guild ON moderation_logs (guild_id, created_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS automod_settings (
        guild_id TEXT PRIMARY KEY, anti_spam BOOLEAN NOT NULL DEFAULT false,
        anti_spam_count INT NOT NULL DEFAULT 5, anti_spam_window INT NOT NULL DEFAULT 5000,
        anti_mention_spam BOOLEAN NOT NULL DEFAULT false, anti_mention_max INT NOT NULL DEFAULT 5,
        anti_invite BOOLEAN NOT NULL DEFAULT false, anti_link BOOLEAN NOT NULL DEFAULT false,
        anti_scam BOOLEAN NOT NULL DEFAULT true, anti_caps BOOLEAN NOT NULL DEFAULT false,
        anti_caps_percent INT NOT NULL DEFAULT 70, anti_raid BOOLEAN NOT NULL DEFAULT false,
        anti_raid_threshold INT NOT NULL DEFAULT 10, log_channel_id TEXT,
        ignored_roles TEXT[] NOT NULL DEFAULT '{}', ignored_channels TEXT[] NOT NULL DEFAULT '{}',
        action TEXT NOT NULL DEFAULT 'delete', updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS welcome_settings (
        guild_id TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT false, channel_id TEXT,
        message TEXT NOT NULL DEFAULT 'Welcome {user} to **{server}**!',
        embed_enabled BOOLEAN NOT NULL DEFAULT true, embed_color INT NOT NULL DEFAULT 5793266,
        embed_title TEXT NOT NULL DEFAULT 'Welcome!', embed_image TEXT, auto_role_id TEXT,
        dm_enabled BOOLEAN NOT NULL DEFAULT false, dm_message TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS ticket_settings (
        guild_id TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT false,
        support_channel_id TEXT, category_id TEXT, support_role_id TEXT,
        log_channel_id TEXT, panel_message_id TEXT, max_per_user INT NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL, channel_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'support', status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), closed_at TIMESTAMPTZ, closed_by TEXT)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tickets_guild_user ON tickets (guild_id, user_id)`;
}
