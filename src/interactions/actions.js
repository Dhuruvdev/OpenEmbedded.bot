/**
 * discord-bot/src/interactions/actions.js
 *
 * Executes the action steps configured in the OpenEmbedded visual builder.
 *
 * Supported step types
 * ─────────────────────
 *   reply / reply_embed  — respond to the interaction with content/components
 *   give_role            — add a role to the member
 *   remove_role          — remove a role from the member
 *   send_channel         — post a message to another channel
 *   dm_user              — send the user a private message
 *   delete_message       — delete the message the button was on
 */

const { discordFetch, respondToInteraction } = require('../utils/api');
const { makeLogger } = require('../utils/logger');

const log = makeLogger('Actions');

/**
 * Execute all steps for a button/select interaction.
 *
 * @param {object} interaction — raw Discord INTERACTION_CREATE payload
 * @param {object} action      — { steps: Array<Step> }
 * @param {string} botToken    — bot token for REST calls
 */
async function executeAction(interaction, action, botToken) {
    const { id, token, data, member, user, guild_id, channel_id, message } = interaction;
    const userId    = member?.user?.id ?? user?.id;
    const replyStep = action.steps.find(s => s.type === 'reply' || s.type === 'reply_embed');

    if (replyStep) {
        let components = [];
        if (replyStep.embedJson) {
            try { components = JSON.parse(replyStep.embedJson); } catch { /* ignore */ }
        }
        const flags = (components.length > 0 ? 32768 : 0) | (replyStep.ephemeral ? 64 : 0);
        try {
            await respondToInteraction(id, token, {
                type: 4,
                data: {
                    content:    replyStep.content?.trim() || undefined,
                    components,
                    flags,
                },
            });
        } catch (e) {
            log.error('Reply failed:', e.message, e.discordBody);
            await respondToInteraction(id, token, { type: 6 }).catch(() => {});
        }
    } else {
        await respondToInteraction(id, token, { type: 6 }).catch(e =>
            log.error('ACK failed:', e.message)
        );
    }

    for (const step of action.steps) {
        if (step === replyStep) continue;
        try {
            switch (step.type) {
                case 'give_role':
                    if (guild_id && userId && step.roleId) {
                        await discordFetch(
                            `/guilds/${guild_id}/members/${userId}/roles/${step.roleId}`,
                            botToken, { method: 'PUT' }
                        );
                        log.info(`Gave role ${step.roleId} to ${userId}`);
                    }
                    break;

                case 'remove_role':
                    if (guild_id && userId && step.roleId) {
                        await discordFetch(
                            `/guilds/${guild_id}/members/${userId}/roles/${step.roleId}`,
                            botToken, { method: 'DELETE' }
                        );
                        log.info(`Removed role ${step.roleId} from ${userId}`);
                    }
                    break;

                case 'send_channel':
                    if (step.channelId) {
                        await discordFetch(
                            `/channels/${step.channelId}/messages`,
                            botToken,
                            { method: 'POST', body: JSON.stringify({ content: step.content || '' }) }
                        );
                        log.info(`Sent message to channel ${step.channelId}`);
                    }
                    break;

                case 'dm_user':
                    if (userId && step.content) {
                        const dm = await discordFetch('/users/@me/channels', botToken, {
                            method: 'POST',
                            body:   JSON.stringify({ recipient_id: userId }),
                        });
                        if (dm?.id) {
                            await discordFetch(`/channels/${dm.id}/messages`, botToken, {
                                method: 'POST',
                                body:   JSON.stringify({ content: step.content }),
                            });
                            log.info(`DM'd user ${userId}`);
                        }
                    }
                    break;

                case 'delete_message':
                    if (message?.id && channel_id) {
                        await discordFetch(
                            `/channels/${channel_id}/messages/${message.id}`,
                            botToken, { method: 'DELETE' }
                        );
                        log.info(`Deleted message ${message.id}`);
                    }
                    break;

                default:
                    log.warn(`Unknown action step type: "${step.type}"`);
            }
        } catch (err) {
            log.error(`Step "${step.type}" failed:`, err.message);
        }
    }
}

module.exports = { executeAction };
