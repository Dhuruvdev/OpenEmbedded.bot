/**
 * Thin wrapper around the Discord REST API (v10).
 *
 * discordFetch(path, token, options?)
 *   token: pass a bare token string — the prefix ('Bot ' or 'Bearer ') is
 *          determined by the tokenType argument (default 'Bot').
 *
 * respondToInteraction(id, token, data)
 *   Shorthand for posting a callback to an interaction.
 */

const DISCORD_API = 'https://discord.com/api/v10';

async function discordFetch(path, token, options = {}, tokenType = 'Bot') {
    const isFormData = options.body instanceof FormData;
    const headers = {};

    if (token) headers.Authorization = `${tokenType} ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';
    Object.assign(headers, options.headers || {});

    const res = await fetch(`${DISCORD_API}${path}`, { ...options, headers });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err  = new Error(body?.message || `Discord API error ${res.status}`);
        err.discordBody = body;
        err.httpStatus  = res.status;
        throw err;
    }

    return res.status === 204 ? null : res.json();
}

async function respondToInteraction(interactionId, interactionToken, data) {
    return discordFetch(
        `/interactions/${interactionId}/${interactionToken}/callback`,
        null,
        { method: 'POST', body: JSON.stringify(data) },
    );
}

module.exports = { discordFetch, respondToInteraction };
