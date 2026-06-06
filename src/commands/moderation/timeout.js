'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { ModerationService, formatDuration } = require('../../services/ModerationService');
const { PermissionManager }                 = require('../../permissions/PermissionManager');
const { COLORS, EMOJIS }                    = require('../../config/constants');

const DURATION_CHOICES = [
    { name: '60 seconds',  value: 60_000 },
    { name: '5 minutes',   value: 300_000 },
    { name: '10 minutes',  value: 600_000 },
    { name: '1 hour',      value: 3_600_000 },
    { name: '6 hours',     value: 21_600_000 },
    { name: '12 hours',    value: 43_200_000 },
    { name: '1 day',       value: 86_400_000 },
    { name: '3 days',      value: 259_200_000 },
    { name: '7 days',      value: 604_800_000 },
    { name: '28 days',     value: 2_419_200_000 },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout (mute) a member for a duration')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o
            .setName('user')
            .setDescription('The member to timeout')
            .setRequired(true)
        )
        .addIntegerOption(o => o
            .setName('duration')
            .setDescription('Duration of the timeout')
            .setRequired(true)
            .addChoices(...DURATION_CHOICES)
        )
        .addStringOption(o => o
            .setName('reason')
            .setDescription('Reason for the timeout')
            .setMaxLength(512)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target     = interaction.options.getMember('user');
        const durationMs = interaction.options.getInteger('duration');
        const reason     = interaction.options.getString('reason') ?? 'No reason provided';

        if (!target) {
            return interaction.editReply({ content: `${EMOJIS.ERROR} Member not found in this server.` });
        }

        if (!await PermissionManager.assert(interaction, [PermissionFlagsBits.ModerateMembers], target, interaction.guild.members.me)) return;

        try {
            await ModerationService.timeout(interaction.guild, target, interaction.user, reason, durationMs);

            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle(`${EMOJIS.TIMEOUT} Member Timed Out`)
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User',      value: `${target.user.tag} \`(${target.id})\``, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`,                inline: true },
                    { name: 'Duration',  value: formatDuration(durationMs),               inline: true },
                    { name: 'Reason',    value: reason,                                   inline: false },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed to timeout: ${err.message}` });
        }
    },
};
