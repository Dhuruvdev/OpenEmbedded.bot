'use strict';

const { AutoModRepository } = require('../repositories/AutoModRepository');
const { LoggingService }    = require('./LoggingService');
const AntiSpam              = require('../automod/AntiSpam');
const AntiMentionSpam       = require('../automod/AntiMentionSpam');
const AntiInvite            = require('../automod/AntiInvite');
const AntiLink              = require('../automod/AntiLink');
const AntiCaps              = require('../automod/AntiCaps');
const AntiScam              = require('../automod/AntiScam');
const { makeLogger }        = require('../utils/logger');

const log = makeLogger('AutoModService');

class AutoModService {
    static _cache = new Map();

    static async getSettings(guildId) {
        const cached = this._cache.get(guildId);
        if (cached && Date.now() - cached.ts < 60_000) return cached.settings;

        const settings = await AutoModRepository.get(guildId);
        this._cache.set(guildId, { settings, ts: Date.now() });
        return settings;
    }

    static invalidateCache(guildId) {
        this._cache.delete(guildId);
    }

    static async process(message) {
        if (!message.guild) return;
        if (message.author.bot) return;

        const settings = await this.getSettings(message.guild.id);
        if (!settings) return;

        const member = message.member;
        if (!member) return;

        if (settings.ignored_channels?.includes(message.channel.id)) return;
        if (settings.ignored_roles?.some(r => member.roles.cache.has(r))) return;

        const checkers = [];

        if (settings.anti_spam)         checkers.push(AntiSpam.check);
        if (settings.anti_mention_spam)  checkers.push(AntiMentionSpam.check);
        if (settings.anti_invite)        checkers.push(AntiInvite.check);
        if (settings.anti_link)          checkers.push(AntiLink.check);
        if (settings.anti_scam)          checkers.push(AntiScam.check);
        if (settings.anti_caps)          checkers.push(AntiCaps.check);

        for (const checker of checkers) {
            const result = await checker(message, settings).catch(err => {
                log.error('AutoMod checker failed:', err.message);
                return null;
            });

            if (result?.triggered) {
                await this.enforce(message, settings, result);
                break;
            }
        }
    }

    static async enforce(message, settings, result) {
        try {
            await message.delete().catch(() => {});

            const action = settings.action ?? 'delete';

            if (action === 'warn' || action === 'timeout') {
                try {
                    await message.author.send({
                        content: `⚠️ **AutoMod** — ${result.reason}\n*This is an automated action in **${message.guild.name}**.*`,
                    }).catch(() => {});
                } catch {}
            }

            if (action === 'timeout' && message.member?.moderatable) {
                await message.member.timeout(60_000, `AutoMod: ${result.reason}`).catch(() => {});
            }

            await LoggingService.logAction(message.guild, 'AUTOMOD', {
                user:    message.author,
                channel: message.channel,
                reason:  result.reason,
                extra:   { Rule: result.rule },
            });
        } catch (err) {
            log.error('AutoMod enforce failed:', err.message);
        }
    }
}

module.exports = { AutoModService };
