'use strict';

const { EmbedBuilder }        = require('discord.js');
const { WelcomeRepository }   = require('../repositories/WelcomeRepository');
const { COLORS }              = require('../config/constants');
const { makeLogger }          = require('../utils/logger');

const log = makeLogger('WelcomeService');

class WelcomeService {
    static interpolate(template, member) {
        const guild = member.guild;
        return template
            .replace(/\{user\}/g,        `<@${member.id}>`)
            .replace(/\{username\}/g,     member.user.username)
            .replace(/\{server\}/g,       guild.name)
            .replace(/\{membercount\}/g,  String(guild.memberCount))
            .replace(/\{tag\}/g,          member.user.tag ?? member.user.username);
    }

    static async welcome(member) {
        const settings = await WelcomeRepository.get(member.guild.id);
        if (!settings?.enabled || !settings.channel_id) return;

        const channel = member.guild.channels.cache.get(settings.channel_id);
        if (!channel) return;

        const message = this.interpolate(settings.message, member);

        try {
            if (settings.embed_enabled) {
                const embed = new EmbedBuilder()
                    .setColor(settings.embed_color ?? COLORS.PRIMARY)
                    .setTitle(this.interpolate(settings.embed_title ?? 'Welcome!', member))
                    .setDescription(message)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setTimestamp()
                    .setFooter({ text: `Member #${member.guild.memberCount}` });

                if (settings.embed_image) embed.setImage(settings.embed_image);

                await channel.send({ embeds: [embed] });
            } else {
                await channel.send({ content: message });
            }
        } catch (err) {
            log.error(`Welcome send failed in ${member.guild.id}:`, err.message);
        }

        if (settings.auto_role_id) {
            try {
                await member.roles.add(settings.auto_role_id, 'Welcome auto-role');
            } catch (err) {
                log.error(`Auto-role failed for ${member.id}:`, err.message);
            }
        }

        if (settings.dm_enabled && settings.dm_message) {
            try {
                await member.send({ content: this.interpolate(settings.dm_message, member) });
            } catch {}
        }
    }
}

module.exports = { WelcomeService };
