/**
 * discord-bot/src/interactions/handler.js
 *
 * Routes INTERACTION_CREATE payloads to the correct handler:
 *   type 2 → Slash command  → CommandRegistry.handleCommand()
 *   type 3 → Message component (button / select) → executeAction()
 *
 * Attach to BotClient:
 *   const h = new InteractionHandler(bot);
 *   h.setActions(buttonActions);
 */

const { executeAction }  = require('./actions');
const { handleCommand }  = require('../commands/registry');
const { respondToInteraction } = require('../utils/api');
const { makeLogger }     = require('../utils/logger');

const log = makeLogger('Interactions');

class InteractionHandler {
    /**
     * @param {import('../gateway/client').BotClient} bot
     */
    constructor(bot) {
        this._bot     = bot;
        this._actions = {};

        bot.on('interaction', async (data) => {
            try {
                await this._handle(data);
            } catch (err) {
                log.error('Unhandled interaction error:', err.message);
            }
        });
    }

    setActions(actions) {
        this._actions = actions || {};
    }

    /** Shared respond helper passed to commands and actions */
    _respond(interaction, payload) {
        return respondToInteraction(interaction.id, interaction.token, payload);
    }

    async _handle(interaction) {
        const { type, data } = interaction;

        // ── type 2: Application Command (slash commands) ──────────────────────
        if (type === 2) {
            log.info(`/${data?.name} by ${interaction.member?.user?.username ?? interaction.user?.username ?? '?'}`);
            await handleCommand(interaction, {
                respond:   (i, p) => this._respond(i, p),
                botClient: this._bot,
            });
            return;
        }

        // ── type 3: Message Component (buttons, select menus) ─────────────────
        if (type !== 3) return;
        if (!data?.custom_id) return;

        const componentType  = data.component_type;
        let action, customId;

        if (componentType === 3) {
            // Select menu — try matching by selected value first
            const selectedValues = data.values || [];
            const matchedValue   = selectedValues.find(v => this._actions[v]);
            if (matchedValue) {
                action   = this._actions[matchedValue];
                customId = matchedValue;
                log.info(`Select menu option "${matchedValue}" matched`);
            } else {
                customId = data.custom_id;
                action   = this._actions[customId];
            }
        } else {
            customId = data.custom_id;
            action   = this._actions[customId];
        }

        if (!action?.steps?.length) {
            await this._respond(interaction, { type: 6 }).catch(e =>
                log.error('ACK failed:', e.message)
            );
            return;
        }

        log.info(`"${customId}" → ${action.steps.length} step(s)`);
        await executeAction(interaction, action, this._bot._token);
    }
}

module.exports = { InteractionHandler };
