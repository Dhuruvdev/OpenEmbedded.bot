'use strict';

const { makeLogger } = require('../utils/logger');
const log = makeLogger('Database');

let _sql = null;

function getDb() {
    if (_sql) return _sql;

    const url = process.env.DATABASE_URL;
    if (!url) {
        log.warn('DATABASE_URL not set — running without database');
        return null;
    }

    try {
        const postgres = require('postgres');
        _sql = postgres(url, {
            max:             10,
            idle_timeout:    30,
            connect_timeout: 15,
            onnotice:        () => {},
        });
        log.info('Connection pool created');
        return _sql;
    } catch (err) {
        log.error('Failed to create connection pool:', err.message);
        return null;
    }
}

async function pingDb() {
    const sql = getDb();
    if (!sql) return { ok: false, latencyMs: 0, error: 'DATABASE_URL not set' };
    const start = Date.now();
    try {
        await sql`SELECT 1`;
        return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
        return { ok: false, latencyMs: Date.now() - start, error: err.message };
    }
}

module.exports = { getDb, pingDb };
