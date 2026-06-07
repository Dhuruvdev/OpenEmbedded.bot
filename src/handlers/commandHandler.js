'use strict';

const path = require('path');
const fs   = require('fs');
const { makeLogger } = require('../utils/logger');
const log = makeLogger('CommandHandler');

async function loadCommands(client) {
    const cmdDir = path.join(__dirname, '..', 'commands');
    let loaded = 0;

    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'owner') continue; // owner commands are message-based, not slash
                walk(full);
            } else if (entry.name.endsWith('.js')) {
                try {
                    const cmd = require(full);
                    if (!cmd?.data || !cmd?.execute) {
                        log.warn(`Skipping ${entry.name} — missing data or execute`);
                        continue;
                    }
                    client.commands.set(cmd.data.name, cmd);
                    loaded++;
                    log.debug(`Loaded command: /${cmd.data.name}`);
                } catch (err) {
                    log.error(`Failed to load ${full}:`, err.message);
                }
            }
        }
    }

    walk(cmdDir);
    log.info(`Loaded ${loaded} commands`);
}

module.exports = { loadCommands };
