/**
 * /status — shows the bot's current connection status.
 */

const definition = {
    name:        'status',
    description: 'Show OpenEmbedded Bot status',
};

async function execute(interaction, { respond, botClient }) {
    const info = botClient?.getStatus() ?? {};
    const lines = [
        `**OpenEmbedded Bot** — Status Report`,
        ``,
        `> Connection: \`${info.status ?? 'unknown'}\``,
        `> Bot: \`${info.botUser?.username ?? 'N/A'}\``,
        `> Servers: \`${info.guilds?.length ?? 0}\``,
    ];
    if (info.error) lines.push(`> Error: ${info.error}`);

    await respond(interaction, {
        type: 4,
        data: { content: lines.join('\n'), flags: 64 },
    });
}

module.exports = { definition, execute };
