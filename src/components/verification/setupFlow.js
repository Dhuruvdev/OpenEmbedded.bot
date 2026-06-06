'use strict';

const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');

const { VerificationRepository } = require('../../repositories/VerificationRepository');
const { VerificationService }    = require('../../services/VerificationService');
const { COLORS, EMOJIS, INTERACTION_PREFIXES } = require('../../config/constants');

async function handle(interaction) {
    const id = interaction.customId;

    if (id === INTERACTION_PREFIXES.VERIFY_SETUP || id.startsWith(INTERACTION_PREFIXES.VERIFY_SETUP)) {
        return showWizard(interaction);
    }
    if (id === INTERACTION_PREFIXES.VERIFY_EDIT) {
        return showWizard(interaction);
    }
    if (id === INTERACTION_PREFIXES.VERIFY_ROLE) {
        return handleRoleSelect(interaction);
    }
    if (id === INTERACTION_PREFIXES.VERIFY_CHANNEL) {
        return handleChannelSelect(interaction);
    }
    if (id === INTERACTION_PREFIXES.VERIFY_CATEGORY) {
        return handleCategorySelect(interaction);
    }
    if (id === INTERACTION_PREFIXES.VERIFY_METHOD) {
        return handleMethodSelect(interaction);
    }
    if (id === INTERACTION_PREFIXES.VERIFY_SAVE) {
        return handleSave(interaction);
    }
    if (id === INTERACTION_PREFIXES.VERIFY_RESET) {
        return handleReset(interaction);
    }
}

// ── Setup Wizard panel ────────────────────────────────────────────────────────
async function showWizard(interaction) {
    const settings = await VerificationRepository.get(interaction.guild.id) ?? {};

    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.SHIELD} Verification Setup Wizard`)
        .setDescription('Configure each option below, then click **Save Setup** to apply.')
        .addFields(
            { name: 'Step 1 — Verified Role',       value: settings.role_id        ? `✅ <@&${settings.role_id}>` : '❌ Not set', inline: true },
            { name: 'Step 2 — Channel',             value: settings.channel_id     ? `✅ <#${settings.channel_id}>` : '❌ Not set', inline: true },
            { name: 'Step 3 — Method',              value: settings.method         ? `✅ ${settings.method}` : '❌ Not set', inline: true },
            { name: 'Step 4 — Protected Categories', value: settings.protected_categories?.length
                ? `✅ ${settings.protected_categories.length} set`
                : '⚠️ None (optional)', inline: false },
        )
        .setFooter({ text: 'Changes take effect after clicking Save Setup' });

    const roleRow = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId(INTERACTION_PREFIXES.VERIFY_ROLE)
            .setPlaceholder('① Select verified role')
            .setMinValues(1)
            .setMaxValues(1),
    );

    const channelRow = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId(INTERACTION_PREFIXES.VERIFY_CHANNEL)
            .setPlaceholder('② Select verification channel')
            .addChannelTypes(ChannelType.GuildText),
    );

    const categoryRow = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId(INTERACTION_PREFIXES.VERIFY_CATEGORY)
            .setPlaceholder('③ Select protected categories (optional)')
            .addChannelTypes(ChannelType.GuildCategory)
            .setMinValues(0)
            .setMaxValues(10),
    );

    const methodRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(INTERACTION_PREFIXES.VERIFY_METHOD)
            .setPlaceholder('④ Select verification method')
            .addOptions([
                { label: 'Button Verification',     description: 'Click a button to verify',                    value: 'button',      emoji: '✅' },
                { label: 'Accept Rules',            description: 'Agree to server rules to verify',             value: 'rules',       emoji: '📜' },
                { label: 'CAPTCHA (Coming Soon)',   description: 'Solve a CAPTCHA to verify',                   value: 'captcha',     emoji: '🤖' },
                { label: 'Application (Coming Soon)', description: 'Fill out a form to get verified',           value: 'application', emoji: '📋' },
            ]),
    );

    const saveRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(INTERACTION_PREFIXES.VERIFY_SAVE)
            .setLabel('Save Setup')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💾'),
    );

    const reply = { embeds: [embed], components: [roleRow, channelRow, categoryRow, methodRow, saveRow] };

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(reply);
    } else {
        await interaction.update(reply);
    }
}

