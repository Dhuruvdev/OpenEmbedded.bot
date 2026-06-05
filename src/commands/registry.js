/**
 * discord-bot/src/commands/registry.js
 *
 * Slash command registry.
 *   deployCommands(token, applicationId) — registers commands with Discord API
 *   handleCommand(interaction, helpers)   — dispatches to the right command
 *
 * All commands:
 *   /ping         Latency check
 *   /status       Gateway connection status
 *   /connections  Live status of all integrations (DB, API, Gateway)
 *   /stats        Usage statistics from the database
 *   /help         Lists all commands
 */

const { discordFetch, respondToInteraction } = require('../utils/api');
const { makeLogger } = require('../utils/logger');

const ping        = require('./ping');
const status      = require('./status');
const connections = require('./connections');
const stats       = require('./stats');
const help        = require('./help');

const log = makeLogger('Commands');

const COMMANDS = [ping, status, connections, stats, help];

/**
 * Register all slash commands as global application commands with Discord.
 * Global commands roll out to all servers within ~1 hour.
 *
 * @param {string} botToken
 * @param {string} applicationId
 */
async function deployCommands(botToken, applicationId) {
    if (!botToken || !applicationId) {
        log.warn('deployCommands: missing token or applicationId — skipping');
        return;
    }

    const definitions = COMMANDS.map(c => c.definition);

    try {
        await discordFetch(
            `/applications/${applicationId}/commands`,
            botToken,
            { method: 'PUT', body: JSON.stringify(definitions) },
        );
        log.info(
            `Deployed ${definitions.length} slash command(s): ` +
            definitions.map(c => `/${c.name}`).join(', ')
        );
    } catch (err) {
        log.error('Failed to deploy commands:', err.message);
    }
}

/**
 * Handle an incoming APPLICATION_COMMAND interaction (type 2).
 * Called from InteractionHandler when the interaction type is 2.
 *
 * @param {object} interaction — raw Discord interaction payload
 * @param {object} helpers     — { respond, botClient }
 */
async function handleCommand(interaction, helpers) {
    const name    = interaction.data?.name;
    const command = COMMANDS.find(c => c.definition.name === name);

    if (!command) {
        log.warn(`Unknown slash command: /${name}`);
        await helpers.respond(interaction, {
            type: 4,
            data: { content: `Unknown command \`/${name}\``, flags: 64 },
        });
        return;
    }

    try {
        await command.execute(interaction, helpers);
    } catch (err) {
        log.error(`Command /${name} threw:`, err.message);
        await helpers.respond(interaction, {
            type: 4,
            data: { content: `An error occurred running \`/${name}\`.`, flags: 64 },
        }).catch(() => {});
    }
}

module.exports = { deployCommands, handleCommand, COMMANDS };
