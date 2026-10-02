class SocketManager {
    constructor(io, session) {
        this.io = io;
        this.session = session;
        this.host = null;
        this.controller = null;
    }

    setHost(socket) {
        if (this.host && this.host.id !== socket.id) {
            try { this.host.disconnect(true); } catch (_) {}
        }
        this.host = socket;
        socket.join('host_room');
    }

    setController(socket) {
        this.controller = socket;
        socket.join('controller_room');
    }

    emitHost(event, data) {
        if (this.host && this.host.connected) this.host.emit(event, data);
    }

    emitController(event, data) {
        if (this.controller && this.controller.connected) this.controller.emit(event, data);
    }

    clearController() {
        this.controller = null;
        this.session.controllerId = null;
    }

    disconnectController(reason = 'Game over') {
        if (!this.controller) return;
        this.controller.emit('force_disconnect', { reason });
        this.controller.disconnect(true);
        this.clearController();
    }
}

module.exports = { SocketManager };
