const crypto = require('crypto');

class SessionManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.id = crypto.randomBytes(3).toString('hex').toUpperCase();
        this.controllerId = null;
        return this.id;
    }

    attachController(socketId) {
        if (this.controllerId && this.controllerId !== socketId) return false;
        this.controllerId = socketId;
        return true;
    }

    detachController(socketId) {
        if (this.controllerId === socketId) this.controllerId = null;
    }

    isController(socketId) {
        return this.controllerId === socketId;
    }

    hasController() {
        return Boolean(this.controllerId);
    }
}

module.exports = { SessionManager };
