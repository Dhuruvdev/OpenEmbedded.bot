'use strict';

const { getDb } = require('../database/index');

class GuildRepository {
    static async get(guildId) {
        const sql = getDb();
        if (!sql) return null;
        const [row] = await sql`
            SELECT * FROM guild_settings WHERE guild_id = ${guildId}
        `;
        return row ?? null;
    }

    static async upsert(guildId, data = {}) {
        const sql = getDb();
        if (!sql) return null;
        const [row] = await sql`
            INSERT INTO guild_settings (guild_id, ${sql(data)})
            VALUES (${guildId}, ${sql(Object.values(data))})
            ON CONFLICT (guild_id) DO UPDATE
                SET ${sql(data)}, updated_at = now()
            RETURNING *
        `;
        return row ?? null;
    }

    static async setLogChannel(guildId, channelId) {
        const sql = getDb();
        if (!sql) return;
        await sql`
            INSERT INTO guild_settings (guild_id, log_channel_id)
            VALUES (${guildId}, ${channelId})
            ON CONFLICT (guild_id) DO UPDATE
                SET log_channel_id = ${channelId}, updated_at = now()
        `;
    }

    static async setModLogChannel(guildId, channelId) {
        const sql = getDb();
        if (!sql) return;
        await sql`
            INSERT INTO guild_settings (guild_id, mod_log_channel)
            VALUES (${guildId}, ${channelId})
            ON CONFLICT (guild_id) DO UPDATE
                SET mod_log_channel = ${channelId}, updated_at = now()
        `;
    }
}

module.exports = { GuildRepository };
