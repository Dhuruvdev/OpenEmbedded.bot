'use strict';

module.exports = {
    name:        'leave',
    aliases:     ['leaveserver'],
    description: 'Make the bot leave a guild  —  >>leave [guildId]  (defaults to current guild)',

    async execute(message, args, client) {
        const guildId = args[0] ?? message.guild?.id;
        if (!guildId) return message.reply('❌ Provide a guild ID or run in a server.');

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return message.reply(`❌ Not in guild \`${guildId}\`.`);

        const name = guild.name;
        await guild.leave();
        await message.reply(`✅ Left **${name}** (\`${guildId}\`).`).catch(() => {});
    },
};
