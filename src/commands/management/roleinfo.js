'use strict';

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { COLORS, EMOJIS } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Display information about a role')
        .addRoleOption(o => o
            .setName('role')
            .setDescription('The role to inspect')
            .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const role = interaction.options.getRole('role');

        const members = (await interaction.guild.members.fetch()).filter(m => m.roles.cache.has(role.id)).size;

        const perms = role.permissions.toArray()
            .map(p => `\`${p}\``)
            .slice(0, 15)
            .join(', ');

        const createdTs = Math.floor(role.createdTimestamp / 1000);

        const embed = new EmbedBuilder()
            .setColor(role.color || COLORS.NEUTRAL)
            .setTitle(`${EMOJIS.ROLE} ${role.name}`)
            .addFields(
                { name: '🆔 ID',        value: `\`${role.id}\``,                    inline: true },
                { name: '👥 Members',   value: String(members),                     inline: true },
                { name: '📅 Created',   value: `<t:${createdTs}:D>`,               inline: true },
                { name: '🎨 Color',     value: `\`${role.hexColor}\``,              inline: true },
                { name: '📌 Position',  value: String(role.position),               inline: true },
                { name: '💬 Mentionable', value: role.mentionable ? 'Yes' : 'No',  inline: true },
                { name: '📢 Hoisted',   value: role.hoist ? 'Yes' : 'No',          inline: true },
                { name: '🤖 Managed',   value: role.managed ? 'Yes' : 'No',        inline: true },
                { name: '🔑 Permissions', value: perms || 'None',                  inline: false },
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
