'use strict';

const { PermissionsBitField } = require('discord.js');
const { COLORS, EMOJIS }      = require('../config/constants');
const { makeLogger }          = require('../utils/logger');

const log = makeLogger('Permissions');

class PermissionManager {
    /**
     * Check if a member has the required permissions.
     * Returns { ok: true } or { ok: false, reason: string }
     */
    static check(member, required) {
        if (!member) return { ok: false, reason: 'Could not resolve member.' };

        if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return { ok: true };
        }

        const missing = required.filter(p => !member.permissions.has(p));
        if (missing.length > 0) {
            const names = missing.map(p => {
                const entry = Object.entries(PermissionsBitField.Flags).find(([, v]) => v === p);
                return entry ? entry[0] : String(p);
            });
            return { ok: false, reason: `You are missing: **${names.join(', ')}**` };
        }

        return { ok: true };
    }

    /**
     * Check if bot can act on target — enforces role hierarchy.
     * Returns { ok: true } or { ok: false, reason: string }
     */
    static canActOn(executor, target, bot) {
        if (!target) return { ok: false, reason: 'Target member not found.' };

        if (target.id === executor.guild.ownerId) {
            return { ok: false, reason: 'You cannot perform this action on the server owner.' };
        }

        if (bot && target.roles.highest.position >= bot.roles.highest.position) {
            return { ok: false, reason: "My highest role is not above the target member's highest role." };
        }

        if (executor.id !== executor.guild.ownerId) {
            if (target.roles.highest.position >= executor.roles.highest.position) {
                return { ok: false, reason: "Your highest role is not above the target member's highest role." };
            }
        }

        return { ok: true };
    }

    /**
     * Build a standardized permission-denied embed reply.
     */
    static deniedEmbed(reason) {
        const { EmbedBuilder } = require('discord.js');
        return {
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setDescription(`${EMOJIS.ERROR} **Permission Denied**\n${reason}`)
            ],
            flags: 64,
        };
    }

    /**
     * Convenience: reply with permission denied and return false.
     * Usage: if (!await PermissionManager.assert(interaction, [perms], target, bot)) return;
     */
    static async assert(interaction, required = [], target = null, bot = null) {
        const memberCheck = this.check(interaction.member, required);
        if (!memberCheck.ok) {
            await interaction.reply(this.deniedEmbed(memberCheck.reason));
            return false;
        }

        if (target) {
            const botMember = interaction.guild.members.me;
            const targetCheck = this.canActOn(interaction.member, target, botMember);
            if (!targetCheck.ok) {
                await interaction.reply(this.deniedEmbed(targetCheck.reason));
                return false;
            }
        }

        return true;
    }
}

module.exports = { PermissionManager };
