'use strict';

const SPAM_MAP   = new Map();
const TIMER_MAP  = new Map();

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

    // Clear any existing cleanup timer before scheduling a new one
    // — prevents accumulating one timer per message
    const existing = TIMER_MAP.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
        const cur = SPAM_MAP.get(key) ?? [];
        const fresh = cur.filter(t => Date.now() - t < window);
        if (fresh.length === 0) {
            SPAM_MAP.delete(key);
            TIMER_MAP.delete(key);
        } else {
            SPAM_MAP.set(key, fresh);
        }
    }, window + 100);
    TIMER_MAP.set(key, timer);

    if (recent.length >= count) {
        SPAM_MAP.delete(key);
        TIMER_MAP.delete(key);
        if (existing) clearTimeout(existing);
        return {
            triggered: true,
            rule:   'anti_spam',
            reason: `Sending messages too fast (${recent.length} in ${window / 1000}s)`,
        };
    }

    return { triggered: false };
}

module.exports = { check };
