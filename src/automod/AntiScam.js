'use strict';

const { AUTOMOD_SCAM_PATTERNS } = require('../config/constants');

async function check(message, settings) {
    const content = message.content;

    for (const pattern of AUTOMOD_SCAM_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(content)) {
            return { triggered: true, rule: 'anti_scam', reason: 'Potential scam / phishing content detected' };
        }
    }

    return { triggered: false };
}

module.exports = { check };
