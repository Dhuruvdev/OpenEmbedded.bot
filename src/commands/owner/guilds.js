'use strict';

const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS } = require('../../config/constants');

module.exports = {
    name:        'guilds',
    aliases:     ['servers'],
    description: 'List all guilds the bot is in',

    async execute(message, args, client) {
        const guilds = [...client.guilds.cache.values()]
            .sort((a, b) => b.memberCount - a.memberCount);

        const PAGE    = 20;
        const page    = Math.max(0, (parseInt(args[0]) || 1) - 1);
        const slice   = guilds.slice(page * PAGE, (page + 1) * PAGE);
        const pages   = Math.ceil(guilds.length / PAGE);

        const lines = slice.map((g, i) =>
            `\`${page * PAGE + i + 1}.\` **${g.name}** — \`${g.id}\`  •  👥 ${g.memberCount.toLocaleString()}`
        ).join('\n');

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.GUILD} Guilds (${guilds.length} total)`)
            .setDescription(lines || 'No guilds.')
            .setFooter({ text: `Page ${page + 1}/${pages}  •  Use >>guilds <page>` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },
};
