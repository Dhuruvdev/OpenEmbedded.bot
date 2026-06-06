'use strict';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[(process.env.BOT_LOG_LEVEL ?? 'info').toLowerCase()] ?? 1;

function ts() {
    return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function makeLogger(ns) {
    const tag = `[${ns}]`.padEnd(18);
    return {
        debug: (...a) => MIN_LEVEL <= 0 && console.debug(`${ts()} DEBUG ${tag}`, ...a),
        info:  (...a) => MIN_LEVEL <= 1 && console.log  (`${ts()} INFO  ${tag}`, ...a),
        warn:  (...a) => MIN_LEVEL <= 2 && console.warn (`${ts()} WARN  ${tag}`, ...a),
        error: (...a) => MIN_LEVEL <= 3 && console.error(`${ts()} ERROR ${tag}`, ...a),
    };
}

module.exports = { makeLogger };
