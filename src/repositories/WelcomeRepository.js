'use strict';

const { getDb } = require('../database/index');

class WelcomeRepository {
    static async get(guildId) {
        const sql = getDb();
        if (!sql) return null;
        const [row] = await sql`
            SELECT * FROM welcome_settings WHERE guild_id = ${guildId}
        `;
        return row ?? null;
    }

    static async save(guildId, data) {
        const sql = getDb();
        if (!sql) return null;

        const cols = Object.keys(data);
        const [row] = await sql`
            INSERT INTO welcome_settings (guild_id, ${sql(cols)})
            VALUES (${guildId}, ${sql(data, cols)})
            ON CONFLICT (guild_id) DO UPDATE
                SET ${sql(data, cols)}, updated_at = now()
            RETURNING *
        `;
        return row ?? null;
    }
}

module.exports = { WelcomeRepository };
