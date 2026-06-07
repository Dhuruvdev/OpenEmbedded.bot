'use strict';

// ════════════════════════════════════════════════════════════════════════════
//  start.js — Full auto-setup & launch script
//  Run with:  node start.js
//  Handles:   dependency install → env validation → DB init → command deploy
//             → bot login, all in one shot.
// ════════════════════════════════════════════════════════════════════════════

const { spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ── Minimal ANSI colours (zero external deps at this point) ───────────────
const c = {
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
    dim:     '\x1b[2m',
    red:     '\x1b[31m',
    green:   '\x1b[32m',
    yellow:  '\x1b[33m',
    blue:    '\x1b[34m',
    cyan:    '\x1b[36m',
};

const OK    = `${c.green}✔${c.reset}`;
const FAIL  = `${c.red}✖${c.reset}`;
const INFO  = `${c.cyan}●${c.reset}`;
const WARN  = `${c.yellow}!${c.reset}`;
const ARROW = `${c.blue}›${c.reset}`;

function ts() {
    return `${c.dim}${new Date().toISOString().replace('T', ' ').slice(0, 23)}${c.reset}`;
}
function log(icon, label, msg = '') {
    console.log(`${ts()} ${icon} ${c.bold}${label}${c.reset}${msg ? '  ' + msg : ''}`);
}
function section(title) {
    const line = '─'.repeat(Math.max(0, 54 - title.length));
    console.log(`\n${c.bold}${c.blue}── ${title} ${line}${c.reset}`);
}
function fatal(msg) {
    console.error(`\n${FAIL} ${c.red}${c.bold}FATAL:${c.reset} ${c.red}${msg}${c.reset}\n`);
    process.exit(1);
}

// ── Banner ────────────────────────────────────────────────────────────────
console.clear();
console.log(`
${c.blue}${c.bold}╔══════════════════════════════════════════════════════════╗
║        OpenEmbedded  ·  Discord Management Bot           ║
║        Professional Server Platform  •  v2.0.0           ║
╚══════════════════════════════════════════════════════════╝${c.reset}
${c.dim}  Moderation  •  Verification  •  AutoMod  •  Welcome  •  Tickets${c.reset}
`);

// ══════════════════════════════════════════════════════════════════════════
//  STEP 1 — Dependency check & auto-install
// ══════════════════════════════════════════════════════════════════════════
section('STEP 1 — Dependencies');

const REQUIRED_PACKAGES = [
    { name: 'discord.js', semver: '14.16.4' },
    { name: 'postgres',   semver: '3.4.5'   },
    { name: 'dotenv',     semver: '16.4.5'  },
];

function pkgInstalled(name) {
    try {
        require.resolve(path.join(process.cwd(), 'node_modules', name));
        return true;
    } catch {
        return false;
    }
}

function pkgVersion(name) {
    try {
        const p = require(path.join(process.cwd(), 'node_modules', name, 'package.json'));
        return p.version ?? '?';
    } catch {
        return null;
    }
}

const missing = REQUIRED_PACKAGES.filter(p => !pkgInstalled(p.name));

if (missing.length === 0) {
    for (const p of REQUIRED_PACKAGES) {
        log(OK, p.name, `${c.dim}v${pkgVersion(p.name)}${c.reset}`);
    }
    log(OK, 'All dependencies satisfied');
} else {
    log(WARN, 'Missing packages:', missing.map(p => p.name).join(', '));
    log(INFO, 'Running npm install — this may take a minute…');

    // Ensure package.json has the deps listed before installing
    const pkgPath = path.join(process.cwd(), 'package.json');
    let pkg = {};
    try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch { /* start fresh */ }
    pkg.name        = pkg.name        ?? 'discord-bot';
    pkg.version     = pkg.version     ?? '2.0.0';
    pkg.description = pkg.description ?? 'Professional Discord Server Management Bot';
    pkg.main        = pkg.main        ?? 'src/index.js';
    pkg.engines     = pkg.engines     ?? { node: '>=20' };
    pkg.scripts     = {
        start:  'node src/index.js',
        dev:    'node --watch src/index.js',
        deploy: 'node src/deploy-commands.js',
        ...(pkg.scripts ?? {}),
    };
    pkg.dependencies = pkg.dependencies ?? {};
    for (const p of REQUIRED_PACKAGES) {
        pkg.dependencies[p.name] = pkg.dependencies[p.name] ?? `^${p.semver}`;
    }
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

    const installPkgs = missing.map(p => `${p.name}@${p.semver}`);
    const res = spawnSync('npm', ['install', '--save', ...installPkgs], {
        stdio: 'inherit',
        cwd:   process.cwd(),
    });
    if (res.status !== 0) fatal('npm install failed. Check your network connection and try again.');

    for (const p of REQUIRED_PACKAGES) {
        log(OK, p.name, `${c.dim}v${pkgVersion(p.name)}${c.reset}`);
    }
    log(OK, 'All dependencies installed successfully');
}

// ══════════════════════════════════════════════════════════════════════════
//  STEP 2 — Load .env + Validate environment variables
// ══════════════════════════════════════════════════════════════════════════
section('STEP 2 — Environment');

const dotenv  = require('dotenv');
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        log(WARN, '.env parse error:', result.error.message);
    } else {
        log(OK, '.env loaded', `${c.dim}(${Object.keys(result.parsed ?? {}).length} variables)${c.reset}`);
    }
} else {
    dotenv.config();
    log(INFO, 'No .env file — reading from shell environment / Replit Secrets');
}

