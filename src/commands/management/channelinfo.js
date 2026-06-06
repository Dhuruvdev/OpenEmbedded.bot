'use strict';

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { COLORS, EMOJIS } = require('../../config/constants');

const CHANNEL_TYPE_NAMES = {
    [ChannelType.GuildText]:     'Text',
    [ChannelType.GuildVoice]:    'Voice',
    [ChannelType.GuildCategory]: 'Category',
    [ChannelType.GuildNews]:     'Announcement',
    [ChannelType.GuildForum]:    'Forum',
    [ChannelType.GuildStageVoice]: 'Stage',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channelinfo')
        .setDescription('Display information about a channel')
        .addChannelOption(o => o
            .setName('channel')
            .setDescription('Channel to inspect (defaults to current)')
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const channel = interaction.options.getChannel('channel') ?? interaction.channel;

        const createdTs = Math.floor(channel.createdTimestamp / 1000);
        const typeName  = CHANNEL_TYPE_NAMES[channel.type] ?? 'Unknown';

        const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle(`${EMOJIS.CHANNEL} #${channel.name}`)
            .addFields(
                { name: '🆔 ID',        value: `\`${channel.id}\``,                   inline: true },
                { name: '📁 Type',      value: typeName,                               inline: true },
                { name: '📅 Created',   value: `<t:${createdTs}:D>`,                  inline: true },
                { name: '📌 Category',  value: channel.parent?.name ?? 'None',         inline: true },
                { name: '🔞 NSFW',      value: channel.nsfw ? 'Yes' : 'No',           inline: true },
                { name: '🐢 Slowmode',  value: channel.rateLimitPerUser
                    ? `${channel.rateLimitPerUser}s`
                    : 'Off',                                                            inline: true },
                ...(channel.topic ? [{ name: '📝 Topic', value: channel.topic.slice(0, 1024), inline: false }] : []),
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
