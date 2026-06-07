'use strict';

module.exports = {
    name:        'shutdown',
    aliases:     ['die', 'stop', 'quit'],
    description: 'Gracefully shut down the bot process',

    async execute(message, args, client) {
        await message.reply('👋 Shutting down…').catch(() => {});
        client.destroy();
        process.exit(0);
    },
};
