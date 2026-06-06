'use strict';

const { getDb } = require('../database/index');

class TicketRepository {
    static async getSettings(guildId) {
        const sql = getDb();
        if (!sql) return null;
        const [row] = await sql`
            SELECT * FROM ticket_settings WHERE guild_id = ${guildId}
        `;
        return row ?? null;
    }

    static async saveSettings(guildId, data) {
        const sql = getDb();
        if (!sql) return null;
        const cols = Object.keys(data);
        const [row] = await sql`
            INSERT INTO ticket_settings (guild_id, ${sql(cols)})
            VALUES (${guildId}, ${sql(data, cols)})
            ON CONFLICT (guild_id) DO UPDATE
                SET ${sql(data, cols)}, updated_at = now()
            RETURNING *
        `;
        return row ?? null;
    }

    static async create(guildId, userId, channelId, type = 'support') {
        const sql = getDb();
        if (!sql) return null;
        const [row] = await sql`
            INSERT INTO tickets (guild_id, user_id, channel_id, type)
            VALUES (${guildId}, ${userId}, ${channelId}, ${type})
            RETURNING *
        `;
        return row ?? null;
    }

    static async getOpen(guildId, userId) {
        const sql = getDb();
        if (!sql) return [];
        return sql`
            SELECT * FROM tickets
            WHERE guild_id = ${guildId} AND user_id = ${userId} AND status = 'open'
        `;
    }

    static async getByChannel(channelId) {
        const sql = getDb();
        if (!sql) return null;
        const [row] = await sql`
            SELECT * FROM tickets WHERE channel_id = ${channelId} LIMIT 1
        `;
        return row ?? null;
    }

    static async close(channelId, closedBy) {
        const sql = getDb();
        if (!sql) return;
        await sql`
            UPDATE tickets
            SET status = 'closed', closed_at = now(), closed_by = ${closedBy}
            WHERE channel_id = ${channelId}
        `;
    }

    static async countOpen(guildId, userId) {
        const sql = getDb();
        if (!sql) return 0;
        const [row] = await sql`
            SELECT COUNT(*) AS n FROM tickets
            WHERE guild_id = ${guildId} AND user_id = ${userId} AND status = 'open'
        `;
        return Number(row?.n ?? 0);
    }
}

module.exports = { TicketRepository };
