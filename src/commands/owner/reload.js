'use strict';

const path = require('path');
const fs   = require('fs');

module.exports = {
    name:        'reload',
    aliases:     ['rl'],
    description: 'Reload a slash command from disk without restarting',

    async execute(message, args, client) {
        const name = args[0]?.toLowerCase();
        if (!name) return message.reply('❌ Usage: `>>reload <commandname>`');

        const existing = client.commands.get(name);

        // Search command files recursively
        const cmdDir = path.join(__dirname, '..', '..', 'commands');
        let found = null;

        function walk(dir) {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (entry.name === `${name}.js`) { found = full; return; }
            }
        }
        walk(cmdDir);

        if (!found) {
            return message.reply(`❌ Could not find file for command \`${name}\`.`);
        }

        try {
            delete require.cache[require.resolve(found)];
            const cmd = require(found);

            if (!cmd?.data || !cmd?.execute) {
                return message.reply(`❌ File found but missing \`data\` or \`execute\` export.`);
            }

            client.commands.set(cmd.data.name, cmd);
            await message.reply(`✅ Reloaded \`/${cmd.data.name}\` from disk.`);
        } catch (err) {
            await message.reply(`❌ Reload failed: \`${err.message}\``);
        }
    },
};
