'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { ModerationService } = require('../../services/ModerationService');
const { PermissionManager } = require('../../permissions/PermissionManager');
const { COLORS, EMOJIS }    = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remove a timeout from a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o
            .setName('user')
            .setDescription('The member to remove the timeout from')
            .setRequired(true)
        )
        .addStringOption(o => o
            .setName('reason')
            .setDescription('Reason')
            .setMaxLength(512)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        if (!target) {
            return interaction.editReply({ content: `${EMOJIS.ERROR} Member not found.` });
        }

        if (!target.isCommunicationDisabled()) {
            return interaction.editReply({ content: `${EMOJIS.ERROR} That member is not currently timed out.` });
        }

        if (!await PermissionManager.assert(interaction, [PermissionFlagsBits.ModerateMembers], target, interaction.guild.members.me)) return;

        try {
            await ModerationService.untimeout(interaction.guild, target, interaction.user, reason);

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle(`${EMOJIS.UNMUTE} Timeout Removed`)
                .addFields(
                    { name: 'User',      value: `${target.user.tag} \`(${target.id})\``, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`,                inline: true },
                    { name: 'Reason',    value: reason,                                   inline: false },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed: ${err.message}` });
        }
    },
};
