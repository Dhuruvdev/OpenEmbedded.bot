'use strict';

const { getDb } = require('../database/index');

class ModerationLogRepository {
    static async add({ guildId, userId, moderatorId, action, reason, durationMs, extra }) {
        const sql = getDb();
        if (!sql) return null;
        const [row] = await sql`
            INSERT INTO moderation_logs
                (guild_id, user_id, moderator_id, action, reason, duration_ms, extra)
            VALUES (
                ${guildId}, ${userId}, ${moderatorId}, ${action},
                ${reason ?? null}, ${durationMs ?? null}, ${JSON.stringify(extra ?? {})}
            )
            RETURNING *
        `;
        return row ?? null;
    }

    static async getRecent(guildId, limit = 20) {
        const sql = getDb();
        if (!sql) return [];
        return sql`
            SELECT * FROM moderation_logs
            WHERE guild_id = ${guildId}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    }

    static async getForUser(guildId, userId, limit = 10) {
        const sql = getDb();
        if (!sql) return [];
        return sql`
            SELECT * FROM moderation_logs
            WHERE guild_id = ${guildId} AND user_id = ${userId}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    }

    static async countByAction(guildId, action) {
        const sql = getDb();
        if (!sql) return 0;
        const [row] = await sql`
            SELECT COUNT(*) AS n FROM moderation_logs
            WHERE guild_id = ${guildId} AND action = ${action}
        `;
        return Number(row?.n ?? 0);
    }
}

module.exports = { ModerationLogRepository };
