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
        .setName('lock')
        .setDescription('Lock a channel — prevent members from sending messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(o => o
            .setName('channel')
            .setDescription('Channel to lock (defaults to current)')
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
                SendMessages: false,
            });

            const embed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle(`${EMOJIS.LOCK} Channel Locked`)
                .addFields(
                    { name: 'Channel',   value: `${channel}`,               inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`,   inline: true },
                    { name: 'Reason',    value: reason,                      inline: false },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await channel.send({ embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setDescription(`${EMOJIS.LOCK} This channel has been locked by a moderator.`)
            ]});

            await LoggingService.logAction(interaction.guild, 'LOCK', {
                moderator: interaction.user,
                channel,
                reason,
            });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed: ${err.message}` });
        }
    },
};
