'use strict';

const { AUTOMOD_LINK_PATTERN } = require('../config/constants');

const WHITELIST = ['cdn.discordapp.com', 'media.discordapp.net', 'discord.com', 'tenor.com', 'giphy.com'];

async function check(message, settings) {
    AUTOMOD_LINK_PATTERN.lastIndex = 0;
    const matches = message.content.match(AUTOMOD_LINK_PATTERN) ?? [];

    const filtered = matches.filter(url => {
        try {
            const host = new URL(url).hostname.replace(/^www\./, '');
            return !WHITELIST.includes(host);
        } catch {
            return true;
        }
    });

    if (filtered.length > 0) {
        return { triggered: true, rule: 'anti_link', reason: 'External link detected' };
    }

    return { triggered: false };
}

module.exports = { check };
