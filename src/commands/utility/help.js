'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS }                    = require('../../config/constants');

const CATEGORIES = [
    {
        name:     `${EMOJIS.MOD} Moderation`,
        commands: ['ban', 'unban', 'kick', 'timeout', 'untimeout', 'warn', 'warnings', 'clearwarnings', 'purge', 'slowmode', 'lock', 'unlock', 'nickname'],
    },
    {
        name:     `${EMOJIS.SERVER} Server Management`,
        commands: ['serverinfo', 'userinfo', 'roleinfo', 'channelinfo', 'avatar'],
    },
    {
        name:     `${EMOJIS.SHIELD} Verification`,
        commands: ['verify', 'verification'],
    },
    {
        name:     `${EMOJIS.WELCOME} Welcome`,
        commands: ['welcome'],
    },
    {
        name:     `${EMOJIS.TICKET} Tickets`,
        commands: ['ticket'],
    },
    {
        name:     `${EMOJIS.STATS} Utility`,
        commands: ['ping', 'stats', 'help'],
    },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List all available commands'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('📖 Command Reference')
            .setDescription('All slash commands available in this bot.')
            .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Use /command for detailed usage', iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        for (const cat of CATEGORIES) {
            embed.addFields({
                name:   cat.name,
                value:  cat.commands.map(c => `\`/${c}\``).join(' '),
                inline: false,
            });
        }

        await interaction.reply({ embeds: [embed], flags: 64 });
    },
};
