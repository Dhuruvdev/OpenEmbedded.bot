'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { ModerationService }  = require('../../services/ModerationService');
const { PermissionManager }  = require('../../permissions/PermissionManager');
const { COLORS, EMOJIS }     = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o => o
            .setName('user')
            .setDescription('The user to ban')
            .setRequired(true)
        )
        .addStringOption(o => o
            .setName('reason')
            .setDescription('Reason for the ban')
            .setMaxLength(512)
        )
        .addIntegerOption(o => o
            .setName('delete_days')
            .setDescription('Days of messages to delete (0-7)')
            .setMinValue(0)
            .setMaxValue(7)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target     = interaction.options.getMember('user');
        const reason     = interaction.options.getString('reason')    ?? 'No reason provided';
        const deleteDays = interaction.options.getInteger('delete_days') ?? 0;
        const targetUser = interaction.options.getUser('user');

        const botMember = interaction.guild.members.me;
        if (!await PermissionManager.assert(interaction, [PermissionFlagsBits.BanMembers], target, botMember)) return;

        if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.editReply({ content: `${EMOJIS.ERROR} I don't have **Ban Members** permission.` });
        }

        try {
            await ModerationService.ban(interaction.guild, targetUser, interaction.user, reason, deleteDays);

            const embed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle(`${EMOJIS.BAN} Member Banned`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User',      value: `${targetUser.tag} \`(${targetUser.id})\``, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`,                  inline: true },
                    { name: 'Reason',    value: reason,                                      inline: false },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed to ban: ${err.message}` });
        }
    },
};
