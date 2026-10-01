const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Get local IP for the QR code
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}

const localIP = getLocalIPAddress();
const controllerUrl = `http://${localIP}:${PORT}/controller.html`;

// Game State
let currentSession = null;
let currentControllerSocket = null;

// Endpoint for laptop to get the QR code
app.get('/api/qr', async (req, res) => {
    try {
        const qrImage = await qrcode.toDataURL(controllerUrl);
        res.json({ qr: qrImage, url: controllerUrl });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Identify if socket is laptop (host) or phone (controller)
    socket.on('register_role', (role) => {
        if (role === 'host') {
            socket.join('host_room');
            console.log('Host registered');
        } else if (role === 'controller') {
            if (currentControllerSocket) {
                // Already have a player, reject new connection
                socket.emit('game_full');
                return;
            }
            currentControllerSocket = socket;
            socket.join('controller_room');
            console.log('Controller registered');
            
            // Tell host that a player connected, start the game
            io.to('host_room').emit('player_connected');
        }
    });

    // Receive commands from the mobile controller
    socket.on('controller_command', (cmdData) => {
        if (socket === currentControllerSocket) {
            // Forward command to the laptop host
            io.to('host_room').emit('game_command', cmdData);
        }
    });

    // Receive game over from the laptop host
    socket.on('game_over', () => {
        console.log('Game over triggered');
        // Disconnect the current controller so the next person can scan and play
        if (currentControllerSocket) {
            currentControllerSocket.emit('force_disconnect', { reason: 'Game Over' });
            currentControllerSocket.disconnect(true);
            currentControllerSocket = null;
        }
        
        // Notify host that it's ready for the next player (QR state)
        io.to('host_room').emit('reset_to_qr');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket === currentControllerSocket) {
            currentControllerSocket = null;
            io.to('host_room').emit('player_disconnected');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
    console.log(`Controller URL: ${controllerUrl}`);
});
