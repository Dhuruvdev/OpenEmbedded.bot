'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { ModerationService } = require('../../services/ModerationService');
const { COLORS, EMOJIS }    = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(o => o
            .setName('user_id')
            .setDescription('The user ID to unban')
            .setRequired(true)
        )
        .addStringOption(o => o
            .setName('reason')
            .setDescription('Reason for the unban')
            .setMaxLength(512)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.editReply({ content: `${EMOJIS.ERROR} Invalid user ID.` });
        }

        try {
            const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
            if (!ban) {
                return interaction.editReply({ content: `${EMOJIS.ERROR} No ban found for \`${userId}\`.` });
            }

            await ModerationService.unban(interaction.guild, userId, interaction.user, reason);

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle(`${EMOJIS.SUCCESS} Member Unbanned`)
                .addFields(
                    { name: 'User',      value: `${ban.user.tag} \`(${userId})\``, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`,         inline: true },
                    { name: 'Reason',    value: reason,                             inline: false },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed to unban: ${err.message}` });
        }
    },
};
