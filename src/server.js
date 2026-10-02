const express = require('express');
const http = require('http');
const dgram = require('dgram');
const os = require('os');
const path = require('path');
const { Server } = require('socket.io');
const qrcode = require('qrcode');

const { GameManager } = require('./logic/GameManager');
const { CommandInterpreter } = require('./interpreter/CommandInterpreter');
const { SessionManager } = require('./server/sessionManager');
const { SocketManager } = require('./server/socketManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = Number(process.env.PORT || 3000);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/canvas/GameRenderer.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'GameRenderer.js'));
});

// Short, QR-friendly controller route. Keeping the route short makes the QR
// easier for phone cameras to recognize and also tolerates scanners that hide
// the .html filename in their preview.
app.get('/controller', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

function listIPv4Addresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const [name, items] of Object.entries(interfaces)) {
        for (const item of items || []) {
            if (item.family === 'IPv4' && !item.internal && item.address) {
                addresses.push({ name, address: item.address });
            }
        }
    }
    return addresses;
}

function detectDefaultRouteIP() {
    return new Promise(resolve => {
        const socket = dgram.createSocket('udp4');
        const finish = value => {
            try { socket.close(); } catch (_) {}
            resolve(value || null);
        };
        socket.once('error', () => finish(null));
        try {
            socket.connect(53, '8.8.8.8', () => finish(socket.address().address));
        } catch (_) {
            finish(null);
        }
    });
}

function chooseLANAddress(preferred) {
    const candidates = listIPv4Addresses();
    const nonLinkLocal = candidates.filter(x => !x.address.startsWith('169.254.'));
    if (preferred && nonLinkLocal.some(x => x.address === preferred)) return preferred;
    const scored = nonLinkLocal.map(item => {
        let score = 0;
        if (/wi-?fi|wireless|wlan/i.test(item.name)) score += 100;
        if (/ethernet/i.test(item.name)) score += 80;
        if (/vmware|virtual|hyper-v|vbox|docker|wsl/i.test(item.name)) score -= 100;
        if (item.address.startsWith('192.168.')) score += 20;
        if (item.address.startsWith('10.')) score += 15;
        return { ...item, score };
    }).sort((a, b) => b.score - a.score);
    return scored[0]?.address || '127.0.0.1';
}

const session = new SessionManager();
const sockets = new SocketManager(io, session);
const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
const interpreter = new CommandInterpreter();
let lanIP = '127.0.0.1';
let finishing = false;
let countdownToken = 0;

function controllerUrl() {
    return `http://${lanIP}:${PORT}/controller?session=${encodeURIComponent(session.id)}`;
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true, session: session.id, controllerConnected: session.hasController() });
});

app.get('/api/session', (req, res) => {
    res.json({ session: session.id, url: controllerUrl(), controllerConnected: session.hasController() });
});

app.get('/api/qr', async (req, res) => {
    try {
        const url = controllerUrl();
        const png = await qrcode.toDataURL(url, {
            errorCorrectionLevel: 'M',
            margin: 3,
            width: 480,
            color: { dark: '#071117', light: '#ffffff' }
        });
        res.json({ ok: true, qr: png, url, session: session.id });
    } catch (error) {
        console.error('QR generation failed:', error);
        res.status(500).json({ ok: false, error: 'QR generation failed', url: controllerUrl(), session: session.id });
    }
});

