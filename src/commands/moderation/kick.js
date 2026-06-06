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
        .setName('kick')
        .setDescription('Kick a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(o => o
            .setName('user')
            .setDescription('The member to kick')
            .setRequired(true)
        )
        .addStringOption(o => o
            .setName('reason')
            .setDescription('Reason for the kick')
            .setMaxLength(512)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        if (!target) {
            return interaction.editReply({ content: `${EMOJIS.ERROR} Member not found in this server.` });
        }

        if (!await PermissionManager.assert(interaction, [PermissionFlagsBits.KickMembers], target, interaction.guild.members.me)) return;

        try {
            await ModerationService.kick(interaction.guild, target, interaction.user, reason);

            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle(`${EMOJIS.KICK} Member Kicked`)
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User',      value: `${target.user.tag} \`(${target.id})\``, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`,                inline: true },
                    { name: 'Reason',    value: reason,                                   inline: false },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed to kick: ${err.message}` });
        }
    },
};
