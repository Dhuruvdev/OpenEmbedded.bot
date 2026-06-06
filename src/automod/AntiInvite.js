'use strict';

const { AUTOMOD_INVITE_PATTERN } = require('../config/constants');

async function check(message, settings) {
    AUTOMOD_INVITE_PATTERN.lastIndex = 0;
    if (AUTOMOD_INVITE_PATTERN.test(message.content)) {
        return { triggered: true, rule: 'anti_invite', reason: 'Discord invite link detected' };
    }
    return { triggered: false };
}

module.exports = { check };
