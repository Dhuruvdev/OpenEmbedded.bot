'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
} = require('discord.js');

const { VerificationRepository } = require('../../repositories/VerificationRepository');
const { VerificationService }    = require('../../services/VerificationService');
const { COLORS, EMOJIS, INTERACTION_PREFIXES } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Set up or manage the server verification system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('setup')
            .setDescription('Configure the verification system for this server')
        )
        .addSubcommand(sub => sub
            .setName('settings')
            .setDescription('View current verification settings and statistics')
        )
        .addSubcommand(sub => sub
            .setName('post')
            .setDescription('Post the verification panel to the configured channel')
        )
        .addSubcommand(sub => sub
            .setName('sync')
            .setDescription('Sync permissions on all protected categories')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'setup':    return handleSetup(interaction);
            case 'settings': return handleSettings(interaction);
            case 'post':     return handlePost(interaction);
            case 'sync':     return handleSync(interaction);
        }
    },
};

// ── /verify setup ─────────────────────────────────────────────────────────────
async function handleSetup(interaction) {
    const existing = await VerificationRepository.get(interaction.guild.id);

    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.SHIELD} Verification Setup`)
        .setDescription(
            existing?.enabled
                ? '**Your verification system is already configured.** Use the buttons below to edit or reset it.'
                : 'Configure your server\'s verification system. Members must complete verification to access protected areas.'
        )
        .addFields(
            { name: 'Verified Role',       value: existing?.role_id        ? `<@&${existing.role_id}>` : '*Not set*',        inline: true },
            { name: 'Channel',             value: existing?.channel_id     ? `<#${existing.channel_id}>` : '*Not set*',     inline: true },
            { name: 'Method',              value: existing?.method         ?? '*Not set*',                                   inline: true },
            { name: 'Protected Categories', value: existing?.protected_categories?.length
                ? existing.protected_categories.map(id => `<#${id}>`).join(' ')
                : '*None*',                                                                                                   inline: false },
        )
        .setFooter({ text: 'Click the button below to open the setup wizard' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(INTERACTION_PREFIXES.VERIFY_SETUP)
            .setLabel('Configure Verification')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⚙️'),
        ...(existing ? [
            new ButtonBuilder()
                .setCustomId(INTERACTION_PREFIXES.VERIFY_EDIT)
                .setLabel('Edit Settings')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✏️'),
            new ButtonBuilder()
                .setCustomId(INTERACTION_PREFIXES.VERIFY_RESET)
                .setLabel('Reset')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️'),
        ] : []),
    );

    await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
}

// ── /verify settings ──────────────────────────────────────────────────────────
async function handleSettings(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const settings = await VerificationRepository.get(interaction.guild.id);
    const stats    = await VerificationRepository.getStats(interaction.guild.id);

    if (!settings) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setDescription(`${EMOJIS.WARNING} Verification has not been configured yet. Use \`/verify setup\` to get started.`)
            ],
        });
    }

    const embed = new EmbedBuilder()
        .setColor(COLORS.VERIFY)
        .setTitle(`${EMOJIS.SHIELD} Verification Settings`)
        .addFields(
            { name: 'Enabled',             value: settings.enabled ? `${EMOJIS.SUCCESS} Yes` : `${EMOJIS.ERROR} No`, inline: true },
            { name: 'Method',              value: settings.method ?? 'button',                                         inline: true },
            { name: 'Verified Role',       value: settings.role_id ? `<@&${settings.role_id}>` : '*Not set*',          inline: true },
            { name: 'Unverified Role',     value: settings.unverified_role_id ? `<@&${settings.unverified_role_id}>` : '*None*', inline: true },
            { name: 'Channel',             value: settings.channel_id ? `<#${settings.channel_id}>` : '*Not set*',     inline: true },
            { name: 'Log Channel',         value: settings.log_channel_id ? `<#${settings.log_channel_id}>` : '*None*', inline: true },
            { name: 'Protected Categories', value: settings.protected_categories?.length
                ? settings.protected_categories.map(id => `<#${id}>`).join('\n')
                : '*None*',                                                                                             inline: false },
            { name: `${EMOJIS.STATS} Statistics`, value: [
                `**Total verified:** ${stats.total.toLocaleString()}`,
                `**Today:** ${stats.today.toLocaleString()}`,
                `**This week:** ${stats.week.toLocaleString()}`,
            ].join('\n'), inline: false },
        )
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(INTERACTION_PREFIXES.VERIFY_EDIT)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'),
        new ButtonBuilder()
            .setCustomId(INTERACTION_PREFIXES.VERIFY_SETUP + ':refresh')
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄'),
        new ButtonBuilder()
            .setCustomId(INTERACTION_PREFIXES.VERIFY_RESET)
            .setLabel('Reset')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️'),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

// ── /verify post ──────────────────────────────────────────────────────────────
async function handlePost(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const settings = await VerificationRepository.get(interaction.guild.id);
    if (!settings?.enabled || !settings.channel_id) {
        return interaction.editReply({
            content: `${EMOJIS.ERROR} Verification is not enabled or no channel is configured. Run \`/verify setup\` first.`,
        });
    }

    const channel = interaction.guild.channels.cache.get(settings.channel_id);
    if (!channel) {
        return interaction.editReply({ content: `${EMOJIS.ERROR} Configured channel not found.` });
    }

    const panelEmbed = new EmbedBuilder()
        .setColor(COLORS.VERIFY)
        .setTitle(`${EMOJIS.SHIELD} Server Verification`)
        .setDescription(
            settings.rules_text ||
            `Welcome to **${interaction.guild.name}**!\n\nTo gain access to the server, click the button below to verify your account.`
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: `Powered by ${interaction.client.user.username}` })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(INTERACTION_PREFIXES.VERIFY_BUTTON)
            .setLabel('Verify')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✓'),
    );

    try {
        await channel.send({ embeds: [panelEmbed], components: [row] });
        await interaction.editReply({ content: `${EMOJIS.SUCCESS} Verification panel posted in ${channel}.` });
    } catch (err) {
        await interaction.editReply({ content: `${EMOJIS.ERROR} Failed to post: ${err.message}` });
    }
}

// ── /verify sync ──────────────────────────────────────────────────────────────
async function handleSync(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const settings = await VerificationRepository.get(interaction.guild.id);
    if (!settings?.enabled) {
        return interaction.editReply({ content: `${EMOJIS.ERROR} Verification is not enabled.` });
    }

    await VerificationService.syncCategoryPermissions(interaction.guild, settings);
    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Permissions synced for ${settings.protected_categories?.length ?? 0} protected categories.` });
}
