/**
 * /ping — basic latency check slash command.
 */

const definition = {
    name:        'ping',
    description: 'Check OpenEmbedded Bot latency',
};

async function execute(interaction, { respond }) {
    const start = Date.now();
    await respond(interaction, {
        type: 4,
        data: {
            content: `🏓 Pong! Latency: **${Date.now() - start}ms**`,
            flags:   64,   // ephemeral
        },
    });
}

module.exports = { definition, execute };
