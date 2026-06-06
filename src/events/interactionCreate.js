'use strict';

const { InteractionType, MessageFlags } = require('discord.js');
const { handleComponent }              = require('../handlers/componentHandler');
const { makeLogger }                   = require('../utils/logger');

const log = makeLogger('Interactions');

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                await handleCommand(interaction, client);
            } else if (
                interaction.isButton()         ||
                interaction.isAnySelectMenu()  ||
                interaction.isModalSubmit()
            ) {
                await handleComponent(interaction);
            } else if (interaction.isAutocomplete()) {
                const cmd = client.commands.get(interaction.commandName);
                if (cmd?.autocomplete) await cmd.autocomplete(interaction);
            }
        } catch (err) {
            log.error(`Interaction error [${interaction.type}]:`, err.stack ?? err.message);
            const errMsg = { content: '❌ An unexpected error occurred.', flags: MessageFlags.Ephemeral };
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errMsg);
                } else {
                    await interaction.reply(errMsg);
                }
            } catch {}
        }
    },
};

async function handleCommand(interaction, client) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
        log.warn(`Unknown command: /${interaction.commandName}`);
        await interaction.reply({ content: `Unknown command \`/${interaction.commandName}\``, flags: 64 });
        return;
    }

    if (!interaction.guild) {
        await interaction.reply({ content: '❌ This command can only be used in a server.', flags: 64 });
        return;
    }

    const log2 = makeLogger('Commands');
    log2.info(`/${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild.name}`);

    await command.execute(interaction);
}
