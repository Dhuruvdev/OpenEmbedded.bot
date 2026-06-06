'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { LoggingService }        = require('../../services/LoggingService');
const { PermissionManager }     = require('../../permissions/PermissionManager');
const { COLORS, EMOJIS, LIMITS } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nickname')
        .setDescription("Change or reset a member's nickname")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addUserOption(o => o
            .setName('user')
            .setDescription('The member')
            .setRequired(true)
        )
        .addStringOption(o => o
            .setName('nickname')
            .setDescription('New nickname (leave blank to reset)')
            .setMaxLength(LIMITS.NICKNAME_MAX)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target   = interaction.options.getMember('user');
        const nickname = interaction.options.getString('nickname') ?? null;

        if (!target) {
            return interaction.editReply({ content: `${EMOJIS.ERROR} Member not found.` });
        }

        if (!await PermissionManager.assert(interaction, [PermissionFlagsBits.ManageNicknames], target, interaction.guild.members.me)) return;

        const oldNick = target.nickname ?? target.user.username;
        try {
            await target.setNickname(nickname, `Moderator: ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle(`${EMOJIS.USER} Nickname Changed`)
                .addFields(
                    { name: 'User',     value: `${target.user.tag}`,           inline: true },
                    { name: 'Before',   value: oldNick,                         inline: true },
                    { name: 'After',    value: nickname ?? '*(Reset)*',         inline: true },
                    { name: 'Changed by', value: `${interaction.user.tag}`,    inline: true },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await LoggingService.logAction(interaction.guild, 'NICK', {
                user:      target.user,
                moderator: interaction.user,
                extra:     { Before: oldNick, After: nickname ?? 'Reset' },
            });
        } catch (err) {
            await interaction.editReply({ content: `${EMOJIS.ERROR} Failed: ${err.message}` });
        }
    },
};
