'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS }                    = require('../../config/constants');
const { WarningRepository }                 = require('../../repositories/WarningRepository');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Display information about a user')
        .addUserOption(o => o
            .setName('user')
            .setDescription('The user to look up (defaults to you)')
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const target  = interaction.options.getMember('user') ?? interaction.member;
        const user    = target?.user ?? interaction.options.getUser('user') ?? interaction.user;

        const createdTs = Math.floor(user.createdTimestamp / 1000);
        const joinedTs  = target?.joinedTimestamp ? Math.floor(target.joinedTimestamp / 1000) : null;

        const roles = target?.roles?.cache
            .filter(r => r.id !== interaction.guild.roles.everyone.id)
            .sort((a, b) => b.position - a.position)
            .first(10)
            .map(r => `${r}`)
            .join(' ') || 'None';

        const warnCount = await WarningRepository.count(interaction.guild.id, user.id).catch(() => 0);

        const flags = user.flags?.toArray() ?? [];
        const badgeMap = {
            Staff:                    '👨‍💼 Discord Staff',
            Partner:                  '🤝 Discord Partner',
            Hypesquad:                '🏠 HypeSquad Events',
            BugHunterLevel1:          '🐛 Bug Hunter',
            BugHunterLevel2:          '🐛 Bug Hunter Gold',
            HypeSquadOnlineHouse1:    '🏡 House Bravery',
            HypeSquadOnlineHouse2:    '🏡 House Brilliance',
            HypeSquadOnlineHouse3:    '🏡 House Balance',
            PremiumEarlySupporter:    '👾 Early Supporter',
            VerifiedBot:              '✅ Verified Bot',
            ActiveDeveloper:          '⚡ Active Developer',
        };
        const badges = flags.map(f => badgeMap[f]).filter(Boolean).join('\n') || 'None';

        const embed = new EmbedBuilder()
            .setColor(target?.displayColor || COLORS.PRIMARY)
            .setTitle(`${EMOJIS.USER} ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🆔 ID',         value: `\`${user.id}\``,                    inline: true },
                { name: '🤖 Bot',        value: user.bot ? 'Yes' : 'No',            inline: true },
                { name: '📅 Created',    value: `<t:${createdTs}:D> (<t:${createdTs}:R>)`, inline: false },
                ...(joinedTs ? [{ name: '📥 Joined',  value: `<t:${joinedTs}:D> (<t:${joinedTs}:R>)`, inline: false }] : []),
                { name: `🏷️ Roles (${target?.roles?.cache.size - 1 ?? 0})`, value: roles.slice(0, 1024), inline: false },
                { name: '⚠️ Warnings',   value: String(warnCount),                  inline: true },
                { name: '📛 Badges',     value: badges,                              inline: true },
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
