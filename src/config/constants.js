'use strict';

const COLORS = {
    PRIMARY:   0x5865F2,
    SUCCESS:   0x57F287,
    WARNING:   0xFEE75C,
    ERROR:     0xED4245,
    INFO:      0x5865F2,
    MODLOG:    0xEB459E,
    VERIFY:    0x57F287,
    NEUTRAL:   0x2B2D31,
    DARK:      0x1E1F22,
    GOLD:      0xF1C40F,
    ORANGE:    0xE67E22,
};

const EMOJIS = {
    SUCCESS:   '✅',
    ERROR:     '❌',
    WARNING:   '⚠️',
    INFO:      'ℹ️',
    BAN:       '🔨',
    KICK:      '👢',
    MUTE:      '🔇',
    UNMUTE:    '🔊',
    WARN:      '⚠️',
    TIMEOUT:   '⏰',
    PURGE:     '🗑️',
    LOCK:      '🔒',
    UNLOCK:    '🔓',
    SHIELD:    '🛡️',
    VERIFY:    '✓',
    TICKET:    '🎫',
    WELCOME:   '👋',
    MOD:       '🔧',
    STATS:     '📊',
    PING:      '🏓',
    SEARCH:    '🔍',
    CROWN:     '👑',
    ROLE:      '🏷️',
    CHANNEL:   '📋',
    SERVER:    '🏠',
    USER:      '👤',
    CALENDAR:  '📅',
    CLOCK:     '🕐',
    LINK:      '🔗',
    LOG:       '📝',
    AUTOMOD:   '🤖',
    SLOW:      '🐢',
    GUILD:     '🏰',
};

const LIMITS = {
    PURGE_MAX:          100,
    WARN_MAX:           25,
    REASON_MAX:         512,
    SLOWMODE_MAX:       21600,
    NICKNAME_MAX:       32,
    AUTOMOD_SPAM_COUNT: 5,
    AUTOMOD_SPAM_WINDOW: 5000,
    AUTOMOD_MENTION_MAX: 5,
    AUTOMOD_CAPS_PERCENT: 70,
    AUTOMOD_CAPS_MIN_LEN: 10,
};

const INTERACTION_PREFIXES = {
    VERIFY_BUTTON:      'verify:btn',
    VERIFY_SETUP:       'verify:setup',
    VERIFY_SAVE:        'verify:save',
    VERIFY_METHOD:      'verify:method',
    VERIFY_ROLE:        'verify:role',
    VERIFY_CHANNEL:     'verify:channel',
    VERIFY_CATEGORY:    'verify:category',
    VERIFY_EDIT:        'verify:edit',
    VERIFY_RESET:       'verify:reset',

    TICKET_CREATE:      'ticket:create',
    TICKET_CLOSE:       'ticket:close',
    TICKET_TYPE:        'ticket:type',
    TICKET_SETUP:       'ticket:setup',
    TICKET_SAVE:        'ticket:save',
    TICKET_CATEGORY:    'ticket:category',
    TICKET_ROLE:        'ticket:role',

    WELCOME_SAVE:       'welcome:save',
    WELCOME_TEST:       'welcome:test',
    WELCOME_CHANNEL:    'welcome:channel',
    WELCOME_ROLE:       'welcome:role',

    MOD_CONFIRM:        'mod:confirm',
    MOD_CANCEL:         'mod:cancel',

    WARN_ACTION:        'warn:action',
    WARN_CLEAR:         'warn:clear',
};

const AUTOMOD_INVITE_PATTERN = /discord(?:app)?\.(?:com\/invite|gg)\/[a-zA-Z0-9]+/gi;
const AUTOMOD_LINK_PATTERN   = /https?:\/\/[^\s]+/gi;
const AUTOMOD_SCAM_PATTERNS  = [
    /free\s*nitro/gi,
    /discord\s*nitro\s*gift/gi,
    /steam\s*gift/gi,
    /click\s*here\s*to\s*claim/gi,
    /airdrop/gi,
];

module.exports = {
    COLORS,
    EMOJIS,
    LIMITS,
    INTERACTION_PREFIXES,
    AUTOMOD_INVITE_PATTERN,
    AUTOMOD_LINK_PATTERN,
    AUTOMOD_SCAM_PATTERNS,
};
