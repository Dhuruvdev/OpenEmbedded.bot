'use strict';

const { ActivityType } = require('discord.js');

const ACTIVITY_MAP = {
    playing:    ActivityType.Playing,
    watching:   ActivityType.Watching,
    listening:  ActivityType.Listening,
    competing:  ActivityType.Competing,
    streaming:  ActivityType.Streaming,
};

const STATUS_LIST = ['online', 'idle', 'dnd', 'invisible'];

module.exports = {
    name:        'setstatus',
    aliases:     ['status', 'presence'],
    description: 'Change the bot\'s presence  —  usage: >>setstatus [status] [type] <text>',

    async execute(message, args, client) {
        if (args.length === 0) {
            return message.reply(
                '❌ Usage: `>>setstatus [online|idle|dnd|invisible] [playing|watching|listening|competing] <text>`\n' +
                'Example: `>>setstatus online watching 3 servers`'
            );
        }

        let status = 'online';
        let activityType = ActivityType.Watching;
        let text = args.join(' ');

        // Parse optional status  (first word)
        if (STATUS_LIST.includes(args[0]?.toLowerCase())) {
            status = args.shift().toLowerCase();
            text   = args.join(' ');
        }

        // Parse optional activity type (now-first word)
        if (args[0] && ACTIVITY_MAP[args[0]?.toLowerCase()]) {
            activityType = ACTIVITY_MAP[args.shift().toLowerCase()];
            text         = args.join(' ');
        }

        if (!text) return message.reply('❌ Provide the status text.');

        client.user.setPresence({
            status,
            activities: [{ name: text, type: activityType }],
        });

        const typeName = Object.keys(ACTIVITY_MAP).find(k => ACTIVITY_MAP[k] === activityType) ?? 'watching';
        await message.reply(`✅ Status set: **${status}** | ${typeName} **${text}**`);
    },
};
