'use strict';

const { LoggingService } = require('../services/LoggingService');
const { makeLogger }     = require('../utils/logger');
const log = makeLogger('MessageDelete');

module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message) {
        if (!message.guild)        return;
        if (message.author?.bot)   return;
        if (message.partial)       return;

        await LoggingService.logMessageDelete(message.guild, message).catch(err =>
            log.error('Message delete log failed:', err.message)
        );
    },
};
