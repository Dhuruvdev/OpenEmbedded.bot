'use strict';

const path = require('path');
const fs   = require('fs');
const { makeLogger } = require('../utils/logger');
const log = makeLogger('EventHandler');

function loadEvents(client) {
    const evDir  = path.join(__dirname, '..', 'events');
    let   loaded = 0;

    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name.endsWith('.js')) {
                try {
                    const event = require(full);
                    if (!event?.name || !event?.execute) {
                        log.warn(`Skipping ${entry.name} — missing name or execute`);
                        continue;
                    }
                    if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args, client));
                    } else {
                        client.on(event.name, (...args) => event.execute(...args, client));
                    }
                    loaded++;
                    log.debug(`Registered event: ${event.name}`);
                } catch (err) {
                    log.error(`Failed to load event ${entry.name}:`, err.message);
                }
            }
        }
    }

    walk(evDir);
    log.info(`Registered ${loaded} events`);
}

module.exports = { loadEvents };