io.on('connection', socket => {
    socket.on('register_role', rolePayload => {
        const role = typeof rolePayload === 'string' ? rolePayload : rolePayload?.role;
        if (role === 'host') {
            sockets.setHost(socket);
            sockets.emitHost('session_info', { session: session.id, url: controllerUrl() });
            sockets.emitHost('game_state', game.getState());
            return;
        }

        if (role !== 'controller') return;

        const requestedSession = String(
            (typeof rolePayload === 'object' && rolePayload?.session) || socket.handshake.query.session || session.id
        ).trim().toUpperCase();
        if (requestedSession !== session.id) {
            socket.emit('invalid_session');
            return;
        }

        if (!session.attachController(socket.id)) {
            socket.emit('game_full');
            return;
        }

        sockets.setController(socket);
        game.reset();
        game.state.phase = 'READY';
        game.state.message = 'PLAYER LINKED';
        const token = ++countdownToken;
        sockets.emitController('player_linked', game.getState());
        sockets.emitHost('player_connected', game.getState());
        sockets.emitHost('game_state', game.getState());

        (async () => {
            for (const value of [3, 2, 1]) {
                await new Promise(resolve => setTimeout(resolve, 700));
                if (token !== countdownToken || !session.isController(socket.id) || finishing) return;
                sockets.emitHost('countdown', { value });
                sockets.emitController('countdown', { value });
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            if (token !== countdownToken || !session.isController(socket.id) || finishing) return;
            game.start();
            sockets.emitHost('countdown', { value: 'GO' });
            sockets.emitController('countdown', { value: 'GO' });
            sockets.emitController('game_started', game.getState());
            sockets.emitHost('game_state', game.getState());
        })();
    });

    socket.on('controller_command', payload => {
        if (!session.isController(socket.id) || finishing) return;
        try {
            if (payload?.action !== 'EXEC') {
                const command = interpreter.normalize(payload?.action, payload?.value ?? payload?.val ?? payload);
                sockets.emitController('command_ack', command);
                return;
            }

            const queue = interpreter.queue(payload);
            if (queue.length === 0) {
                sockets.emitController('command_error', { error: 'Command queue is empty' });
                return;
            }

            const result = game.executeQueue(queue);
            sockets.emitHost('game_execution', result);
            sockets.emitController('execution_result', {
                ok: result.ok,
                state: result.state,
                events: result.events
            });

            if (result.state.phase === 'WON') finishGame('MISSION COMPLETE');
        } catch (error) {
            sockets.emitController('command_error', { error: error.message });
        }
    });

    socket.on('disconnect', () => {
        if (!session.isController(socket.id)) return;
        countdownToken += 1;
        session.detachController(socket.id);
        sockets.clearController();
        if (!finishing && game.getState().phase === 'PLAYING') game.reset();
        sockets.emitHost('player_disconnected');
        sockets.emitHost('game_state', game.getState());
    });
});

function finishGame(reason) {
    if (finishing) return;
    finishing = true;
    const finalState = game.getState();
    sockets.emitController('force_disconnect', { reason });
    if (sockets.controller) sockets.controller.disconnect(true);
    sockets.clearController();
    sockets.emitHost('game_over', { reason, state: finalState });

    setTimeout(() => {
        countdownToken += 1;
        session.reset();
        game.reset();
        finishing = false;
        sockets.emitHost('reset_to_qr', { session: session.id, url: controllerUrl() });
    }, 2500);
}

setInterval(() => {
    if (finishing) return;
    const state = game.tick(1);
    if (state.phase === 'LOST') {
        finishGame('TIME UP');
        return;
    }
    if (state.phase === 'PLAYING') {
        sockets.emitHost('timer_tick', { timeLeft: state.timeLeft });
        sockets.emitController('timer_tick', { timeLeft: state.timeLeft });
    }
}, 1000);

(async () => {
    const routeIP = await detectDefaultRouteIP();
    lanIP = chooseLANAddress(routeIP);
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`IEEE RAS Robot Run: http://localhost:${PORT}`);
        console.log(`Controller: ${controllerUrl()}`);
        const all = listIPv4Addresses().map(x => `${x.name}: ${x.address}`);
        if (all.length) console.log(`Network interfaces:\n  ${all.join('\n  ')}`);
        if (lanIP === '127.0.0.1') console.log('WARNING: No LAN IPv4 address was detected. Phone connection will require the laptop IP to be entered manually.');
    });
})();
