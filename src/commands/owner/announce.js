'use strict';

const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../config/constants');

module.exports = {
    name:        'announce',
    aliases:     ['bc', 'broadcast'],
    description: 'Send an embed announcement to a channel  —  >>announce #channel Title | Body',

    async execute(message, args, client) {
        const mention = message.mentions.channels.first();
        if (!mention) return message.reply('❌ Usage: `>>announce #channel Title | Body`');

        const rest  = args.slice(1).join(' ');
        const split = rest.indexOf('|');
        const title = split >= 0 ? rest.slice(0, split).trim() : 'Announcement';
        const body  = split >= 0 ? rest.slice(split + 1).trim() : rest.trim();

        if (!body) return message.reply('❌ Provide announcement text after `|`.');

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(title)
            .setDescription(body)
            .setTimestamp()
            .setFooter({ text: `From ${message.author.tag}` });

        await mention.send({ embeds: [embed] });
        await message.react('✅').catch(() => {});
    },
};
