'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS }                    = require('../../config/constants');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show bot performance statistics'),

    async execute(interaction) {
        await interaction.deferReply();

        const client   = interaction.client;
        const uptimeSec = Math.floor(process.uptime());
        const d = Math.floor(uptimeSec / 86400);
        const h = Math.floor((uptimeSec % 86400) / 3600);
        const m = Math.floor((uptimeSec % 3600) / 60);
        const s = uptimeSec % 60;
        const uptime = `${d}d ${h}h ${m}m ${s}s`;

        const memUsed  = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const memTotal = (os.totalmem() / 1024 / 1024).toFixed(0);

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.STATS} Bot Statistics`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '⏰ Uptime',      value: uptime,                                     inline: true },
                { name: '🏰 Guilds',      value: client.guilds.cache.size.toLocaleString(),  inline: true },
                { name: '👥 Users',       value: client.users.cache.size.toLocaleString(),   inline: true },
                { name: '🌐 WS Ping',     value: `${client.ws.ping}ms`,                      inline: true },
                { name: '💾 Memory',      value: `${memUsed} MB / ${memTotal} MB`,           inline: true },
                { name: '⚙️ Node.js',     value: process.version,                            inline: true },
                { name: '📦 Discord.js',  value: `v${require('discord.js').version}`,        inline: true },
                { name: '🔢 Commands',    value: String(client.commands.size),               inline: true },
            )
            .setTimestamp()
            .setFooter({ text: client.user.tag });

        await interaction.editReply({ embeds: [embed] });
    },
};
