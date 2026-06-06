'use strict';

const SPAM_MAP = new Map();

const DEFAULT_COUNT  = 5;
const DEFAULT_WINDOW = 5000;

async function check(message, settings) {
    const count  = settings.anti_spam_count  ?? DEFAULT_COUNT;
    const window = settings.anti_spam_window ?? DEFAULT_WINDOW;

    const key  = `${message.guild.id}:${message.author.id}`;
    const now  = Date.now();
    const list = SPAM_MAP.get(key) ?? [];

    const recent = list.filter(t => now - t < window);
    recent.push(now);
    SPAM_MAP.set(key, recent);

    setTimeout(() => {
        const cur = SPAM_MAP.get(key) ?? [];
        SPAM_MAP.set(key, cur.filter(t => Date.now() - t < window));
    }, window + 100);

    if (recent.length >= count) {
        SPAM_MAP.delete(key);
        return { triggered: true, rule: 'anti_spam', reason: `Sending messages too fast (${recent.length} in ${window / 1000}s)` };
    }

    return { triggered: false };
}

module.exports = { check };
