'use strict';

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { GuildRepository }             = require('../repositories/GuildRepository');
const { COLORS, EMOJIS }              = require('../config/constants');
const { makeLogger }                  = require('../utils/logger');

const log = makeLogger('LoggingService');

const ACTION_CONFIG = {
    BAN:        { emoji: EMOJIS.BAN,     color: COLORS.ERROR,   label: 'Member Banned'     },
    UNBAN:      { emoji: EMOJIS.SUCCESS, color: COLORS.SUCCESS, label: 'Member Unbanned'   },
    KICK:       { emoji: EMOJIS.KICK,    color: COLORS.WARNING, label: 'Member Kicked'     },
    TIMEOUT:    { emoji: EMOJIS.TIMEOUT, color: COLORS.WARNING, label: 'Member Timed Out'  },
    UNTIMEOUT:  { emoji: EMOJIS.UNMUTE,  color: COLORS.SUCCESS, label: 'Timeout Removed'   },
    WARN:       { emoji: EMOJIS.WARN,    color: COLORS.GOLD,    label: 'Member Warned'     },
    MUTE:       { emoji: EMOJIS.MUTE,    color: COLORS.WARNING, label: 'Member Muted'      },
    UNMUTE:     { emoji: EMOJIS.UNMUTE,  color: COLORS.SUCCESS, label: 'Member Unmuted'    },
    PURGE:      { emoji: EMOJIS.PURGE,   color: COLORS.INFO,    label: 'Messages Purged'   },
    LOCK:       { emoji: EMOJIS.LOCK,    color: COLORS.WARNING, label: 'Channel Locked'    },
    UNLOCK:     { emoji: EMOJIS.UNLOCK,  color: COLORS.SUCCESS, label: 'Channel Unlocked'  },
    VERIFY:     { emoji: EMOJIS.VERIFY,  color: COLORS.VERIFY,  label: 'Member Verified'   },
    SLOWMODE:   { emoji: EMOJIS.SLOW,    color: COLORS.INFO,    label: 'Slowmode Updated'  },
    AUTOMOD:    { emoji: EMOJIS.AUTOMOD, color: COLORS.ORANGE,  label: 'AutoMod Action'    },
    MSG_DELETE: { emoji: EMOJIS.PURGE,   color: COLORS.NEUTRAL, label: 'Message Deleted'   },
    MSG_EDIT:   { emoji: EMOJIS.LOG,     color: COLORS.NEUTRAL, label: 'Message Edited'    },
    NICK:       { emoji: EMOJIS.USER,    color: COLORS.INFO,    label: 'Nickname Changed'  },
};

class LoggingService {
    static async getLogChannel(guild, type = 'mod') {
        try {
            const settings = await GuildRepository.get(guild.id);
            if (!settings) return null;
            const channelId = type === 'mod' ? settings.mod_log_channel : settings.log_channel_id;
            if (!channelId) return null;
            return guild.channels.cache.get(channelId) ?? null;
        } catch {
            return null;
        }
    }

    static async logAction(guild, action, data = {}) {
        const channel = await this.getLogChannel(guild, 'mod');
        if (!channel) return;

        const cfg = ACTION_CONFIG[action] ?? { emoji: EMOJIS.LOG, color: COLORS.NEUTRAL, label: action };

        const embed = new EmbedBuilder()
            .setColor(cfg.color)
            .setTitle(`${cfg.emoji} ${cfg.label}`)
            .setTimestamp();

        if (data.user) {
            embed.addFields({
                name:   'User',
                value:  `${data.user} \`(${data.user.id ?? data.userId})\``,
                inline: true,
            });
        } else if (data.userId) {
            embed.addFields({ name: 'User', value: `<@${data.userId}> \`(${data.userId})\``, inline: true });
        }

        if (data.moderator) {
            embed.addFields({ name: 'Moderator', value: `${data.moderator}`, inline: true });
        }

        if (data.reason) {
            embed.addFields({ name: 'Reason', value: data.reason.slice(0, 1024), inline: false });
        }

        if (data.duration) {
            embed.addFields({ name: 'Duration', value: data.duration, inline: true });
        }

        if (data.channel) {
            embed.addFields({ name: 'Channel', value: `${data.channel}`, inline: true });
        }

        if (data.count !== undefined) {
            embed.addFields({ name: 'Count', value: String(data.count), inline: true });
        }

        if (data.extra) {
            for (const [k, v] of Object.entries(data.extra)) {
                embed.addFields({ name: k, value: String(v).slice(0, 1024), inline: true });
            }
        }

        try {
            await channel.send({ embeds: [embed] });
        } catch (err) {
            log.error(`Failed to send log to ${channel.id}:`, err.message);
        }
    }

    static async logMessageDelete(guild, message) {
        const channel = await this.getLogChannel(guild, 'general');
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(COLORS.NEUTRAL)
            .setTitle(`${EMOJIS.PURGE} Message Deleted`)
            .setTimestamp()
            .addFields(
                { name: 'Author', value: `${message.author ?? 'Unknown'}`, inline: true },
                { name: 'Channel', value: `${message.channel}`, inline: true },
            );

        if (message.content) {
            embed.addFields({ name: 'Content', value: message.content.slice(0, 1024), inline: false });
        }

        try {
            await channel.send({ embeds: [embed] });
        } catch {}
    }

    static async logMessageEdit(guild, oldMessage, newMessage) {
        if (!oldMessage.content || oldMessage.content === newMessage.content) return;
        const channel = await this.getLogChannel(guild, 'general');
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(COLORS.NEUTRAL)
            .setTitle(`${EMOJIS.LOG} Message Edited`)
            .setTimestamp()
            .addFields(
                { name: 'Author',  value: `${newMessage.author ?? 'Unknown'}`, inline: true },
                { name: 'Channel', value: `${newMessage.channel}`, inline: true },
                { name: 'Jump',    value: `[View Message](${newMessage.url})`, inline: true },
                { name: 'Before',  value: oldMessage.content.slice(0, 512) || '\u200b', inline: false },
                { name: 'After',   value: newMessage.content.slice(0, 512) || '\u200b', inline: false },
            );

        try {
            await channel.send({ embeds: [embed] });
        } catch {}
    }
}

module.exports = { LoggingService };
