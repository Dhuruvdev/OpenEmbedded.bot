'use strict';

const { getDb }      = require('./index');
const { makeLogger } = require('../utils/logger');
const log = makeLogger('Schema');

async function initSchema() {
    const sql = getDb();
    if (!sql) {
        log.warn('No database — skipping schema init');
        return;
    }

    try {
        // ── Legacy tables (preserved) ──────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS button_actions (
                custom_id  TEXT        PRIMARY KEY,
                steps      JSONB       NOT NULL DEFAULT '[]',
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS sent_messages (
                id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
                channel_id     TEXT        NOT NULL,
                guild_id       TEXT,
                payload        JSONB       NOT NULL DEFAULT '{}',
                sent_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
                sent_by_email  TEXT
            )
        `;

        // ── Guild Settings ────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id        TEXT        PRIMARY KEY,
                log_channel_id  TEXT,
                mod_log_channel TEXT,
                mod_role_id     TEXT,
                prefix          TEXT        NOT NULL DEFAULT '!',
                locale          TEXT        NOT NULL DEFAULT 'en',
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `;

        // ── Verification Settings ─────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS verification_settings (
                guild_id            TEXT        PRIMARY KEY,
                enabled             BOOLEAN     NOT NULL DEFAULT false,
                role_id             TEXT,
                unverified_role_id  TEXT,
                channel_id          TEXT,
                method              TEXT        NOT NULL DEFAULT 'button',
                log_channel_id      TEXT,
                protected_categories TEXT[]     NOT NULL DEFAULT '{}',
                rules_text          TEXT,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `;

        // ── Verification Log ──────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS verification_log (
                id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
                guild_id   TEXT        NOT NULL,
                user_id    TEXT        NOT NULL,
                method     TEXT        NOT NULL DEFAULT 'button',
                verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `;

        // ── Warnings ──────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS warnings (
                id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
                guild_id     TEXT        NOT NULL,
                user_id      TEXT        NOT NULL,
                moderator_id TEXT        NOT NULL,
                reason       TEXT        NOT NULL,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings (guild_id, user_id)`;

        // ── Moderation Logs ───────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS moderation_logs (
                id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
                guild_id     TEXT        NOT NULL,
                user_id      TEXT        NOT NULL,
                moderator_id TEXT        NOT NULL,
                action       TEXT        NOT NULL,
                reason       TEXT,
                duration_ms  BIGINT,
                extra        JSONB       NOT NULL DEFAULT '{}',
                created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_modlogs_guild ON moderation_logs (guild_id, created_at DESC)`;

        // ── AutoMod Settings ──────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS automod_settings (
                guild_id           TEXT        PRIMARY KEY,
                anti_spam          BOOLEAN     NOT NULL DEFAULT false,
                anti_spam_count    INT         NOT NULL DEFAULT 5,
                anti_spam_window   INT         NOT NULL DEFAULT 5000,
                anti_mention_spam  BOOLEAN     NOT NULL DEFAULT false,
                anti_mention_max   INT         NOT NULL DEFAULT 5,
                anti_invite        BOOLEAN     NOT NULL DEFAULT false,
                anti_link          BOOLEAN     NOT NULL DEFAULT false,
                anti_scam          BOOLEAN     NOT NULL DEFAULT true,
                anti_caps          BOOLEAN     NOT NULL DEFAULT false,
                anti_caps_percent  INT         NOT NULL DEFAULT 70,
                anti_raid          BOOLEAN     NOT NULL DEFAULT false,
                anti_raid_threshold INT        NOT NULL DEFAULT 10,
                log_channel_id     TEXT,
                ignored_roles      TEXT[]      NOT NULL DEFAULT '{}',
                ignored_channels   TEXT[]      NOT NULL DEFAULT '{}',
                action             TEXT        NOT NULL DEFAULT 'delete',
                updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `;

        // ── Welcome Settings ──────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS welcome_settings (
                guild_id        TEXT        PRIMARY KEY,
                enabled         BOOLEAN     NOT NULL DEFAULT false,
                channel_id      TEXT,
                message         TEXT        NOT NULL DEFAULT 'Welcome {user} to **{server}**!',
                embed_enabled   BOOLEAN     NOT NULL DEFAULT true,
                embed_color     INT         NOT NULL DEFAULT 5793266,
                embed_title     TEXT        NOT NULL DEFAULT 'Welcome!',
                embed_image     TEXT,
                auto_role_id    TEXT,
                dm_enabled      BOOLEAN     NOT NULL DEFAULT false,
                dm_message      TEXT,
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `;

        // ── Ticket Settings ───────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS ticket_settings (
                guild_id            TEXT        PRIMARY KEY,
                enabled             BOOLEAN     NOT NULL DEFAULT false,
                support_channel_id  TEXT,
                category_id         TEXT,
                support_role_id     TEXT,
                log_channel_id      TEXT,
                panel_message_id    TEXT,
                max_per_user        INT         NOT NULL DEFAULT 1,
                updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `;

        // ── Tickets ───────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS tickets (
                id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
                guild_id    TEXT        NOT NULL,
                user_id     TEXT        NOT NULL,
                channel_id  TEXT        NOT NULL,
                type        TEXT        NOT NULL DEFAULT 'support',
                status      TEXT        NOT NULL DEFAULT 'open',
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                closed_at   TIMESTAMPTZ,
                closed_by   TEXT
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_tickets_guild_user ON tickets (guild_id, user_id)`;

        log.info('Schema initialised — all tables ready');
    } catch (err) {
        log.error('Schema init failed:', err.message);
        throw err;
    }
}

module.exports = { initSchema };