async function handleRoleSelect(interaction) {
    const roleId = interaction.values[0];
    await storeSessionData(interaction.guild.id, interaction.user.id, 'role_id', roleId);
    await interaction.reply({
        content: `${EMOJIS.SUCCESS} Verified role set to <@&${roleId}>. Continue configuring below.`,
        flags: 64,
    });
}

async function handleChannelSelect(interaction) {
    const channelId = interaction.values[0];
    await storeSessionData(interaction.guild.id, interaction.user.id, 'channel_id', channelId);
    await interaction.reply({
        content: `${EMOJIS.SUCCESS} Verification channel set to <#${channelId}>.`,
        flags: 64,
    });
}

async function handleCategorySelect(interaction) {
    const categories = interaction.values;
    await storeSessionData(interaction.guild.id, interaction.user.id, 'protected_categories', categories);
    await interaction.reply({
        content: categories.length
            ? `${EMOJIS.SUCCESS} Protected categories: ${categories.map(id => `<#${id}>`).join(', ')}`
            : `${EMOJIS.SUCCESS} No protected categories set.`,
        flags: 64,
    });
}

async function handleMethodSelect(interaction) {
    const method = interaction.values[0];
    if (method === 'captcha' || method === 'application') {
        return interaction.reply({ content: `${EMOJIS.WARNING} **${method}** verification is coming soon! Defaulting to button.`, flags: 64 });
    }
    await storeSessionData(interaction.guild.id, interaction.user.id, 'method', method);
    await interaction.reply({ content: `${EMOJIS.SUCCESS} Verification method set to **${method}**.`, flags: 64 });
}

async function handleSave(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const session  = getSession(interaction.guild.id, interaction.user.id);
    const existing = await VerificationRepository.get(interaction.guild.id) ?? {};

    const data = {
        ...existing,
        ...session,
        enabled: true,
        method:  session.method ?? existing.method ?? 'button',
    };

    if (!data.role_id) {
        return interaction.editReply({ content: `${EMOJIS.ERROR} You must select a **verified role** before saving.` });
    }

    const saved = await VerificationRepository.save(interaction.guild.id, data);

    if (saved?.protected_categories?.length) {
        await VerificationService.syncCategoryPermissions(interaction.guild, saved);
    }

    clearSession(interaction.guild.id, interaction.user.id);

    const embed = new EmbedBuilder()
        .setColor(COLORS.VERIFY)
        .setTitle(`${EMOJIS.SUCCESS} Verification Configured`)
        .setDescription('Your verification system is now **enabled**.')
        .addFields(
            { name: 'Verified Role',         value: data.role_id ? `<@&${data.role_id}>` : '*None*',   inline: true },
            { name: 'Channel',               value: data.channel_id ? `<#${data.channel_id}>` : '*None*', inline: true },
            { name: 'Method',                value: data.method,                                        inline: true },
            { name: 'Protected Categories',  value: data.protected_categories?.length
                ? data.protected_categories.map(id => `<#${id}>`).join(', ')
                : '*None*', inline: false },
        )
        .setFooter({ text: 'Use /verify post to deploy the verification panel' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleReset(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await VerificationRepository.save(interaction.guild.id, { enabled: false, role_id: null, channel_id: null, method: 'button', protected_categories: [] });
    clearSession(interaction.guild.id, interaction.user.id);
    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Verification configuration reset.` });
}

// ── Session store (in-memory, short-lived) ────────────────────────────────────
const _sessions = new Map();

function sessionKey(guildId, userId) { return `${guildId}:${userId}`; }

async function storeSessionData(guildId, userId, key, value) {
    const k   = sessionKey(guildId, userId);
    const cur = _sessions.get(k) ?? {};
    cur[key]  = value;
    _sessions.set(k, cur);
    setTimeout(() => _sessions.delete(k), 10 * 60_000);
}

function getSession(guildId, userId) {
    return _sessions.get(sessionKey(guildId, userId)) ?? {};
}

function clearSession(guildId, userId) {
    _sessions.delete(sessionKey(guildId, userId));
}

module.exports = { handle };
