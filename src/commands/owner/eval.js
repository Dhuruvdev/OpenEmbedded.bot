'use strict';

const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../config/constants');

module.exports = {
    name:        'eval',
    aliases:     ['ev'],
    description: 'Execute JavaScript code in the bot context',

    async execute(message, args, client) {
        const code = args.join(' ');
        if (!code) return message.reply('❌ Provide code to evaluate.');

        const wrap = code.includes('await') ? `(async () => { ${code} })()` : code;

        let result;
        let ok = true;
        const start = Date.now();

        try {
            result = await eval(wrap); // eslint-disable-line no-eval
        } catch (err) {
            result = err;
            ok = false;
        }

        const elapsed = Date.now() - start;
        let output = String(result);

        // Mask token
        const token = process.env.DISCORD_BOT_TOKEN ?? '';
        if (token) output = output.replaceAll(token, '[TOKEN]');

        // Truncate
        if (output.length > 1800) output = output.slice(0, 1800) + '\n…(truncated)';

        const embed = new EmbedBuilder()
            .setColor(ok ? COLORS.SUCCESS : COLORS.ERROR)
            .setTitle(ok ? '✅ Eval Result' : '❌ Eval Error')
            .addFields(
                { name: 'Input',  value: `\`\`\`js\n${code.slice(0, 512)}\n\`\`\`` },
                { name: 'Output', value: `\`\`\`js\n${output}\n\`\`\`` },
            )
            .setFooter({ text: `${elapsed}ms  •  ${typeof result}` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },
};
