'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription("Display a user's avatar")
        .addUserOption(o => o
            .setName('user')
            .setDescription('The user (defaults to you)')
        ),

    async execute(interaction) {
        const user   = interaction.options.getUser('user') ?? interaction.user;
        const member = interaction.options.getMember('user') ?? interaction.member;

        const globalUrl = user.displayAvatarURL({ dynamic: true, size: 1024 });
        const guildUrl  = member?.displayAvatarURL({ dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.USER} ${user.tag}'s Avatar`)
            .setImage(guildUrl ?? globalUrl)
            .setFooter({ text: `Requested by ${interaction.user.tag}` });

        const links = [];
        if (globalUrl) links.push(`[Global Avatar](${globalUrl})`);
        if (guildUrl && guildUrl !== globalUrl) links.push(`[Server Avatar](${guildUrl})`);
        embed.setDescription(links.join(' · '));

        await interaction.reply({ embeds: [embed] });
    },
};
