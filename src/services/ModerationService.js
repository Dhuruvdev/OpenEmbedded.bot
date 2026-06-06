'use strict';

const { ModerationLogRepository } = require('../repositories/ModerationLogRepository');
const { LoggingService }          = require('./LoggingService');
const { makeLogger }              = require('../utils/logger');

const log = makeLogger('ModerationService');

class ModerationService {
    static async ban(guild, target, moderator, reason, deleteMessageDays = 0) {
        await guild.members.ban(target.id ?? target, {
            deleteMessageSeconds: deleteMessageDays * 86400,
            reason: `${moderator.tag}: ${reason}`,
        });

        await ModerationLogRepository.add({
            guildId:     guild.id,
            userId:      target.id ?? target,
            moderatorId: moderator.id,
            action:      'BAN',
            reason,
        });

        await LoggingService.logAction(guild, 'BAN', {
            userId:    target.id ?? target,
            moderator: moderator,
            reason,
        });
    }

    static async unban(guild, userId, moderator, reason) {
        await guild.members.unban(userId, `${moderator.tag}: ${reason}`);

        await ModerationLogRepository.add({
            guildId:     guild.id,
            userId,
            moderatorId: moderator.id,
            action:      'UNBAN',
            reason,
        });

        await LoggingService.logAction(guild, 'UNBAN', { userId, moderator, reason });
    }

    static async kick(guild, member, moderator, reason) {
        await member.kick(`${moderator.tag}: ${reason}`);

        await ModerationLogRepository.add({
            guildId:     guild.id,
            userId:      member.id,
            moderatorId: moderator.id,
            action:      'KICK',
            reason,
        });

        await LoggingService.logAction(guild, 'KICK', {
            user:      member.user,
            moderator: moderator,
            reason,
        });
    }

    static async timeout(guild, member, moderator, reason, durationMs) {
        const until = new Date(Date.now() + durationMs);
        await member.timeout(durationMs, `${moderator.tag}: ${reason}`);

        await ModerationLogRepository.add({
            guildId:     guild.id,
            userId:      member.id,
            moderatorId: moderator.id,
            action:      'TIMEOUT',
            reason,
            durationMs,
        });

        await LoggingService.logAction(guild, 'TIMEOUT', {
            user:      member.user,
            moderator: moderator,
            reason,
            duration:  formatDuration(durationMs),
        });
    }

    static async untimeout(guild, member, moderator, reason) {
        await member.timeout(null, `${moderator.tag}: ${reason}`);

        await ModerationLogRepository.add({
            guildId:     guild.id,
            userId:      member.id,
            moderatorId: moderator.id,
            action:      'UNTIMEOUT',
            reason,
        });

        await LoggingService.logAction(guild, 'UNTIMEOUT', {
            user:      member.user,
            moderator: moderator,
            reason,
        });
    }

    static async warn(guild, member, moderator, reason) {
        const { WarningRepository } = require('../repositories/WarningRepository');
        const warning = await WarningRepository.add(guild.id, member.id, moderator.id, reason);
        const count   = await WarningRepository.count(guild.id, member.id);

        await ModerationLogRepository.add({
            guildId:     guild.id,
            userId:      member.id,
            moderatorId: moderator.id,
            action:      'WARN',
            reason,
        });

        await LoggingService.logAction(guild, 'WARN', {
            user:      member.user,
            moderator: moderator,
            reason,
            extra:     { 'Total Warnings': count },
        });

        return { warning, count };
    }
}

function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);

    if (d > 0) return `${d}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

module.exports = { ModerationService, formatDuration };
