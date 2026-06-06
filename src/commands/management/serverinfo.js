'use strict';

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { COLORS, EMOJIS } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display detailed information about this server'),

    async execute(interaction) {
        await interaction.deferReply();
        const { guild } = interaction;
        await guild.fetch();

        const createdTs = Math.floor(guild.createdTimestamp / 1000);

        const textChannels     = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels    = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const threadChannels   = guild.channels.cache.filter(c => [ChannelType.PublicThread, ChannelType.PrivateThread].includes(c.type)).size;

        const totalMembers  = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== 'offline' && m.presence).size;
        const botCount      = guild.members.cache.filter(m => m.user.bot).size;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.SERVER} ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: `${EMOJIS.CROWN} Owner`,       value: `<@${guild.ownerId}>`,          inline: true },
                { name: `${EMOJIS.CALENDAR} Created`,  value: `<t:${createdTs}:D>`,           inline: true },
                { name: `${EMOJIS.LINK} ID`,           value: `\`${guild.id}\``,              inline: true },

                { name: `${EMOJIS.USER} Members`,      value: [
                    `**Total:** ${totalMembers.toLocaleString()}`,
                    `**Humans:** ${(totalMembers - botCount).toLocaleString()}`,
                    `**Bots:** ${botCount.toLocaleString()}`,
                ].join('\n'), inline: true },

                { name: `${EMOJIS.CHANNEL} Channels`,  value: [
                    `**Text:** ${textChannels}`,
                    `**Voice:** ${voiceChannels}`,
                    `**Categories:** ${categoryChannels}`,
                    `**Threads:** ${threadChannels}`,
                ].join('\n'), inline: true },

                { name: `${EMOJIS.ROLE} Roles`,        value: String(guild.roles.cache.size - 1), inline: true },

                { name: `${EMOJIS.STATS} Boost`,       value: [
                    `**Level:** ${guild.premiumTier}`,
                    `**Boosters:** ${guild.premiumSubscriptionCount ?? 0}`,
                ].join('\n'), inline: true },

                { name: '🌍 Locale',                    value: guild.preferredLocale, inline: true },
                { name: '🔒 Verification',              value: ['None','Low','Medium','High','Very High'][guild.verificationLevel] ?? 'Unknown', inline: true },
            )
            .setImage(guild.bannerURL({ size: 1024 }) ?? null)
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
