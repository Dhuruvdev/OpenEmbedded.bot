'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS }                    = require('../../config/constants');
const { pingDb }                            = require('../../database/index');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and connection status'),

    async execute(interaction) {
        const sent = await interaction.reply({ content: '🏓 Pinging…', fetchReply: true });
        const wsMs  = interaction.client.ws.ping;
        const apiMs = sent.createdTimestamp - interaction.createdTimestamp;
        const db    = await pingDb();

        const embed = new EmbedBuilder()
            .setColor(wsMs < 100 ? COLORS.SUCCESS : wsMs < 250 ? COLORS.WARNING : COLORS.ERROR)
            .setTitle(`${EMOJIS.PING} Pong!`)
            .addFields(
                { name: '🌐 WebSocket',    value: `\`${wsMs}ms\``,               inline: true },
                { name: '📡 API Round-trip', value: `\`${apiMs}ms\``,            inline: true },
                { name: '🗄️ Database',     value: db.ok ? `\`${db.latencyMs}ms\`` : '`Unavailable`', inline: true },
            )
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};
