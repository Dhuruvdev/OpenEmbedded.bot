'use strict';

const { WelcomeRepository } = require('../../repositories/WelcomeRepository');
const { WelcomeService }    = require('../../services/WelcomeService');
const { EMOJIS, INTERACTION_PREFIXES } = require('../../config/constants');

async function handle(interaction) {
    const id = interaction.customId;

    if (id === INTERACTION_PREFIXES.WELCOME_CHANNEL) return handleChannelSelect(interaction);
    if (id === INTERACTION_PREFIXES.WELCOME_ROLE)    return handleRoleSelect(interaction);
    if (id === INTERACTION_PREFIXES.WELCOME_SAVE)    return handleSave(interaction);
    if (id === INTERACTION_PREFIXES.WELCOME_TEST)    return handleTest(interaction);
}

async function handleChannelSelect(interaction) {
    const channelId = interaction.values[0];
    store(interaction, 'channel_id', channelId);
    await WelcomeRepository.save(interaction.guild.id, { channel_id: channelId, enabled: true });
    await interaction.reply({ content: `${EMOJIS.SUCCESS} Welcome channel set to <#${channelId}>. System **enabled**.`, flags: 64 });
}

async function handleRoleSelect(interaction) {
    const roleId = interaction.values[0];
    store(interaction, 'auto_role_id', roleId ?? null);
    if (roleId) {
        await WelcomeRepository.save(interaction.guild.id, { auto_role_id: roleId });
        await interaction.reply({ content: `${EMOJIS.SUCCESS} Auto-role set to <@&${roleId}>.`, flags: 64 });
    } else {
        await WelcomeRepository.save(interaction.guild.id, { auto_role_id: null });
        await interaction.reply({ content: `${EMOJIS.SUCCESS} Auto-role cleared.`, flags: 64 });
    }
}

async function handleSave(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const session = _sessions.get(`${interaction.guild.id}:${interaction.user.id}`) ?? {};
    if (Object.keys(session).length) {
        await WelcomeRepository.save(interaction.guild.id, session);
    }
    _sessions.delete(`${interaction.guild.id}:${interaction.user.id}`);
    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Welcome settings saved!` });
}

async function handleTest(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await WelcomeService.welcome(interaction.member);
    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Test welcome message sent to the welcome channel!` });
}

const _sessions = new Map();
function store(interaction, key, value) {
    const k = `${interaction.guild.id}:${interaction.user.id}`;
    const s = _sessions.get(k) ?? {};
    s[key]  = value;
    _sessions.set(k, s);
    setTimeout(() => _sessions.delete(k), 10 * 60_000);
}

module.exports = { handle };
