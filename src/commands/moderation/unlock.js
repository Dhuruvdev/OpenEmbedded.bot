'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { LoggingService } = require('../../services/LoggingService');
const { COLORS, EMOJIS } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock a channel — restore send messages permission')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(o => o
            .setName('channel')
            .setDescription('Channel to unlock (defaults to current)')
        )
        .addStringOption(o => o
            .setName('reason')
            .setDescription('Reason')
            .setMaxLength(512)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel') ?? interaction.channel;
        const reason  = interaction.options.getString('reason') ?? 'No reason provided';

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null,
            });

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle(`${EMOJIS.UNLOCK} Channel Unlocked`)
                .addFields(
                    { name: 'Channel',   value: `${channel}`,              inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`,  inline: true },
                    { name: 'Reason',    value: reason,                     inline: false },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await channel.send({ embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setDescription(`${EMOJIS.UNLOCK} This channel has been unlocked.`)
            ]});

            await LoggingService.logAction(interaction.guild, 'UNLOCK', {
                moderator: interaction.user,
                channel,
                reason,
            });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed: ${err.message}` });
        }
    },
};
