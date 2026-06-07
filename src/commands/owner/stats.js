'use strict';

const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS } = require('../../config/constants');
const { pingDb } = require('../../database/index');

function formatBytes(b) {
    if (b < 1024) return `${b} B`;
    if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
    return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

module.exports = {
    name:        'stats',
    aliases:     ['botstats', 'info'],
    description: 'Show detailed bot runtime statistics',

    async execute(message, args, client) {
        const mem    = process.memoryUsage();
        const dbPing = await pingDb();
        const wsping = client.ws.ping;

        const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.STATS} Bot Statistics`)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                {
                    name:   '🤖 Bot',
                    value:  [
                        `**Tag:**      ${client.user.tag}`,
                        `**ID:**       \`${client.user.id}\``,
                        `**Uptime:**   ${formatUptime(client.uptime)}`,
                        `**Commands:** ${client.commands.size}`,
                    ].join('\n'),
                    inline: true,
                },
                {
                    name:   '🌐 Network',
                    value:  [
                        `**WS Ping:** ${wsping >= 0 ? `${wsping}ms` : 'N/A'}`,
                        `**DB Ping:** ${dbPing.ok ? `${dbPing.latencyMs}ms` : `❌ ${dbPing.error}`}`,
                        `**Shards:**  ${client.ws.shards.size}`,
                    ].join('\n'),
                    inline: true,
                },
                {
                    name:   '📊 Coverage',
                    value:  [
                        `**Guilds:** ${client.guilds.cache.size.toLocaleString()}`,
                        `**Users:**  ${totalUsers.toLocaleString()}`,
                        `**Channels:** ${client.channels.cache.size.toLocaleString()}`,
                    ].join('\n'),
                    inline: true,
                },
                {
                    name:   '💾 Memory',
                    value:  [
                        `**Heap Used:**  ${formatBytes(mem.heapUsed)}`,
                        `**Heap Total:** ${formatBytes(mem.heapTotal)}`,
                        `**RSS:**        ${formatBytes(mem.rss)}`,
                    ].join('\n'),
                    inline: true,
                },
                {
                    name:   '⚙️ Runtime',
                    value:  [
                        `**Node:**       ${process.version}`,
                        `**Discord.js:** v${require('discord.js').version}`,
                        `**Platform:**   ${process.platform}`,
                    ].join('\n'),
                    inline: true,
                },
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },
};
