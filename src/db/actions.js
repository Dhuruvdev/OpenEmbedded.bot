/**
 * discord-bot/src/db/actions.js
 *
 * Button action queries against the shared `button_actions` table.
 * Used to keep the bot's in-memory action map in sync with what the
 * OpenEmbedded frontend has saved via the backend.
 *
 * Schema:
 *   button_actions (
 *     custom_id  TEXT PRIMARY KEY,
 *     steps      JSONB NOT NULL DEFAULT '[]',
 *     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   )
 */

const { getDb }      = require('./index');
const { makeLogger } = require('../utils/logger');

const log = makeLogger('DB:Actions');

/**
 * Load all button actions from the database.
 * @returns {Promise<Record<string, { steps: any[] }>>}
 */
async function loadActionsFromDb() {
    const sql = getDb();
    if (!sql) return {};

    try {
        const rows = await sql`SELECT custom_id, steps FROM button_actions`;
        const result = {};
        for (const row of rows) {
            result[row.custom_id] = { steps: row.steps ?? [] };
        }
        log.info(`Loaded ${rows.length} button action(s) from database`);
        return result;
    } catch (err) {
        log.warn('Could not load button actions:', err.message);
        return {};
    }
}

/**
 * Count rows in button_actions.
 * @returns {Promise<number>}
 */
async function countActions() {
    const sql = getDb();
    if (!sql) return 0;
    try {
        const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM button_actions`;
        return count;
    } catch { return 0; }
}

/**
 * Count rows in sent_messages.
 * @returns {Promise<number>}
 */
async function countSentMessages() {
    const sql = getDb();
    if (!sql) return 0;
    try {
        const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM sent_messages`;
        return count;
    } catch { return 0; }
}

module.exports = { loadActionsFromDb, countActions, countSentMessages };
