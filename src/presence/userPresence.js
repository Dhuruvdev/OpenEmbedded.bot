/**
 * discord-bot/src/presence/userPresence.js
 *
 * User Rich Presence — shows "Playing OpenEmbedded" on the logged-in user's
 * real Discord profile while they are on the website, exactly like how
 * "Listening to Spotify" appears when you play music.
 *
 * HOW IT WORKS
 * ────────────
 *   1. When a user signs in with Discord OAuth2, their access token (which
 *      must carry the `activities.write` scope) is passed to `set()`.
 *   2. We call Discord's headless-sessions endpoint to attach an activity to
 *      their profile. No Discord desktop app is required.
 *   3. Sessions expire after ~20 minutes, so the frontend calls
 *      POST /api/auth/presence/refresh every 15 minutes to keep it alive.
 *   4. On logout, `clear()` removes the stored token.
 *
 * OAUTH SCOPE REQUIRED
 * ────────────────────
 *   Add `activities.write` to your Discord OAuth2 authorization URL.
 *   If the endpoint returns 403, the app needs the Activities feature enabled
 *   in the Discord Developer Portal (App Settings → Activities).
 *
 * ACTIVITY DISPLAY
 * ────────────────
 *   Others see on your profile:
 *     ┌─────────────────────────────┐
 *     │  Playing a Game             │
 *     │  OpenEmbedded               │
 *     │  Building Discord components│
 *     │  Using the visual builder   │
 *     │  01:23 elapsed              │
 *     └─────────────────────────────┘
 */

const { makeLogger }     = require('../utils/logger');
const { buildUserActivity } = require('./activities');

const log = makeLogger('UserPresence');
const DISCORD_API = 'https://discord.com/api/v10';

class UserPresence {
    constructor() {
        /** @type {Map<string, { accessToken: string }>} */
        this._store = new Map();
    }

    /**
     * Set (or refresh) the user's Discord Rich Presence activity.
     *
     * @param {string} userId        — Discord user ID (used as cache key)
     * @param {string} accessToken   — OAuth2 Bearer token with activities.write scope
     * @param {string} applicationId — Discord application / client ID
     * @param {{ page?, action? }} ctx — optional context for richer presence text
     * @returns {Promise<boolean>} true on success
     */
    async set(userId, accessToken, applicationId, ctx = {}) {
        if (!applicationId) {
            log.warn('DISCORD_CLIENT_ID not set — skipping presence');
            return false;
        }
        if (!accessToken) {
            log.warn(`No access token for user ${userId}`);
            return false;
        }

        this._store.set(userId, { accessToken });

        const activity = buildUserActivity(applicationId, ctx);

        try {
            const res = await fetch(`${DISCORD_API}/users/@me/headless-sessions`, {
                method:  'POST',
                headers: {
                    Authorization:  `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ activity }),
            });

            if (res.ok) {
                log.info(`Activity set for user ${userId} ✓`);
                return true;
            }

            const body = await res.text();

            if (res.status === 401) {
                log.warn(`Token invalid or missing activities.write scope for user ${userId} — re-auth needed`);
            } else if (res.status === 403) {
                log.warn(`activities.write scope not approved (403). Enable "Activities" in the Discord Developer Portal for your app.`);
            } else {
                log.warn(`Failed to set activity (HTTP ${res.status}): ${body}`);
            }
            return false;
        } catch (err) {
            log.error(`Network error setting activity for ${userId}: ${err.message}`);
            return false;
        }
    }

    /**
     * Refresh the presence using the stored token (no access token needed).
     * Called every ~15 minutes from the frontend.
     *
     * @param {string} userId
     * @param {string} applicationId
     * @returns {Promise<boolean>}
     */
    async refresh(userId, applicationId) {
        const entry = this._store.get(userId);
        if (!entry) {
            log.warn(`No stored token for ${userId} — cannot refresh (user must re-login)`);
            return false;
        }
        return this.set(userId, entry.accessToken, applicationId);
    }

    /**
     * Remove stored token for a user (call on logout).
     * The Discord headless session will expire naturally within 20 minutes.
     *
     * @param {string} userId
     */
    clear(userId) {
        if (this._store.has(userId)) {
            this._store.delete(userId);
            log.info(`Cleared presence token for user ${userId}`);
        }
    }

    /** @returns {boolean} */
    has(userId) {
        return this._store.has(userId);
    }

    /** How many users currently have an active presence token. */
    get activeCount() {
        return this._store.size;
    }
}

// Singleton — backend imports this instance directly
const userPresence = new UserPresence();
module.exports = { UserPresence, userPresence };
