'use strict';

const { WelcomeService } = require('../services/WelcomeService');
const { makeLogger }     = require('../utils/logger');
const log = makeLogger('MemberAdd');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member) {
        log.info(`${member.user.tag} joined ${member.guild.name}`);
        await WelcomeService.welcome(member).catch(err =>
            log.error('Welcome failed:', err.message)
        );
    },
};
