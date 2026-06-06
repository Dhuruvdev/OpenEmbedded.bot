'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    PermissionFlagsBits,
    ChannelType,
} = require('discord.js');
const { TicketRepository }  = require('../../repositories/TicketRepository');
const { COLORS, EMOJIS, INTERACTION_PREFIXES } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage the ticket system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('setup')
            .setDescription('Configure the ticket system')
        )
        .addSubcommand(sub => sub
            .setName('panel')
            .setDescription('Post the ticket creation panel')
        )
        .addSubcommand(sub => sub
            .setName('close')
            .setDescription('Close the current ticket')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'setup': return handleSetup(interaction);
            case 'panel': return handlePanel(interaction);
            case 'close': return handleClose(interaction);
        }
    },
};

async function handleSetup(interaction) {
    const settings = await TicketRepository.getSettings(interaction.guild.id);

    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.TICKET} Ticket System Setup`)
        .setDescription('Configure the support ticket system for your server.')
        .addFields(
            { name: 'Status',         value: settings?.enabled ? `${EMOJIS.SUCCESS} Enabled` : `${EMOJIS.ERROR} Disabled`, inline: true },
            { name: 'Category',       value: settings?.category_id ? `<#${settings.category_id}>` : '*Not set*',           inline: true },
            { name: 'Support Role',   value: settings?.support_role_id ? `<@&${settings.support_role_id}>` : '*Not set*',  inline: true },
            { name: 'Log Channel',    value: settings?.log_channel_id ? `<#${settings.log_channel_id}>` : '*None*',        inline: true },
            { name: 'Max per user',   value: String(settings?.max_per_user ?? 1),                                          inline: true },
        )
        .setTimestamp();

    const categoryRow = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId(INTERACTION_PREFIXES.TICKET_CATEGORY)
            .setPlaceholder('Select category for ticket channels')
            .addChannelTypes(ChannelType.GuildCategory),
    );

    const roleRow = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId(INTERACTION_PREFIXES.TICKET_ROLE)
            .setPlaceholder('Select support team role'),
    );

    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(INTERACTION_PREFIXES.TICKET_SAVE)
            .setLabel('Enable & Save')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💾'),
    );

    await interaction.reply({ embeds: [embed], components: [categoryRow, roleRow, btnRow], flags: 64 });
}

async function handlePanel(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const settings = await TicketRepository.getSettings(interaction.guild.id);
    if (!settings?.enabled) {
        return interaction.editReply({ content: `${EMOJIS.ERROR} Configure the ticket system first with \`/ticket setup\`.` });
    }

    const panelEmbed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.TICKET} Support Tickets`)
        .setDescription(
            '**Need help?** Open a support ticket and our team will assist you.\n\n' +
            '> 📩 **Support** — General help and questions\n' +
            '> 💰 **Billing** — Payment and subscription issues\n' +
            '> 🤝 **Partnership** — Partnership inquiries\n' +
            '> 📋 **Other** — Any other requests'
        )
        .setFooter({ text: 'Select a ticket type to create a ticket' })
        .setTimestamp();

    const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(INTERACTION_PREFIXES.TICKET_TYPE)
            .setPlaceholder('Select ticket type')
            .addOptions([
                { label: 'Support',     description: 'General help and questions',       value: 'support',     emoji: '📩' },
                { label: 'Billing',     description: 'Payment and subscription issues',  value: 'billing',     emoji: '💰' },
                { label: 'Partnership', description: 'Partnership inquiries',             value: 'partnership', emoji: '🤝' },
                { label: 'Other',       description: 'Any other requests',               value: 'other',       emoji: '📋' },
            ]),
    );

    await interaction.channel.send({ embeds: [panelEmbed], components: [selectRow] });
    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Ticket panel posted!` });
}

async function handleClose(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await TicketRepository.getByChannel(interaction.channel.id);
    if (!ticket || ticket.status !== 'open') {
        return interaction.editReply({ content: `${EMOJIS.ERROR} This channel is not an open ticket.` });
    }

    await TicketRepository.close(interaction.channel.id, interaction.user.id);

    await interaction.channel.send({
        embeds: [new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription(`${EMOJIS.LOCK} Ticket closed by **${interaction.user.tag}**. This channel will be deleted in 5 seconds.`)
        ],
    });

    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Ticket closed.` });
    setTimeout(() => interaction.channel.delete('Ticket closed').catch(() => {}), 5000);
}
