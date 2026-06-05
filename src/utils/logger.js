/**
 * Structured logger for OpenEmbedded Bot.
 * Prefixes every message with a timestamp and namespace tag.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.BOT_LOG_LEVEL] ?? LEVELS.info;

function ts() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function makeLogger(ns) {
    const tag = `[${ns}]`;
    return {
        debug: (...a) => MIN_LEVEL <= LEVELS.debug && console.debug(`${ts()} ${tag}`, ...a),
        info:  (...a) => MIN_LEVEL <= LEVELS.info  && console.log  (`${ts()} ${tag}`, ...a),
        warn:  (...a) => MIN_LEVEL <= LEVELS.warn  && console.warn (`${ts()} ${tag}`, ...a),
        error: (...a) => MIN_LEVEL <= LEVELS.error && console.error(`${ts()} ${tag}`, ...a),
    };
}

module.exports = { makeLogger };
