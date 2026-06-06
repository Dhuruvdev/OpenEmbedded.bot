'use strict';

const path = require('path');
const fs   = require('fs');
const { makeLogger } = require('../utils/logger');
const log = makeLogger('EventHandler');

function loadEvents(client) {
    const evDir = path.join(__dirname, '..', 'events');
    const files = fs.readdirSync(evDir).filter(f => f.endsWith('.js'));
    let loaded = 0;

    for (const file of files) {
        try {
            const event = require(path.join(evDir, file));
            if (!event?.name || !event?.execute) {
                log.warn(`Skipping ${file} — missing name or execute`);
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
            log.error(`Failed to load event ${file}:`, err.message);
        }
    }

    log.info(`Registered ${loaded} events`);
}

module.exports = { loadEvents };
