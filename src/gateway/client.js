/**
 * discord-bot/src/gateway/client.js
 *
 * Discord Gateway WebSocket client for OpenEmbedded Bot.
 * Manages the persistent bot connection, heartbeats, resume,
 * OP 3 presence updates, and INTERACTION_CREATE dispatch.
 *
 * Usage
 * ─────
 *   const { BotClient } = require('discord-bot');
 *
 *   const bot = new BotClient();
 *   bot.on('ready',       user  => console.log('Bot ready:', user.username));
 *   bot.on('interaction', data  => handleInteraction(data));
 *   bot.on('error',       err   => console.error(err));
 *   bot.connect(process.env.DISCORD_BOT_TOKEN);
 */

const EventEmitter  = require('events');
const { WebSocket } = require('ws');
const { makeLogger } = require('../utils/logger');

const log = makeLogger('Gateway');

const GATEWAY_URL   = 'wss://gateway.discord.gg/?v=10&encoding=json';
const GUILDS_INTENT = 1 << 0;   // GUILDS intent (non-privileged)

class BotClient extends EventEmitter {
    constructor() {
        super();

        this._ws               = null;
        this._token            = null;
        this._sequence         = null;
        this._sessionId        = null;
        this._resumeUrl        = null;
        this._heartbeatTimer   = null;
        this._jitterTimer      = null;
        this._reconnectTimer   = null;
        this._reconnectCount   = 0;
        this._heartbeatAck     = true;

        /** Publicly accessible state */
        this.status  = 'disconnected';  // 'connecting' | 'connected' | 'error' | 'disconnected'
        this.error   = null;
        this.botUser = null;
        this.guilds  = [];
        this.userId  = null;

        /** button/select → action mappings (set by backend) */
        this._buttonActions = {};
    }

    // ── Public API ────────────────────────────────────────────────────────────

    connect(token, gatewayUrl = GATEWAY_URL) {
        if (this._ws) { this._ws.removeAllListeners(); this._ws.terminate(); this._ws = null; }
        this._cleanup();

        this._token  = token;
        this.status  = 'connecting';
        this.error   = null;

        log.info(`Connecting to ${gatewayUrl}`);
        this._ws = new WebSocket(gatewayUrl);

        this._ws.on('open',    ()       => log.info('WebSocket open'));
        this._ws.on('message', raw      => this._onMessage(raw));
        this._ws.on('close',   (c, r)   => this._onClose(c, r));
        this._ws.on('error',   err      => { log.error('WebSocket error:', err.message); this.emit('error', err); });
    }

    disconnect() {
        if (this._ws) { this._ws.removeAllListeners(); this._ws.terminate(); this._ws = null; }
        this._cleanup();
        this._token          = null;
        this._sequence       = null;
        this._sessionId      = null;
        this._resumeUrl      = null;
        this._reconnectCount = 0;
        this.status          = 'disconnected';
        this.error           = null;
        this.botUser         = null;
        this.guilds          = [];
        this.userId          = null;
        log.info('Disconnected');
    }

    /**
     * Update the bot's Gateway presence (OP 3).
     * Shows on the bot's own Discord profile in servers.
     * @param {object|null} activity — pass null to clear
     */
    updatePresence(activity = null) {
        this._send({
            op: 3,
            d: {
                since:      null,
                activities: activity ? [activity] : [],
                status:     'online',
                afk:        false,
            },
        });
        log.info(`Presence updated: ${activity ? activity.name : '(cleared)'}`);
    }

    setButtonActions(actions) { this._buttonActions = actions || {}; }
    getButtonActions()        { return this._buttonActions; }

