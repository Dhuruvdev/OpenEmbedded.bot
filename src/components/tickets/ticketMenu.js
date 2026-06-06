'use strict';

const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    PermissionsBitField,
    ChannelType,
} = require('discord.js');

const { TicketRepository }  = require('../../repositories/TicketRepository');
const { COLORS, EMOJIS, INTERACTION_PREFIXES } = require('../../config/constants');

const TYPE_LABELS = {
    support:     { label: 'Support',     emoji: '📩' },
    billing:     { label: 'Billing',     emoji: '💰' },
    partnership: { label: 'Partnership', emoji: '🤝' },
    other:       { label: 'Other',       emoji: '📋' },
};

async function handle(interaction) {
    const id = interaction.customId;

    if (id === INTERACTION_PREFIXES.TICKET_TYPE) return handleTypeSelect(interaction);
    if (id === INTERACTION_PREFIXES.TICKET_CLOSE) return handleClose(interaction);
    if (id === INTERACTION_PREFIXES.TICKET_SAVE)  return handleSave(interaction);
    if (id === INTERACTION_PREFIXES.TICKET_CATEGORY) return handleCategorySelect(interaction);
    if (id === INTERACTION_PREFIXES.TICKET_ROLE)  return handleRoleSelect(interaction);
}

async function handleTypeSelect(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const type     = interaction.values[0];
    const settings = await TicketRepository.getSettings(interaction.guild.id);

    if (!settings?.enabled || !settings.category_id) {
        return interaction.editReply({ content: `${EMOJIS.ERROR} The ticket system is not configured yet.` });
    }

    const openCount = await TicketRepository.countOpen(interaction.guild.id, interaction.user.id);
    if (openCount >= (settings.max_per_user ?? 1)) {
        return interaction.editReply({
            content: `${EMOJIS.ERROR} You already have an open ticket. Please close it before creating a new one.`,
        });
    }

    const category = interaction.guild.channels.cache.get(settings.category_id);
    if (!category) {
        return interaction.editReply({ content: `${EMOJIS.ERROR} Ticket category not found. Please ask an admin to reconfigure.` });
    }

    const typeInfo   = TYPE_LABELS[type] ?? { label: type, emoji: '📋' };
    const ticketName = `${typeInfo.emoji.replace(/\p{Emoji_Presentation}/u, '').trim() || 'ticket'}-${interaction.user.username}-${Date.now().toString(36)}`.slice(0, 100);

    try {
        const channel = await interaction.guild.channels.create({
            name:   ticketName,
            type:   ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ...(settings.support_role_id ? [{
                    id:    settings.support_role_id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                }] : []),
            ],
        });

        await TicketRepository.create(interaction.guild.id, interaction.user.id, channel.id, type);

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${typeInfo.emoji} ${typeInfo.label} Ticket`)
            .setDescription(
                `Welcome ${interaction.user}!\n\nA member of our team will be with you shortly.\n\n` +
                `*Describe your issue in detail below.*`
            )
            .addFields({ name: 'Opened by', value: `${interaction.user.tag}`, inline: true })
            .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(INTERACTION_PREFIXES.TICKET_CLOSE)
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒'),
        );

        await channel.send({ content: `${interaction.user} ${settings.support_role_id ? `<@&${settings.support_role_id}>` : ''}`, embeds: [embed], components: [closeRow] });
        await interaction.editReply({ content: `${EMOJIS.SUCCESS} Your ticket has been created: ${channel}` });
    } catch (err) {
        await interaction.editReply({ content: `${EMOJIS.ERROR} Failed to create ticket: ${err.message}` });
    }
}

async function handleClose(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await TicketRepository.getByChannel(interaction.channel.id);
    if (!ticket || ticket.status !== 'open') {
        return interaction.editReply({ content: `${EMOJIS.ERROR} This is not an open ticket.` });
    }

    await TicketRepository.close(interaction.channel.id, interaction.user.id);

    await interaction.channel.send({
        embeds: [new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription(`${EMOJIS.LOCK} Ticket closed by **${interaction.user.tag}**. Deleting in 5 seconds…`)
        ],
    });

    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Ticket closed.` });
    setTimeout(() => interaction.channel.delete('Ticket closed').catch(() => {}), 5000);
}

async function handleSave(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const session = _sessions.get(`${interaction.guild.id}:${interaction.user.id}`) ?? {};
    await TicketRepository.saveSettings(interaction.guild.id, { ...session, enabled: true });
    _sessions.delete(`${interaction.guild.id}:${interaction.user.id}`);

    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Ticket system enabled and configured! Use \`/ticket panel\` to post the panel.` });
}

async function handleCategorySelect(interaction) {
    const categoryId = interaction.values[0];
    store(interaction, 'category_id', categoryId);
    await interaction.reply({ content: `${EMOJIS.SUCCESS} Ticket category set to <#${categoryId}>.`, flags: 64 });
}

async function handleRoleSelect(interaction) {
    const roleId = interaction.values[0];
    store(interaction, 'support_role_id', roleId);
    await interaction.reply({ content: `${EMOJIS.SUCCESS} Support role set to <@&${roleId}>.`, flags: 64 });
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
