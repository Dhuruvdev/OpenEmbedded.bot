'use strict';

const { LoggingService } = require('../services/LoggingService');
const { makeLogger }     = require('../utils/logger');
const log = makeLogger('MessageUpdate');

module.exports = {
    name: 'messageUpdate',
    once: false,
    async execute(oldMessage, newMessage) {
        if (!newMessage.guild)       return;
        if (newMessage.author?.bot)  return;
        if (oldMessage.partial || newMessage.partial) return;

        await LoggingService.logMessageEdit(newMessage.guild, oldMessage, newMessage).catch(err =>
            log.error('Message edit log failed:', err.message)
        );
    },
};
