'use strict';

const { EmbedBuilder } = require('discord.js');
const { VerificationService } = require('../../services/VerificationService');
const { COLORS, EMOJIS }      = require('../../config/constants');

async function handle(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const result = await VerificationService.verify(interaction.guild, interaction.member);

    if (!result.ok) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setDescription(`${EMOJIS.ERROR} ${result.reason}`)
            ],
        });
    }

    const embed = new EmbedBuilder()
        .setColor(COLORS.VERIFY)
        .setTitle(`${EMOJIS.SUCCESS} Verified Successfully`)
        .setDescription(`You now have access to **${interaction.guild.name}**. Welcome!`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

module.exports = { handle };
