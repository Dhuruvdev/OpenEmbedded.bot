'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { VerificationRepository } = require('../../repositories/VerificationRepository');
const { COLORS, EMOJIS }         = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verification')
        .setDescription('View verification statistics and dashboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const settings = await VerificationRepository.get(interaction.guild.id);
        const stats    = await VerificationRepository.getStats(interaction.guild.id);

        if (!settings?.enabled) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setDescription(`${EMOJIS.WARNING} No verification system configured. Use \`/verify setup\` to configure one.`)],
            });
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.VERIFY)
            .setTitle(`${EMOJIS.SHIELD} Verification Dashboard`)
            .setDescription(`Verification system is currently **${settings.enabled ? 'enabled' : 'disabled'}**.`)
            .addFields(
                { name: `${EMOJIS.STATS} Statistics`, value: [
                    `**All time:** ${stats.total.toLocaleString()}`,
                    `**Today:** ${stats.today.toLocaleString()}`,
                    `**This week:** ${stats.week.toLocaleString()}`,
                ].join('\n'), inline: false },
                { name: 'Verified Role',   value: settings.role_id ? `<@&${settings.role_id}>` : '*Not set*', inline: true },
                { name: 'Channel',         value: settings.channel_id ? `<#${settings.channel_id}>` : '*Not set*', inline: true },
                { name: 'Method',          value: settings.method, inline: true },
                { name: 'Last Updated',    value: settings.updated_at
                    ? `<t:${Math.floor(new Date(settings.updated_at).getTime() / 1000)}:R>`
                    : 'Unknown', inline: true },
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
