'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { WarningRepository } = require('../../repositories/WarningRepository');
const { COLORS, EMOJIS }    = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clear all warnings for a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o
            .setName('user')
            .setDescription('The member whose warnings to clear')
            .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getUser('user');
        const count  = await WarningRepository.clearAll(interaction.guild.id, target.id);

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle(`${EMOJIS.SUCCESS} Warnings Cleared`)
            .setDescription(`Cleared **${count}** warning(s) for ${target}.`)
            .addFields({ name: 'Moderator', value: `${interaction.user.tag}`, inline: true })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