const REQUIRED_ENV = [
    {
        key:      'DISCORD_BOT_TOKEN',
        desc:     'Bot token — Discord Dev Portal → Your App → Bot → Reset Token',
        validate: v => v.length > 40 && v.includes('.'),
    },
    {
        key:      'DISCORD_CLIENT_ID',
        desc:     'Application ID — Discord Dev Portal → Your App → General Information',
        validate: v => /^\d{17,20}$/.test(v),
    },
];

const OPTIONAL_ENV = [
    { key: 'DATABASE_URL',  desc: 'PostgreSQL URL — persistence disabled without it' },
    { key: 'BOT_LOG_LEVEL', desc: 'Log verbosity: debug | info | warn | error  (default: info)' },
];

let envOk = true;
for (const e of REQUIRED_ENV) {
    const val = process.env[e.key];
    if (!val) {
        log(FAIL, e.key, `${c.red}NOT SET${c.reset}  ${c.dim}→ ${e.desc}${c.reset}`);
        envOk = false;
    } else if (e.validate && !e.validate(val)) {
        log(WARN, e.key, `${c.yellow}SET but looks malformed${c.reset}  ${c.dim}→ ${e.desc}${c.reset}`);
    } else {
        log(OK, e.key, `${c.dim}${val.slice(0, 8)}${'•'.repeat(12)} (set)${c.reset}`);
    }
}
for (const e of OPTIONAL_ENV) {
    const val = process.env[e.key];
    if (val) {
        const display = e.key === 'DATABASE_URL'
            ? val.replace(/:([^:@]{1,64})@/, ':****@')
            : val;
        log(OK, e.key, `${c.dim}${display.slice(0, 60)}${c.reset}`);
    } else {
        log(INFO, e.key, `${c.dim}not set  →  ${e.desc}${c.reset}`);
    }
}

if (!envOk) {
    console.log(`
${c.yellow}${c.bold}How to fix:${c.reset}

  ${ARROW} Open the ${c.bold}Secrets${c.reset} tab in your Replit sidebar  (or create a .env file)
  ${ARROW} Add ${c.bold}DISCORD_BOT_TOKEN${c.reset}  →  your bot token from discord.com/developers
  ${ARROW} Add ${c.bold}DISCORD_CLIENT_ID${c.reset}  →  the 18-digit application ID

  Once set, run ${c.bold}node start.js${c.reset} again.
`);
    fatal('Required environment variables are missing.');
}

