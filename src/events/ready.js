'use strict';

const { ActivityType } = require('discord.js');
const { makeLogger }   = require('../utils/logger');
const log = makeLogger('Ready');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        log.info(`Logged in as ${client.user.tag} (${client.user.id})`);
        log.info(`Serving ${client.guilds.cache.size} guild(s) | ${client.users.cache.size} cached user(s)`);

        client.user.setPresence({
            activities: [{
                name:  `${client.guilds.cache.size} servers`,
                type:  ActivityType.Watching,
            }],
            status: 'online',
        });

        const { REST, Routes } = require('discord.js');
        const path = require('path');
        const fs   = require('fs');

        const token = process.env.DISCORD_BOT_TOKEN;
        const appId = process.env.DISCORD_CLIENT_ID;
        if (!token || !appId) {
            log.warn('DISCORD_CLIENT_ID not set — skipping global command registration');
            return;
        }

        const commands = [];
        function walk(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
                const full = path.join(dir, e.name);
                if (e.isDirectory()) walk(full);
                else if (e.name.endsWith('.js')) {
                    const cmd = require(full);
                    if (cmd?.data?.toJSON) commands.push(cmd.data.toJSON());
                }
            }
        }
        walk(path.join(__dirname, '..', 'commands'));

        try {
            const rest = new REST({ version: '10' }).setToken(token);
            await rest.put(Routes.applicationCommands(appId), { body: commands });
            log.info(`Deployed ${commands.length} slash commands globally`);
        } catch (err) {
            log.error('Command deployment failed:', err.message);
        }
    },
};
