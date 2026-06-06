'use strict';

const { PermissionsBitField, OverwriteType } = require('discord.js');
const { VerificationRepository }             = require('../repositories/VerificationRepository');
const { LoggingService }                     = require('./LoggingService');
const { makeLogger }                         = require('../utils/logger');

const log = makeLogger('VerificationService');

class VerificationService {
    /**
     * Run the full verify flow for a guild member.
     * Returns { ok: boolean, reason?: string }
     */
    static async verify(guild, member) {
        const settings = await VerificationRepository.get(guild.id);
        if (!settings?.enabled) return { ok: false, reason: 'Verification is not enabled in this server.' };

        const alreadyVerified = await VerificationRepository.isVerified(guild.id, member.id);
        if (alreadyVerified && settings.role_id && member.roles.cache.has(settings.role_id)) {
            return { ok: false, reason: 'You are already verified.' };
        }

        try {
            if (settings.role_id) {
                await member.roles.add(settings.role_id, 'Verification');
            }
            if (settings.unverified_role_id && member.roles.cache.has(settings.unverified_role_id)) {
                await member.roles.remove(settings.unverified_role_id, 'Verification');
            }
        } catch (err) {
            log.error(`Role assignment failed for ${member.id}:`, err.message);
            return { ok: false, reason: 'Failed to assign roles. Check my permissions and role hierarchy.' };
        }

        await VerificationRepository.logVerification(guild.id, member.id, settings.method);

        await LoggingService.logAction(guild, 'VERIFY', {
            user:   member.user,
            extra:  { Method: settings.method },
        });

        return { ok: true };
    }

    /**
     * Sync permissions on all protected category channels.
     * Denies @everyone, allows verified role.
     */
    static async syncCategoryPermissions(guild, settings) {
        if (!settings.protected_categories?.length || !settings.role_id) return;

        const everyoneId = guild.roles.everyone.id;

        for (const categoryId of settings.protected_categories) {
            const category = guild.channels.cache.get(categoryId);
            if (!category) continue;

            try {
                await category.permissionOverwrites.edit(everyoneId, {
                    ViewChannel: false,
                });
                await category.permissionOverwrites.edit(settings.role_id, {
                    ViewChannel: true,
                });

                for (const child of category.children.cache.values()) {
                    await child.permissionOverwrites.edit(everyoneId, {
                        ViewChannel: false,
                    }).catch(() => {});
                    await child.permissionOverwrites.edit(settings.role_id, {
                        ViewChannel: true,
                    }).catch(() => {});
                }
            } catch (err) {
                log.error(`Permission sync failed for category ${categoryId}:`, err.message);
            }
        }

        log.info(`Synced permissions for ${settings.protected_categories.length} categories in ${guild.id}`);
    }
}

module.exports = { VerificationService };
