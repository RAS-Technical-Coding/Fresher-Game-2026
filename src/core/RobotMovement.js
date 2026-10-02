const DIRECTIONS = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
const VECTORS = {
    NORTH: { x: 0, y: -1 }, EAST: { x: 1, y: 0 },
    SOUTH: { x: 0, y: 1 }, WEST: { x: -1, y: 0 }
};
const CARDINAL_ANGLES = { NORTH: 0, EAST: 90, SOUTH: 180, WEST: 270 };

function normalizeAngle(degrees) {
    let value = Number(degrees) || 0;
    value %= 360;
    if (value < 0) value += 360;
    return value;
}

function directionForAngle(angle) {
    const normalized = normalizeAngle(angle);
    const index = Math.round(normalized / 90) % 4;
    return DIRECTIONS[index];
}

class RobotMovement {
    constructor(gridSize = 10, initialState = {}) {
        if (!Number.isInteger(gridSize) || gridSize <= 0) throw new Error('gridSize must be a positive integer');
        this.gridSize = gridSize;
        this.reset(initialState);
    }

    reset(state = {}) {
        const x = state.x ?? 0, y = state.y ?? 0;
        const direction = state.direction ?? 'NORTH';
        const rotation = state.rotation ?? CARDINAL_ANGLES[direction];
        const carrying = state.carrying ?? false;
        this.#validateContinuousPosition(x, y);
        this.#validateDirection(direction);
        this.#validateAngle(rotation);
        this.state = { x, y, direction: directionForAngle(rotation), rotation: normalizeAngle(rotation), carrying };
        return this.getState();
    }

    turnRight(degrees = 90) {
        this.#validateTurn(degrees);
        this.state.rotation = normalizeAngle(this.state.rotation + degrees);
        this.state.direction = directionForAngle(this.state.rotation);
        return this.getState();
    }

    turnLeft(degrees = 90) {
        this.#validateTurn(degrees);
        this.state.rotation = normalizeAngle(this.state.rotation - degrees);
        this.state.direction = directionForAngle(this.state.rotation);
        return this.getState();
    }

    canMove(steps = 1) {
        this.#validateSteps(steps);
        const vector = VECTORS[this.state.direction];
        return this.#isInsideGrid(this.state.x + vector.x * steps, this.state.y + vector.y * steps);
    }

    move(steps = 1) {
        this.#validateSteps(steps);
        const vector = VECTORS[this.state.direction];
        return this.#moveByGridVector(vector.x, vector.y, steps);
    }

    moveAbsolute(direction, steps = 1) {
        this.#validateDirection(direction);
        this.#validateSteps(steps);
        const vector = VECTORS[direction];
        return this.#moveByGridVector(vector.x, vector.y, steps);
    }

    /** MOVE uses the requirement's pixel distance. On the 10x10 arena, 50px = one grid cell. */
    moveVector(angleDeg = 0, distancePx = 50, pixelsPerCell = 50) {
        this.#validateAngle(angleDeg);
        const distance = Number(distancePx);
        const scale = Number(pixelsPerCell);
        if (!Number.isFinite(distance) || distance < 1 || distance > 250) throw new Error('MOVE distance must be 1-250px');
        if (!Number.isFinite(scale) || scale <= 0) throw new Error('pixelsPerCell must be positive');

        const angle = normalizeAngle(angleDeg);
        const radians = angle * Math.PI / 180;
        const magnitude = distance / scale;
        const dx = Math.sin(radians) * magnitude;
        const dy = -Math.cos(radians) * magnitude;
        const result = this.#moveByContinuousVector(dx, dy, distance, angle);

        return {
            ...result,
            angleDeg: angle,
            distancePx: Math.round(distance),
            vector: { x: Number(dx.toFixed(4)), y: Number(dy.toFixed(4)) }
        };
    }

