/**
 * Activity payload builders for OpenEmbedded Rich Presence.
 *
 * Discord Rich Presence shows on a user's profile exactly like
 * "Listening to Spotify" — a card with name, details, state, and a live timer.
 *
 * Two types:
 *  1. Bot presence  — set via Gateway OP 3. Shows on the bot's own profile.
 *  2. User presence — set via OAuth2 headless-sessions. Shows on the
 *                     logged-in user's profile (requires activities.write scope).
 */

/**
 * Activity displayed on the BOT's own profile (OP 3).
 * @param {{ name?, details?, state?, url? }} opts
 */
function buildBotActivity({ name = 'OpenEmbedded', details, state, url } = {}) {
    return {
        type:    0,         // 0 = Playing
        name,
        ...(details ? { details } : {}),
        ...(state   ? { state }   : {}),
        ...(url     ? { url }     : {}),
    };
}

/**
 * Activity displayed on the LOGGED-IN USER's profile (headless-sessions).
 * Looks identical to "Listening to Spotify" but for OpenEmbedded.
 *
 * @param {string} applicationId   — Discord application / client ID
 * @param {{ page?, action? }} ctx — optional context for richer details
 */
function buildUserActivity(applicationId, { page = null, action = null } = {}) {
    const details = page
        ? `Editing: ${page}`
        : 'Building Discord components';

    const state = action || 'Using the visual builder';

    return {
        type:           0,              // 0 = Playing  (shows "Playing OpenEmbedded")
        name:           'OpenEmbedded',
        details,
        state,
        application_id: applicationId,
        platform:       'web',
        timestamps: {
            start: Math.floor(Date.now() / 1000),
        },
        assets: {
            large_image: 'openembedded',
            large_text:  'OpenEmbedded — discord.builders',
        },
    };
}

module.exports = { buildBotActivity, buildUserActivity };
