'use strict';

const { AutoModService }           = require('../services/AutoModService');
const { handleOwnerMessage }       = require('../handlers/ownerHandler');
const { makeLogger }               = require('../utils/logger');

const log = makeLogger('MessageCreate');

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message, client) {
        if (message.author?.bot) return;
        if (!message.guild)       return;

        // ── Owner no-prefix commands (>>command) ─────────────────────────────
        // Checked first so owner can bypass automod on their own messages
        const handledByOwner = await handleOwnerMessage(message, client).catch(err => {
            log.error('Owner command error:', err.message);
            return false;
        });
        if (handledByOwner) return;

        // ── AutoMod ───────────────────────────────────────────────────────────
        await AutoModService.process(message).catch(err =>
            log.error('AutoMod error:', err.message)
        );
    },
};
