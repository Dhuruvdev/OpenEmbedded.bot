'use strict';

const { execSync } = require('child_process');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../config/constants');

// Blocked command patterns — prevent catastrophic operations
const BLOCKED = [/rm\s+-rf?\s+\//, /:\(\)\{.*\}/, /mkfs/, /dd\s+if=/, />\s*\/dev\/(sd|hd|nvm)/];

module.exports = {
    name:        'exec',
    aliases:     ['sh', 'shell', 'run'],
    description: 'Run a shell command on the host (use with caution)',

    async execute(message, args, client) {
        const cmd = args.join(' ');
        if (!cmd) return message.reply('❌ Provide a shell command.');

        for (const pattern of BLOCKED) {
            if (pattern.test(cmd)) {
                return message.reply('❌ That command pattern is blocked for safety.');
            }
        }

        let output = '';
        let ok     = true;
        const start = Date.now();

        try {
            output = execSync(cmd, { timeout: 15_000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        } catch (err) {
            output = err.stderr ?? err.stdout ?? err.message;
            ok     = false;
        }

        const elapsed = Date.now() - start;
        if (!output || !output.trim()) output = '(no output)';
        if (output.length > 1800) output = output.slice(0, 1800) + '\n…(truncated)';

        const embed = new EmbedBuilder()
            .setColor(ok ? COLORS.SUCCESS : COLORS.ERROR)
            .setTitle(ok ? '✅ Shell Output' : '❌ Shell Error')
            .addFields(
                { name: 'Command', value: `\`\`\`sh\n${cmd.slice(0, 256)}\n\`\`\`` },
                { name: 'Output',  value: `\`\`\`\n${output}\n\`\`\`` },
            )
            .setFooter({ text: `${elapsed}ms` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },
};
