'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { LoggingService } = require('../../services/LoggingService');
const { COLORS, EMOJIS, LIMITS } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete messages from the current channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(o => o
            .setName('amount')
            .setDescription(`Number of messages to delete (1-${LIMITS.PURGE_MAX})`)
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(LIMITS.PURGE_MAX)
        )
        .addUserOption(o => o
            .setName('user')
            .setDescription('Only delete messages from this user')
        )
        .addStringOption(o => o
            .setName('reason')
            .setDescription('Reason for purge')
            .setMaxLength(512)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('amount');
        const filter = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        try {
            const fetched = await interaction.channel.messages.fetch({ limit: amount });

            let toDelete = [...fetched.values()];

            if (filter) {
                toDelete = toDelete.filter(m => m.author.id === filter.id);
            }

            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            toDelete = toDelete.filter(m => m.createdTimestamp > twoWeeksAgo);

            if (toDelete.length === 0) {
                return interaction.editReply({ content: `${EMOJIS.ERROR} No eligible messages found (messages older than 14 days cannot be bulk deleted).` });
            }

            const deleted = await interaction.channel.bulkDelete(toDelete, true);

            await LoggingService.logAction(interaction.guild, 'PURGE', {
                moderator: interaction.user,
                channel:   interaction.channel,
                count:     deleted.size,
                reason,
            });

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle(`${EMOJIS.PURGE} Messages Purged`)
                .addFields(
                    { name: 'Deleted',    value: String(deleted.size),        inline: true },
                    { name: 'Channel',    value: `${interaction.channel}`,     inline: true },
                    { name: 'Moderator',  value: `${interaction.user.tag}`,    inline: true },
                    { name: 'Reason',     value: reason,                       inline: false },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed: ${err.message}` });
        }
    },
};
