'use strict';

const DEFAULT_PERCENT = 70;
const DEFAULT_MIN_LEN = 10;

async function check(message, settings) {
    const pct    = settings.anti_caps_percent ?? DEFAULT_PERCENT;
    const minLen = DEFAULT_MIN_LEN;
    const text   = message.content.replace(/[^a-zA-Z]/g, '');

    if (text.length < minLen) return { triggered: false };

    const upper   = (text.match(/[A-Z]/g) ?? []).length;
    const percent  = (upper / text.length) * 100;

    if (percent >= pct) {
        return { triggered: true, rule: 'anti_caps', reason: `Excessive caps (${Math.round(percent)}%)` };
    }

    return { triggered: false };
}

module.exports = { check };
