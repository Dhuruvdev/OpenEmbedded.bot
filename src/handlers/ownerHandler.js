'use strict';

const path = require('path');
const fs   = require('fs');
const { OWNER_ID, OWNER_PREFIX, COLORS, EMOJIS } = require('../config/constants');
const { makeLogger } = require('../utils/logger');

const log = makeLogger('OwnerCmds');

const ownerCommands = new Map();

function loadOwnerCommands() {
    const dir = path.join(__dirname, '..', 'commands', 'owner');
    if (!fs.existsSync(dir)) return;

    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
        try {
            const cmd = require(path.join(dir, file));
            if (cmd?.name && cmd?.execute) {
                ownerCommands.set(cmd.name.toLowerCase(), cmd);
                for (const alias of cmd.aliases ?? []) {
                    ownerCommands.set(alias.toLowerCase(), cmd);
                }
                log.debug(`Loaded owner command: ${cmd.name}`);
            }
        } catch (err) {
            log.error(`Failed to load owner command ${file}:`, err.message);
        }
    }
    log.info(`Loaded ${ownerCommands.size} owner command(s)`);
}

async function handleOwnerMessage(message, client) {
    if (!OWNER_ID) return false;
    if (message.author.id !== OWNER_ID) return false;
    if (!message.content.startsWith(OWNER_PREFIX)) return false;

    const raw  = message.content.slice(OWNER_PREFIX.length).trim();
    const args = raw.split(/\s+/);
    const name = args.shift()?.toLowerCase();

    if (!name) return false;

    if (name === 'help' || name === '?') {
        const lines = [...new Set([...ownerCommands.values()].map(c => c.name))]
            .map(n => {
                const c = ownerCommands.get(n);
                return `\`${OWNER_PREFIX}${n}\`${c.aliases?.length ? ` (${c.aliases.map(a => `\`${a}\``).join(', ')})` : ''}  —  ${c.description ?? ''}`;
            }).join('\n');

        const { EmbedBuilder } = require('discord.js');
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.GOLD)
                .setTitle(`${EMOJIS.CROWN} Owner Commands`)
                .setDescription(lines || 'No commands loaded.')
                .setFooter({ text: `Prefix: ${OWNER_PREFIX}` })
            ],
        }).then(() => true);
    }

    const cmd = ownerCommands.get(name);
    if (!cmd) {
        await message.react('❓').catch(() => {});
        return true;
    }

    try {
        log.info(`Owner command: ${OWNER_PREFIX}${name} ${args.join(' ')}`);
        await cmd.execute(message, args, client);
    } catch (err) {
        log.error(`Owner command error [${name}]:`, err.stack ?? err.message);
        await message.reply(`❌ \`${err.message}\``).catch(() => {});
    }
    return true;
}

module.exports = { loadOwnerCommands, handleOwnerMessage };