// ══════════════════════════════════════════════════════════════════════════
//  STEP 3 — Database connectivity + schema init
// ══════════════════════════════════════════════════════════════════════════
section('STEP 3 — Database');

async function setupDatabase() {
    if (!process.env.DATABASE_URL) {
        log(WARN, 'DATABASE_URL not set — persistence disabled');
        log(INFO, '  Moderation logs, tickets, warnings, settings will not be saved between restarts');
        return false;
    }

    log(INFO, 'Testing connection…');
    const postgres = require('postgres');
    let sql;

    try {
        sql = postgres(process.env.DATABASE_URL, {
            max: 3, idle_timeout: 10, connect_timeout: 10, onnotice: () => {},
        });
        const [row] = await sql`SELECT version()`;
        const ver = row.version?.match(/PostgreSQL ([\d.]+)/)?.[1] ?? '?';
        log(OK, `PostgreSQL ${ver} — connected`);
    } catch (err) {
        log(WARN, 'Cannot reach database:', `${c.yellow}${err.message}${c.reset}`);
        log(WARN, 'Continuing without database — persistence disabled');
        try { await sql?.end({ timeout: 1 }); } catch { /* ignore */ }
        return false;
    }

    log(INFO, 'Verifying schema (10 tables)…');
    try {
        await sql`CREATE TABLE IF NOT EXISTS button_actions (
            custom_id  TEXT PRIMARY KEY,
            steps      JSONB NOT NULL DEFAULT '[]',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await sql`CREATE TABLE IF NOT EXISTS sent_messages (
            id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            channel_id    TEXT NOT NULL,
            guild_id      TEXT,
            payload       JSONB NOT NULL DEFAULT '{}',
            sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
            sent_by_email TEXT
        )`;
        await sql`CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id        TEXT PRIMARY KEY,
            log_channel_id  TEXT,
            mod_log_channel TEXT,
            mod_role_id     TEXT,
            prefix          TEXT NOT NULL DEFAULT '!',
            locale          TEXT NOT NULL DEFAULT 'en',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await sql`CREATE TABLE IF NOT EXISTS verification_settings (
            guild_id             TEXT PRIMARY KEY,
            enabled              BOOLEAN NOT NULL DEFAULT false,
            role_id              TEXT,
            unverified_role_id   TEXT,
            channel_id           TEXT,
            method               TEXT NOT NULL DEFAULT 'button',
            log_channel_id       TEXT,
            protected_categories TEXT[] NOT NULL DEFAULT '{}',
            rules_text           TEXT,
            created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await sql`CREATE TABLE IF NOT EXISTS verification_log (
            id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            guild_id    TEXT NOT NULL,
            user_id     TEXT NOT NULL,
            method      TEXT NOT NULL DEFAULT 'button',
            verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await sql`CREATE TABLE IF NOT EXISTS warnings (
            id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            guild_id     TEXT NOT NULL,
            user_id      TEXT NOT NULL,
            moderator_id TEXT NOT NULL,
            reason       TEXT NOT NULL,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await sql`CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings (guild_id, user_id)`;
        await sql`CREATE TABLE IF NOT EXISTS moderation_logs (
            id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            guild_id     TEXT NOT NULL,
            user_id      TEXT NOT NULL,
            moderator_id TEXT NOT NULL,
            action       TEXT NOT NULL,
            reason       TEXT,
            duration_ms  BIGINT,
            extra        JSONB NOT NULL DEFAULT '{}',
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await sql`CREATE INDEX IF NOT EXISTS idx_modlogs_guild ON moderation_logs (guild_id, created_at DESC)`;
        await sql`CREATE TABLE IF NOT EXISTS automod_settings (
            guild_id             TEXT PRIMARY KEY,
            anti_spam            BOOLEAN NOT NULL DEFAULT false,
            anti_spam_count      INT     NOT NULL DEFAULT 5,
            anti_spam_window     INT     NOT NULL DEFAULT 5000,
            anti_mention_spam    BOOLEAN NOT NULL DEFAULT false,
            anti_mention_max     INT     NOT NULL DEFAULT 5,
            anti_invite          BOOLEAN NOT NULL DEFAULT false,
            anti_link            BOOLEAN NOT NULL DEFAULT false,
            anti_scam            BOOLEAN NOT NULL DEFAULT true,
            anti_caps            BOOLEAN NOT NULL DEFAULT false,
            anti_caps_percent    INT     NOT NULL DEFAULT 70,
            anti_raid            BOOLEAN NOT NULL DEFAULT false,
            anti_raid_threshold  INT     NOT NULL DEFAULT 10,
            log_channel_id       TEXT,
            ignored_roles        TEXT[]  NOT NULL DEFAULT '{}',
            ignored_channels     TEXT[]  NOT NULL DEFAULT '{}',
            action               TEXT    NOT NULL DEFAULT 'delete',
            updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await sql`CREATE TABLE IF NOT EXISTS welcome_settings (
            guild_id      TEXT PRIMARY KEY,
            enabled       BOOLEAN NOT NULL DEFAULT false,
            channel_id    TEXT,
            message       TEXT NOT NULL DEFAULT 'Welcome {user} to **{server}**!',
            embed_enabled BOOLEAN NOT NULL DEFAULT true,
            embed_color   INT     NOT NULL DEFAULT 5793266,
            embed_title   TEXT    NOT NULL DEFAULT 'Welcome!',
            embed_image   TEXT,
            auto_role_id  TEXT,
            dm_enabled    BOOLEAN NOT NULL DEFAULT false,
            dm_message    TEXT,
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await sql`CREATE TABLE IF NOT EXISTS ticket_settings (
            guild_id           TEXT PRIMARY KEY,
            enabled            BOOLEAN NOT NULL DEFAULT false,
            support_channel_id TEXT,
            category_id        TEXT,
            support_role_id    TEXT,
            log_channel_id     TEXT,
            panel_message_id   TEXT,
            max_per_user       INT NOT NULL DEFAULT 1,
            updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await sql`CREATE TABLE IF NOT EXISTS tickets (
            id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            guild_id   TEXT NOT NULL,
            user_id    TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            type       TEXT NOT NULL DEFAULT 'support',
            status     TEXT NOT NULL DEFAULT 'open',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            closed_at  TIMESTAMPTZ,
            closed_by  TEXT
        )`;
        await sql`CREATE INDEX IF NOT EXISTS idx_tickets_guild_user ON tickets (guild_id, user_id)`;

        log(OK, 'Schema verified — 10 tables ready');
    } catch (err) {
        log(WARN, 'Schema error:', `${c.yellow}${err.message}${c.reset}`);
        log(WARN, 'Bot will continue — some features may be unavailable');
    } finally {
        await sql.end({ timeout: 2 });
    }
    return true;
}

// ══════════════════════════════════════════════════════════════════════════
//  STEP 4 — Slash command registration
// ══════════════════════════════════════════════════════════════════════════
section('STEP 4 — Slash Commands');

/** Recursively find the category folder name for a command */
function findCategoryOf(cmdName, dir, depth = 0) {
    if (!fs.existsSync(dir)) return 'other';
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            const found = findCategoryOf(cmdName, full, depth + 1);
            if (found !== 'other') return depth === 0 ? e.name : found;
        } else if (e.name === `${cmdName}.js`) {
            return depth === 0 ? 'root' : 'found';
        }
    }
    return 'other';
}

async function deployCommands() {
    const { REST, Routes } = require('discord.js');
    const cmdDir = path.join(__dirname, 'src', 'commands');

    const commands = [];
    const skipped  = [];

    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                walk(full);
            } else if (e.name.endsWith('.js')) {
                try {
                    const mod = require(full);
                    if (mod?.data?.toJSON) {
                        commands.push({ json: mod.data.toJSON(), file: e.name });
                    } else {
                        skipped.push(e.name);
                    }
                } catch (err) {
                    log(WARN, `Failed to load ${e.name}:`, err.message);
                    skipped.push(e.name);
                }
            }
        }
    }
    walk(cmdDir);

    if (commands.length === 0) {
        log(WARN, 'No slash commands found — skipping deployment');
        return;
    }

    log(OK, `Found ${commands.length} command(s)`);
    if (skipped.length) {
        log(INFO, `Skipped ${skipped.length} legacy file(s)`, `${c.dim}${skipped.join(', ')}${c.reset}`);
    }

    const rest  = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    const appId = process.env.DISCORD_CLIENT_ID;

    try {
        log(INFO, 'Fetching existing commands from Discord…');
        const existing    = await rest.get(Routes.applicationCommands(appId));
        const entryPoints = existing.filter(cmd => cmd.type === 4);

        const body = [...commands.map(c => c.json), ...entryPoints];
        log(INFO, `Deploying ${commands.length} command(s)${entryPoints.length ? ` + ${entryPoints.length} entry point(s)` : ''}…`);
        await rest.put(Routes.applicationCommands(appId), { body });

        log(OK, `${commands.length} slash command(s) deployed globally`);
        if (entryPoints.length) log(OK, `${entryPoints.length} Entry Point command(s) preserved`);

        // ── Print grouped command list ────────────────────────────────────
        const grouped = {};
        for (const { json: cmd } of commands) {
            const cat = findCategoryOf(cmd.name, cmdDir);
            (grouped[cat] ??= []).push(`/${cmd.name}`);
        }
        console.log('');
        for (const [cat, cmds] of Object.entries(grouped).sort()) {
            console.log(`  ${c.blue}${cat.padEnd(16)}${c.reset} ${c.dim}${cmds.join('  ')}${c.reset}`);
        }
        console.log('');
        log(INFO, `${c.dim}Global commands can take up to 1 hour to propagate across all servers.${c.reset}`);

    } catch (err) {
        log(WARN, 'Command deployment failed:', `${c.yellow}${err.message}${c.reset}`);
        log(WARN, 'The bot will still start — existing commands will remain active');
    }
}

// ══════════════════════════════════════════════════════════════════════════
//  STEP 5 — Launch bot
// ══════════════════════════════════════════════════════════════════════════
async function launchBot() {
    section('STEP 5 — Bot Launch');

    const {
        Client,
        GatewayIntentBits,
        Collection,
        Partials,
    } = require('discord.js');

    const { loadCommands } = require('./src/handlers/commandHandler');
    const { loadEvents }   = require('./src/handlers/eventHandler');
    const { initSchema }   = require('./src/database/schema');
    const { makeLogger }   = require('./src/utils/logger');

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

    botLog.info('Loading commands…');
    await loadCommands(client);

    botLog.info('Registering event handlers…');
    loadEvents(client);

    botLog.info('Connecting to Discord Gateway…');
    await client.login(process.env.DISCORD_BOT_TOKEN);

    // ── Graceful shutdown ─────────────────────────────────────────────────
    const proc = makeLogger('Process');
    process.on('uncaughtException',  err    => proc.error('Uncaught exception:',  err.stack));
    process.on('unhandledRejection', reason => proc.error('Unhandled rejection:', reason?.stack ?? reason));
    process.on('SIGTERM', () => { proc.info('SIGTERM received — shutting down'); client.destroy(); process.exit(0); });
    process.on('SIGINT',  () => { proc.info('SIGINT received — shutting down');  client.destroy(); process.exit(0); });
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN — orchestrate all steps
// ══════════════════════════════════════════════════════════════════════════
(async () => {
    const t0 = Date.now();
    try {
        // Steps 1 & 2 ran synchronously above at module load time
        await setupDatabase();
        await deployCommands();
        await launchBot();

        const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
        console.log(`\n${c.green}${c.bold}══ Startup complete in ${elapsed}s  •  Bot is online ══${c.reset}\n`);
    } catch (err) {
        fatal(`Startup failed:\n${err.stack ?? err.message}`);
    }
})();
