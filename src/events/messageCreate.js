'use strict';

const { AutoModService } = require('../services/AutoModService');
const { makeLogger }     = require('../utils/logger');
const log = makeLogger('MessageCreate');

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        if (message.author?.bot) return;
        if (!message.guild)       return;

        await AutoModService.process(message).catch(err =>
            log.error('AutoMod error:', err.message)
        );
    },
};
