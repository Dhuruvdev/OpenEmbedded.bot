'use strict';

const { getDb } = require('../database/index');

class VerificationRepository {
    static async get(guildId) {
        const sql = getDb();
        if (!sql) return null;
        const [row] = await sql`
            SELECT * FROM verification_settings WHERE guild_id = ${guildId}
        `;
        return row ?? null;
    }

    static async save(guildId, data) {
        const sql = getDb();
        if (!sql) return null;

        const fields = {
            enabled:             data.enabled             ?? false,
            role_id:             data.role_id             ?? null,
            unverified_role_id:  data.unverified_role_id  ?? null,
            channel_id:          data.channel_id          ?? null,
            method:              data.method              ?? 'button',
            log_channel_id:      data.log_channel_id      ?? null,
            protected_categories: data.protected_categories ?? [],
            rules_text:          data.rules_text          ?? null,
        };

        const [row] = await sql`
            INSERT INTO verification_settings (
                guild_id, enabled, role_id, unverified_role_id,
                channel_id, method, log_channel_id, protected_categories, rules_text
            )
            VALUES (
                ${guildId}, ${fields.enabled}, ${fields.role_id}, ${fields.unverified_role_id},
                ${fields.channel_id}, ${fields.method}, ${fields.log_channel_id},
                ${fields.protected_categories}, ${fields.rules_text}
            )
            ON CONFLICT (guild_id) DO UPDATE SET
                enabled             = EXCLUDED.enabled,
                role_id             = EXCLUDED.role_id,
                unverified_role_id  = EXCLUDED.unverified_role_id,
                channel_id          = EXCLUDED.channel_id,
                method              = EXCLUDED.method,
                log_channel_id      = EXCLUDED.log_channel_id,
                protected_categories = EXCLUDED.protected_categories,
                rules_text          = EXCLUDED.rules_text,
                updated_at          = now()
            RETURNING *
        `;
        return row ?? null;
    }

    static async logVerification(guildId, userId, method = 'button') {
        const sql = getDb();
        if (!sql) return;
        await sql`
            INSERT INTO verification_log (guild_id, user_id, method)
            VALUES (${guildId}, ${userId}, ${method})
        `;
    }

    static async isVerified(guildId, userId) {
        const sql = getDb();
        if (!sql) return false;
        const [row] = await sql`
            SELECT 1 FROM verification_log
            WHERE guild_id = ${guildId} AND user_id = ${userId}
            LIMIT 1
        `;
        return !!row;
    }

    static async getStats(guildId) {
        const sql = getDb();
        if (!sql) return { total: 0, today: 0, week: 0 };
        const [row] = await sql`
            SELECT
                COUNT(*)                                    AS total,
                COUNT(*) FILTER (WHERE verified_at > now() - INTERVAL '1 day')  AS today,
                COUNT(*) FILTER (WHERE verified_at > now() - INTERVAL '7 days') AS week
            FROM verification_log
            WHERE guild_id = ${guildId}
        `;
        return { total: Number(row.total), today: Number(row.today), week: Number(row.week) };
    }
}

module.exports = { VerificationRepository };
