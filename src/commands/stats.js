/**
 * /stats — shows bot usage statistics pulled live from the database.
 */

const { countActions, countSentMessages } = require('../db/actions');
const { makeLogger } = require('../utils/logger');

const log = makeLogger('Cmd:/stats');

const definition = {
    name:        'stats',
    description: 'Show OpenEmbedded Bot usage statistics',
};

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

async function execute(interaction, { respond, botClient }) {
    const [actions, messages] = await Promise.all([
        countActions(),
        countSentMessages(),
    ]);

    const uptime  = formatUptime(process.uptime() * 1000);
    const guilds  = botClient?.guilds?.length ?? 0;
    const memMb   = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

    const lines = [
        '**OpenEmbedded Bot — Statistics**',
        '',
        `⏱️  Uptime: \`${uptime}\``,
        `🖥️  Memory: \`${memMb} MB\``,
        `🏠  Servers: \`${guilds}\``,
        '',
        `🔘  Button actions configured: \`${actions}\``,
        `📨  Messages sent via bot: \`${messages}\``,
    ];

    log.info(`/stats served — ${actions} actions, ${messages} messages`);

    await respond(interaction, {
        type: 4,
        data: { content: lines.join('\n'), flags: 64 },
    });
}

module.exports = { definition, execute };
