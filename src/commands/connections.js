/**
 * /connections — shows live status of every integration the bot depends on.
 *
 *   Discord Gateway  ✅ Connected
 *   Database         ✅ Connected (12 ms)
 *   Discord REST API ✅ Reachable
 */

const { pingDb }     = require('../db/index');
const { makeLogger } = require('../utils/logger');

const log = makeLogger('Cmd:/connections');

const definition = {
    name:        'connections',
    description: 'Show live status of all OpenEmbedded Bot connections',
};

async function execute(interaction, { respond, botClient }) {
    // Run all checks in parallel for speed
    const [db, apiResult] = await Promise.all([
        pingDb(),
        fetch('https://discord.com/api/v10/gateway')
            .then(r => ({ ok: r.ok, latencyMs: 0 }))
            .catch(() => ({ ok: false, latencyMs: 0 })),
    ]);

    const gwStatus = botClient?.status ?? 'unknown';
    const gwOk     = gwStatus === 'connected';
    const botUser  = botClient?.botUser;

    const lines = [
        '**OpenEmbedded Bot — Connection Status**',
        '',
        `${gwOk ? '✅' : '❌'} **Discord Gateway**   \`${gwStatus}\``,
        db.ok
            ? `✅ **Database (PostgreSQL)**   \`connected\`  —  ${db.latencyMs}ms`
            : `❌ **Database (PostgreSQL)**   \`${db.error ?? 'unreachable'}\``,
        apiResult.ok
            ? `✅ **Discord REST API**   \`reachable\``
            : `❌ **Discord REST API**   \`unreachable\``,
    ];

    if (botUser) {
        lines.push('');
        lines.push(`> **${botUser.username}** · ${botClient?.guilds?.length ?? 0} server(s) · \`${botUser.id}\``);
    }

    log.info(`/connections checked by ${interaction.member?.user?.username ?? interaction.user?.username}`);

    await respond(interaction, {
        type: 4,
        data: { content: lines.join('\n'), flags: 64 },
    });
}

module.exports = { definition, execute };
