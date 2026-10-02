const ALLOWED = new Set(['TURN_R','TURN_L','MOVE','MOVE_UP','MOVE_DOWN','MOVE_LEFT','MOVE_RIGHT','GRAB','GRIP','DROP','ADJUST','EXEC']);

class CommandInterpreter {
    normalize(action, value = null) {
        const normalized = String(action || '').trim().toUpperCase();
        const aliases = { RIGHT:'TURN_R', TURN_RIGHT:'TURN_R', LEFT:'TURN_L', TURN_LEFT:'TURN_L', PICKUP:'GRAB', GRIP:'GRAB', UP:'MOVE_UP', DOWN:'MOVE_DOWN', LEFT_MOVE:'MOVE_LEFT', RIGHT_MOVE:'MOVE_RIGHT' };
        const mapped = aliases[normalized] || normalized;
        if (!ALLOWED.has(mapped)) throw new Error(`Unsupported command: ${normalized}`);

        if (mapped === 'MOVE' || mapped.startsWith('MOVE_')) {
            if (value && typeof value === 'object') {
                const distance = Number(value.distance ?? ((value.steps ?? 1) * 50));
                const angle = Number(value.angle ?? 0);
                if (!Number.isFinite(distance) || distance < 1 || distance > 250) throw new Error('MOVE distance must be 1-250px');
                if (!Number.isFinite(angle)) throw new Error('MOVE angle must be numeric');
                return { action: mapped === 'MOVE' ? 'MOVE' : mapped, distance: Math.round(distance), angle: ((angle % 360) + 360) % 360 };
            }
            const steps = Number(value ?? 1);
            if (!Number.isInteger(steps) || steps < 1 || steps > 5) throw new Error('MOVE distance must be 1-5');
            return { action: mapped, steps };
        }
        if (mapped === 'TURN_R' || mapped === 'TURN_L') {
            const degrees = Number(value?.degrees ?? value?.angle ?? value ?? 90);
            if (!Number.isFinite(degrees) || degrees <= 0 || degrees > 360) throw new Error('TURN angle must be 1-360 degrees');
            return { action: mapped, degrees };
        }
        return { action: mapped };
    }

    queue(payload = {}) {
        const list = Array.isArray(payload.queue) ? payload.queue : [];
        if (list.length > 40) throw new Error('Queue is too long');
        return list.map(item => typeof item === 'string' ? this.normalize(item) : this.normalize(item.action, item));
    }
}
module.exports = { CommandInterpreter };