    applyCommand(command) {
        if (!command) throw new Error('Command is required');
        const normalized = typeof command === 'string' ? { action: command } : command;
        const action = String(normalized.action || '').toUpperCase();
        switch (action) {
            case 'TURN_R': case 'TURN_RIGHT': return { action, state: this.turnRight(normalized.degrees ?? normalized.angle ?? 90) };
            case 'TURN_L': case 'TURN_LEFT': return { action, state: this.turnLeft(normalized.degrees ?? normalized.angle ?? 90) };
            case 'MOVE':
                if (normalized.distance !== undefined || normalized.angle !== undefined) return { action, ...this.moveVector(normalized.angle ?? 0, normalized.distance ?? 50) };
                return { action, ...this.move(normalized.steps ?? normalized.val ?? 1) };
            default: throw new Error(`Unsupported movement command: ${action}`);
        }
    }

    executeQueue(queue = []) {
        if (!Array.isArray(queue)) throw new Error('Command queue must be an array');
        const results = queue.map(command => this.applyCommand(command));
        return { state: this.getState(), results };
    }

    /** Snap the robot to a nearby target without changing its heading. */
    alignTo(x, y) {
        this.#validateContinuousPosition(x, y);
        this.state.x = Number(x.toFixed(4));
        this.state.y = Number(y.toFixed(4));
        return this.getStateDetailed();
    }

    getState() { return { x: this.state.x, y: this.state.y, direction: this.state.direction, carrying: this.state.carrying }; }

    getStateDetailed() { return { ...this.state }; }

    #moveByContinuousVector(dx, dy, distancePx, angleDeg) {
        const requestedDistance = Math.hypot(dx, dy);
        const maxX = this.gridSize - 1;
        const maxY = this.gridSize - 1;
        const targetX = this.state.x + dx;
        const targetY = this.state.y + dy;
        const clampedX = Math.max(0, Math.min(maxX, targetX));
        const clampedY = Math.max(0, Math.min(maxY, targetY));
        const actualDx = clampedX - this.state.x;
        const actualDy = clampedY - this.state.y;
        const actualDistance = Math.hypot(actualDx, actualDy);
        const blocked = actualDistance + 1e-9 < requestedDistance;
        const steps = Math.max(1, Math.ceil(Math.max(actualDistance, 0.001) * 5));
        const snapshots = [];

        for (let i = 1; i <= steps; i += 1) {
            const t = i / steps;
            this.state.x = Number((this.state.x + actualDx * (t - (i - 1) / steps)).toFixed(4));
            this.state.y = Number((this.state.y + actualDy * (t - (i - 1) / steps)).toFixed(4));
            snapshots.push(this.getState());
        }

        return {
            moved: actualDistance > 0,
            blocked,
            stepsMoved: actualDistance,
            snapshots,
            angleDeg,
            distancePx: Math.round(distancePx),
            requestedVector: { x: dx, y: dy }
        };
    }

    #moveByGridVector(dx, dy, steps) {
        const snapshots = [];
        for (let i = 0; i < steps; i += 1) {
            const nextX = this.state.x + dx;
            const nextY = this.state.y + dy;
            if (!this.#isInsideGrid(nextX, nextY)) {
                return { moved: snapshots.length > 0, blocked: true, stepsMoved: snapshots.length, snapshots };
            }
            this.state.x = nextX; this.state.y = nextY;
            snapshots.push(this.getState());
        }
        return { moved: snapshots.length > 0, blocked: false, stepsMoved: snapshots.length, snapshots };
    }

    #isInsideGrid(x, y) { return x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize; }
    #validatePosition(x, y) { if (!Number.isInteger(x) || !Number.isInteger(y) || !this.#isInsideGrid(x, y)) throw new Error(`Invalid robot position: (${x}, ${y})`); }
    #validateContinuousPosition(x, y) { if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y)) || !this.#isInsideGrid(Number(x), Number(y))) throw new Error(`Invalid robot position: (${x}, ${y})`); }
    #validateDirection(direction) { if (!DIRECTIONS.includes(direction)) throw new Error(`Invalid direction: ${direction}`); }
    #validateSteps(steps) { if (!Number.isInteger(steps) || steps <= 0) throw new Error('steps must be a positive integer'); }
    #validateAngle(angle) { if (!Number.isFinite(Number(angle))) throw new Error('Angle must be numeric'); }
    #validateTurn(degrees) { const value = Number(degrees); if (!Number.isFinite(value) || value <= 0 || value > 360) throw new Error('TURN angle must be 1-360 degrees'); }
}

module.exports = { RobotMovement, DIRECTIONS, VECTORS, normalizeAngle, directionForAngle };