    getStatus() {
        return {
            status:  this.status,
            error:   this.error,
            botUser: this.botUser,
            guilds:  this.guilds,
            hasToken: !!this._token,
        };
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    _send(data) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(data));
        }
    }

    _cleanup() {
        if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null; }
        if (this._jitterTimer)    { clearTimeout(this._jitterTimer);     this._jitterTimer = null; }
        if (this._reconnectTimer) { clearTimeout(this._reconnectTimer);  this._reconnectTimer = null; }
    }

    _startHeartbeat(interval) {
        this._jitterTimer = setTimeout(() => {
            this._jitterTimer = null;
            this._send({ op: 1, d: this._sequence });
            this._heartbeatAck = false;

            this._heartbeatTimer = setInterval(() => {
                if (!this._heartbeatAck) {
                    log.warn('Missed heartbeat ACK — reconnecting…');
                    this._reconnect();
                    return;
                }
                this._heartbeatAck = false;
                this._send({ op: 1, d: this._sequence });
            }, interval);
        }, interval * Math.random());
    }

    _reconnect() {
        if (this._ws) { this._ws.removeAllListeners(); this._ws.terminate(); this._ws = null; }
        this._cleanup();
        if (!this._token) return;

        const url   = this._resumeUrl || GATEWAY_URL;
        const delay = Math.min(1000 * Math.pow(2, this._reconnectCount), 30_000) + Math.random() * 1000;
        this._reconnectCount = Math.min(this._reconnectCount + 1, 8);
        this.status = 'connecting';

        log.info(`Reconnecting in ${Math.round(delay)}ms (attempt ${this._reconnectCount})…`);
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            this.connect(this._token, url);
        }, delay);
    }

    _onMessage(raw) {
        let payload;
        try { payload = JSON.parse(raw.toString()); } catch { return; }

        const { op, d, s, t } = payload;
        if (s != null) this._sequence = s;

        switch (op) {
            case 10: {
                this._startHeartbeat(d.heartbeat_interval);
                if (this._sessionId && this._resumeUrl) {
                    log.info('Resuming session…');
                    this._send({ op: 6, d: { token: `Bot ${this._token}`, session_id: this._sessionId, seq: this._sequence } });
                } else {
                    log.info('Identifying…');
                    this._send({
                        op: 2,
                        d: {
                            token:      `Bot ${this._token}`,
                            intents:    GUILDS_INTENT,
                            properties: { os: 'linux', browser: 'discord.builders', device: 'discord.builders' },
                            presence:   { since: null, activities: [], status: 'online', afk: false },
                        },
                    });
                }
                break;
            }
            case 11:
                this._heartbeatAck = true;
                break;

            case 1:
                this._send({ op: 1, d: this._sequence });
                break;

            case 0:
                if (t === 'READY') {
                    this._sessionId      = d.session_id;
                    this._resumeUrl      = d.resume_gateway_url;
                    this.userId          = d.user?.id ?? null;
                    this.botUser         = d.user ? {
                        id:            d.user.id,
                        username:      d.user.username,
                        discriminator: d.user.discriminator,
                        avatar:        d.user.avatar,
                        bot:           true,
                    } : null;
                    this.status          = 'connected';
                    this._reconnectCount = 0;
                    log.info(`Ready! Bot: ${d.user?.username}#${d.user?.discriminator}`);

                    // Set bot's own profile presence (not user presence)
                    this.updatePresence({
                        type: 0,
                        name: 'OpenEmbedded',
                        url:  'https://discord.builders',
                    });
                    this.emit('ready', this.botUser);
                }
                if (t === 'RESUMED') {
                    this.status          = 'connected';
                    this._reconnectCount = 0;
                    log.info('Session resumed');
                    this.emit('resumed');
                }
                if (t === 'INTERACTION_CREATE') {
                    this.emit('interaction', d);
                }
                break;

            case 7:
                log.info('Discord requested reconnect');
                this._reconnect();
                break;

            case 9: {
                log.info(`Invalid session (resumable=${d})`);
                if (!d) { this._sessionId = null; this._resumeUrl = null; }
                const url = d ? (this._resumeUrl || GATEWAY_URL) : GATEWAY_URL;
                setTimeout(() => this.connect(this._token, url), 1000 + Math.random() * 4000);
                break;
            }
        }
    }

    _onClose(code, reason) {
        this._cleanup();
        log.info(`Closed — code ${code}: ${reason}`);

        const FATAL = {
            4004: 'Authentication failed — check DISCORD_BOT_TOKEN.',
            4014: 'Disallowed intents — enable privileged intents in the Developer Portal.',
            4013: 'Invalid intents.',
            4011: 'Bot requires sharding.',
        };
        if (FATAL[code]) {
            this.status = 'error';
            this.error  = FATAL[code];
            this._token = null;
            log.error(FATAL[code]);
            this.emit('error', new Error(FATAL[code]));
            return;
        }

        if (!this._token) return;
        const NON_RESUMABLE = [4004, 4010, 4011, 4012, 4013, 4014];
        if (NON_RESUMABLE.includes(code)) { this._sessionId = null; this._resumeUrl = null; }
        this._reconnect();
    }
}

module.exports = { BotClient };
