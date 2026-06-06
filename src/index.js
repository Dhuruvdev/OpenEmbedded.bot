'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents }   = require('./handlers/eventHandler');
const { initSchema }   = require('./database/schema');
const { makeLogger }   = require('./utils/logger');

const log = makeLogger('Core');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.commands  = new Collection();
client.cooldowns = new Collection();

(async () => {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        log.error('DISCORD_BOT_TOKEN is required. Exiting.');
        process.exit(1);
    }

    log.info('Initializing database schema…');
    await initSchema();

    log.info('Loading commands…');
    await loadCommands(client);

    log.info('Loading events…');
    loadEvents(client);

    log.info('Connecting to Discord…');
    await client.login(token);
})();

process.on('uncaughtException',   err    => makeLogger('Process').error('Uncaught exception:', err.stack));
process.on('unhandledRejection',  reason => makeLogger('Process').error('Unhandled rejection:', reason?.stack ?? reason));
process.on('SIGTERM', () => { makeLogger('Process').info('SIGTERM — shutting down'); process.exit(0); });
process.on('SIGINT',  () => { makeLogger('Process').info('SIGINT — shutting down');  process.exit(0); });
