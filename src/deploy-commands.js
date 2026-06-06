'use strict';

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const path = require('path');
const fs   = require('fs');

const token  = process.env.DISCORD_BOT_TOKEN;
const appId  = process.env.DISCORD_CLIENT_ID;

if (!token || !appId) {
    console.error('DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required.');
    process.exit(1);
}

const commands = [];

function loadCommands(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            loadCommands(full);
        } else if (entry.name.endsWith('.js')) {
            const cmd = require(full);
            if (cmd?.data?.toJSON) {
                commands.push(cmd.data.toJSON());
                console.log(`  Loaded: /${cmd.data.name}`);
            }
        }
    }
}

const cmdDir = path.join(__dirname, 'commands');
loadCommands(cmdDir);

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    console.log(`\nDeploying ${commands.length} slash commands globally…`);
    try {
        await rest.put(Routes.applicationCommands(appId), { body: commands });
        console.log(`\n✓ Successfully deployed ${commands.length} slash commands.`);
    } catch (err) {
        console.error('Deployment failed:', err);
        process.exit(1);
    }
})();
