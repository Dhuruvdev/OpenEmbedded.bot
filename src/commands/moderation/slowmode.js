'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { LoggingService }         = require('../../services/LoggingService');
const { COLORS, EMOJIS, LIMITS } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode for the current channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(o => o
            .setName('seconds')
            .setDescription('Slowmode delay in seconds (0 to disable)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(LIMITS.SLOWMODE_MAX)
        )
        .addStringOption(o => o
            .setName('reason')
            .setDescription('Reason')
            .setMaxLength(512)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const seconds = interaction.options.getInteger('seconds');
        const reason  = interaction.options.getString('reason') ?? 'No reason provided';

        try {
            await interaction.channel.setRateLimitPerUser(seconds, reason);

            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle(`${EMOJIS.SLOW} Slowmode Updated`)
                .addFields(
                    { name: 'Channel',   value: `${interaction.channel}`,                          inline: true },
                    { name: 'Slowmode',  value: seconds === 0 ? 'Disabled' : `${seconds} seconds`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`,                          inline: true },
                    { name: 'Reason',    value: reason,                                             inline: false },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            await LoggingService.logAction(interaction.guild, 'SLOWMODE', {
                moderator: interaction.user,
                channel:   interaction.channel,
                reason,
                extra:     { Seconds: seconds },
            });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed: ${err.message}` });
        }
    },
};
