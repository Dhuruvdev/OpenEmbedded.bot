/**
 * /help — lists every available slash command with a short description.
 */

const definition = {
    name:        'help',
    description: 'List all OpenEmbedded Bot commands',
};

async function execute(interaction, { respond }) {
    const lines = [
        '**OpenEmbedded Bot — Commands**',
        '',
        '`/ping`          Check bot latency',
        '`/status`        Current gateway connection status',
        '`/connections`   Live status of all integrations (DB, API, Gateway)',
        '`/stats`         Usage statistics (button actions, messages sent)',
        '`/help`          This message',
        '',
        '> Built with **OpenEmbedded** — discord.builders',
    ];

    await respond(interaction, {
        type: 4,
        data: { content: lines.join('\n'), flags: 64 },
    });
}

module.exports = { definition, execute };
