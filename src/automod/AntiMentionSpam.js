'use strict';

const DEFAULT_MAX = 5;

async function check(message, settings) {
    const max     = settings.anti_mention_max ?? DEFAULT_MAX;
    const mentions = message.mentions.users.size + message.mentions.roles.size;

    if (message.mentions.everyone) {
        return { triggered: true, rule: 'anti_mention_spam', reason: '@everyone / @here ping' };
    }

    if (mentions >= max) {
        return { triggered: true, rule: 'anti_mention_spam', reason: `Too many mentions (${mentions}/${max})` };
    }

    return { triggered: false };
}

module.exports = { check };
