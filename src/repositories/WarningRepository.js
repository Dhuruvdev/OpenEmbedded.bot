'use strict';

const { getDb } = require('../database/index');

class WarningRepository {
    static async add(guildId, userId, moderatorId, reason) {
        const sql = getDb();
        if (!sql) return null;
        const [row] = await sql`
            INSERT INTO warnings (guild_id, user_id, moderator_id, reason)
            VALUES (${guildId}, ${userId}, ${moderatorId}, ${reason})
            RETURNING *
        `;
        return row ?? null;
    }

    static async getAll(guildId, userId) {
        const sql = getDb();
        if (!sql) return [];
        return sql`
            SELECT * FROM warnings
            WHERE guild_id = ${guildId} AND user_id = ${userId}
            ORDER BY created_at DESC
        `;
    }

    static async count(guildId, userId) {
        const sql = getDb();
        if (!sql) return 0;
        const [row] = await sql`
            SELECT COUNT(*) AS n FROM warnings
            WHERE guild_id = ${guildId} AND user_id = ${userId}
        `;
        return Number(row?.n ?? 0);
    }

    static async clearAll(guildId, userId) {
        const sql = getDb();
        if (!sql) return 0;
        const result = await sql`
            DELETE FROM warnings
            WHERE guild_id = ${guildId} AND user_id = ${userId}
        `;
        return result.count ?? 0;
    }

    static async deleteOne(id, guildId) {
        const sql = getDb();
        if (!sql) return false;
        const result = await sql`
            DELETE FROM warnings
            WHERE id = ${id} AND guild_id = ${guildId}
        `;
        return (result.count ?? 0) > 0;
    }
}

module.exports = { WarningRepository };
