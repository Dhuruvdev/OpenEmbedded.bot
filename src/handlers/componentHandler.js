'use strict';

const { INTERACTION_PREFIXES } = require('../config/constants');
const { makeLogger } = require('../utils/logger');
const log = makeLogger('ComponentHandler');

const verifyButton  = require('../components/verification/verifyButton');
const setupFlow     = require('../components/verification/setupFlow');
const ticketMenu    = require('../components/tickets/ticketMenu');
const welcomeSetup  = require('../components/welcome/welcomeSetup');

const COMPONENT_ROUTES = [
    { prefix: INTERACTION_PREFIXES.VERIFY_BUTTON,   handler: verifyButton.handle },
    { prefix: INTERACTION_PREFIXES.VERIFY_SETUP,    handler: setupFlow.handle },
    { prefix: INTERACTION_PREFIXES.VERIFY_SAVE,     handler: setupFlow.handle },
    { prefix: INTERACTION_PREFIXES.VERIFY_METHOD,   handler: setupFlow.handle },
    { prefix: INTERACTION_PREFIXES.VERIFY_ROLE,     handler: setupFlow.handle },
    { prefix: INTERACTION_PREFIXES.VERIFY_CHANNEL,  handler: setupFlow.handle },
    { prefix: INTERACTION_PREFIXES.VERIFY_CATEGORY, handler: setupFlow.handle },
    { prefix: INTERACTION_PREFIXES.VERIFY_EDIT,     handler: setupFlow.handle },
    { prefix: INTERACTION_PREFIXES.VERIFY_RESET,    handler: setupFlow.handle },
    { prefix: INTERACTION_PREFIXES.TICKET_CREATE,   handler: ticketMenu.handle },
    { prefix: INTERACTION_PREFIXES.TICKET_CLOSE,    handler: ticketMenu.handle },
    { prefix: INTERACTION_PREFIXES.TICKET_TYPE,     handler: ticketMenu.handle },
    { prefix: INTERACTION_PREFIXES.TICKET_SETUP,    handler: ticketMenu.handle },
    { prefix: INTERACTION_PREFIXES.TICKET_SAVE,     handler: ticketMenu.handle },
    { prefix: INTERACTION_PREFIXES.TICKET_CATEGORY, handler: ticketMenu.handle },
    { prefix: INTERACTION_PREFIXES.TICKET_ROLE,     handler: ticketMenu.handle },
    { prefix: INTERACTION_PREFIXES.WELCOME_SAVE,    handler: welcomeSetup.handle },
    { prefix: INTERACTION_PREFIXES.WELCOME_TEST,    handler: welcomeSetup.handle },
    { prefix: INTERACTION_PREFIXES.WELCOME_CHANNEL, handler: welcomeSetup.handle },
    { prefix: INTERACTION_PREFIXES.WELCOME_ROLE,    handler: welcomeSetup.handle },
];

async function handleComponent(interaction) {
    const id = interaction.customId;

    for (const route of COMPONENT_ROUTES) {
        if (id === route.prefix || id.startsWith(route.prefix + ':')) {
            try {
                await route.handler(interaction);
            } catch (err) {
                log.error(`Component handler error [${id}]:`, err.message);
                const msg = { content: '❌ An error occurred. Please try again.', flags: 64 };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(msg).catch(() => {});
                } else {
                    await interaction.reply(msg).catch(() => {});
                }
            }
            return;
        }
    }

    log.debug(`No component handler for customId: ${id}`);
}

module.exports = { handleComponent };
