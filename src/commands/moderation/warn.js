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
        .setName('warn')
        .setDescription('Issue a warning to a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o
            .setName('user')
            .setDescription('The member to warn')
            .setRequired(true)
        )
        .addStringOption(o => o
            .setName('reason')
            .setDescription('Reason for the warning')
            .setRequired(true)
            .setMaxLength(512)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason');

        if (!target) {
            return interaction.editReply({ content: `${EMOJIS.ERROR} Member not found.` });
        }

        if (!await PermissionManager.assert(interaction, [PermissionFlagsBits.ModerateMembers], target, interaction.guild.members.me)) return;

        try {
            const { count } = await ModerationService.warn(interaction.guild, target, interaction.user, reason);

            target.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.WARNING)
                        .setTitle(`${EMOJIS.WARN} You have been warned in **${interaction.guild.name}**`)
                        .addFields(
                            { name: 'Reason',          value: reason,          inline: false },
                            { name: 'Total Warnings',  value: String(count),   inline: true  },
                        )
                        .setTimestamp(),
                ],
            }).catch(() => {});

            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle(`${EMOJIS.WARN} Member Warned`)
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User',            value: `${target.user.tag} \`(${target.id})\``, inline: true },
                    { name: 'Moderator',       value: `${interaction.user.tag}`,                inline: true },
                    { name: 'Total Warnings',  value: String(count),                            inline: true },
                    { name: 'Reason',          value: reason,                                   inline: false },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed: ${err.message}` });
        }
    },
};
