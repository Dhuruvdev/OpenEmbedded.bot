'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    PermissionFlagsBits,
    ChannelType,
} = require('discord.js');
const { WelcomeRepository }  = require('../../repositories/WelcomeRepository');
const { WelcomeService }     = require('../../services/WelcomeService');
const { COLORS, EMOJIS, INTERACTION_PREFIXES } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure the welcome system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('setup')
            .setDescription('Configure the welcome system')
        )
        .addSubcommand(sub => sub
            .setName('test')
            .setDescription('Test the welcome message with your own profile')
        )
        .addSubcommand(sub => sub
            .setName('disable')
            .setDescription('Disable the welcome system')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'setup':   return handleSetup(interaction);
            case 'test':    return handleTest(interaction);
            case 'disable': return handleDisable(interaction);
        }
    },
};

async function handleSetup(interaction) {
    const settings = await WelcomeRepository.get(interaction.guild.id);

    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.WELCOME} Welcome System Setup`)
        .setDescription('Configure the welcome message for new members.')
        .addFields(
            { name: 'Status',    value: settings?.enabled ? `${EMOJIS.SUCCESS} Enabled` : `${EMOJIS.ERROR} Disabled`, inline: true },
            { name: 'Channel',   value: settings?.channel_id ? `<#${settings.channel_id}>` : '*Not set*',              inline: true },
            { name: 'Auto Role', value: settings?.auto_role_id ? `<@&${settings.auto_role_id}>` : '*None*',            inline: true },
            { name: 'Message',   value: `\`\`\`${(settings?.message ?? 'Welcome {user} to **{server}**!').slice(0, 300)}\`\`\``, inline: false },
            { name: 'Variables', value: '`{user}` `{username}` `{server}` `{membercount}` `{tag}`', inline: false },
        )
        .setTimestamp();

    const channelRow = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId(INTERACTION_PREFIXES.WELCOME_CHANNEL)
            .setPlaceholder('Select welcome channel')
            .addChannelTypes(ChannelType.GuildText),
    );

    const roleRow = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId(INTERACTION_PREFIXES.WELCOME_ROLE)
            .setPlaceholder('Select auto-role (optional)')
            .setMinValues(0)
            .setMaxValues(1),
    );

    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(INTERACTION_PREFIXES.WELCOME_TEST)
            .setLabel('Test Message')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🧪'),
    );

    await interaction.reply({ embeds: [embed], components: [channelRow, roleRow, btnRow], flags: 64 });
}

async function handleTest(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await WelcomeService.welcome(interaction.member);
    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Test welcome message sent!` });
}

async function handleDisable(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await WelcomeRepository.save(interaction.guild.id, { enabled: false });
    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Welcome system disabled.` });
}
