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
        .setName('warnings')
        .setDescription('View warnings for a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o
            .setName('user')
            .setDescription('The member to check')
            .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target   = interaction.options.getUser('user');
        const warnings = await WarningRepository.getAll(interaction.guild.id, target.id);

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle(`${EMOJIS.WARN} Warnings — ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Total: ${warnings.length}` })
            .setTimestamp();

        if (warnings.length === 0) {
            embed.setDescription('No warnings found for this member.');
        } else {
            const list = warnings.slice(0, 10).map((w, i) => {
                const ts = Math.floor(new Date(w.created_at).getTime() / 1000);
                return `**${i + 1}.** <@${w.moderator_id}> — ${w.reason}\n*<t:${ts}:R>* \`ID: ${w.id.slice(0, 8)}\``;
            });
            embed.setDescription(list.join('\n\n'));
            if (warnings.length > 10) {
                embed.setFooter({ text: `Showing 10 of ${warnings.length} warnings` });
            }
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
