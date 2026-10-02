const { RobotMovement } = require('../core/RobotMovement');

const PHASES = Object.freeze({
    IDLE: 'IDLE',
    READY: 'READY',
    PLAYING: 'PLAYING',
    WON: 'WON',
    LOST: 'LOST'
});

class GameManager {
    robotState() { return this.robot.getStateDetailed(); }
    constructor(options = {}) {
        this.gridSize = options.gridSize ?? 10;
        this.durationSeconds = options.durationSeconds ?? 120;
        this.robot = new RobotMovement(this.gridSize);
        this.reset();
    }

    reset() {
        const robot = this.randomCell();
        const box = this.randomCell([robot]);
        let target;
        do { target = this.randomCell([robot, box]); } while (this.cellDistance(box, target) < 3 && this.gridSize >= 6);

        this.robot.reset({
            x: robot.x,
            y: robot.y,
            direction: 'NORTH',
            carrying: false
        });

        this.state = {
            phase: PHASES.IDLE,
            timeLeft: this.durationSeconds,
            score: 0,
            gridSize: this.gridSize,
            robot: this.robotState(),
            box: { ...box },
            target: { ...target },
            moves: 0,
            commandsExecuted: 0,
            lastVector: null,
            message: 'SCAN TO START'
        };

        return this.getState();
    }

    start() {
        this.state.phase = PHASES.PLAYING;
        this.state.timeLeft = this.durationSeconds;
        this.state.message = 'MISSION ACTIVE';
        return this.getState();
    }

    tick(seconds = 1) {
        if (this.state.phase !== PHASES.PLAYING) return this.getState();

        this.state.timeLeft = Math.max(0, this.state.timeLeft - seconds);
        if (this.state.timeLeft === 0) {
            this.state.phase = PHASES.LOST;
            this.state.message = 'TIME UP';
        }
        return this.getState();
    }

    executeQueue(queue = []) {
        if (this.state.phase !== PHASES.PLAYING) {
            return { ok: false, error: 'Game is not active', state: this.getState(), events: [] };
        }

        if (!Array.isArray(queue) || queue.length > 40) {
            return { ok: false, error: 'Invalid command queue', state: this.getState(), events: [] };
        }

        const events = [];
        const startState = this.getState();

        for (const raw of queue) {
            if (this.state.phase === PHASES.WON) break;
            const action = String(raw?.action || raw || '').toUpperCase();
            this.state.commandsExecuted += 1;

            if (action === 'TURN_R' || action === 'TURN_RIGHT') {
                const degrees = Number(raw?.degrees ?? raw?.angle ?? 90);
                const result = this.robot.turnRight(degrees);
                this.state.lastVector = null;
                events.push({ type: 'TURN', action: 'TURN_R', degrees, rotation: result.rotation, state: this.robotState() });
                continue;
            }

            if (action === 'TURN_L' || action === 'TURN_LEFT') {
                const degrees = Number(raw?.degrees ?? raw?.angle ?? 90);
                const result = this.robot.turnLeft(degrees);
                this.state.lastVector = null;
                events.push({ type: 'TURN', action: 'TURN_L', degrees, rotation: result.rotation, state: this.robotState() });
                continue;
            }

            if (action === 'MOVE' || action.startsWith('MOVE_')) {
                let result;
                let angleDeg = Number(raw?.angle ?? 0);
                let distancePx = Number(raw?.distance ?? ((raw?.steps ?? 1) * 50));
                if (action.startsWith('MOVE_')) {
                    const directions = { MOVE_UP: 0, MOVE_RIGHT: 90, MOVE_DOWN: 180, MOVE_LEFT: 270 };
                    angleDeg = directions[action];
                    distancePx = Number(raw?.distance ?? ((raw?.steps ?? 1) * 50));
                }
                result = this.robot.moveVector(angleDeg, distancePx);
                this.state.moves += result.stepsMoved;
                this.state.lastVector = { angleDeg: result.angleDeg, distancePx: result.distancePx, x: result.vector.x, y: result.vector.y };
                events.push({ type: 'MOVE', action: 'MOVE', distancePx: result.distancePx, angleDeg: result.angleDeg, vector: result.vector, snapshots: result.snapshots, blocked: result.blocked, state: this.robotState() });
                continue;
            }

            if (action === 'ADJUST') {
                const r = this.robot.getState();
                const target = r.carrying ? this.state.target : this.state.box;
                const distance = this.cellDistance(r, target);
                const adjustRange = 0.75;
                if (distance <= adjustRange) {
                    this.robot.alignTo(target.x, target.y);
                    events.push({ type: 'ADJUST', action: 'ADJUST', success: true, target: r.carrying ? 'DROP_ZONE' : 'OBJECT', state: this.robotState() });
                } else {
                    events.push({ type: 'ADJUST', action: 'ADJUST', success: false, message: 'ADJUST OUT OF RANGE' });
                }
                continue;
            }

            if (action === 'GRAB' || action === 'GRIP') {
                const r = this.robot.getState();
                if (this.robot.state?.carrying) {
                    events.push({ type: 'INFO', action, success: false, message: 'Already carrying' });
                    continue;
                }

                if (this.cellDistance(r, this.state.box) <= 0.35) {
                    this.robot.reset({ ...this.robot.getState(), carrying: true });
                    this.state.score += 100;
                    events.push({ type: 'GRAB', action, success: true, state: this.robotState() });
                } else {
                    events.push({ type: 'GRAB', action, success: false, message: 'OBJECT OUT OF RANGE' });
                }
                continue;
            }

            if (action === 'DROP') {
                const r = this.robot.getState();
                if (!r.carrying) {
                    events.push({ type: 'INFO', action, success: false, message: 'Nothing to drop' });
                    continue;
                }

                if (this.cellDistance(r, this.state.target) <= 0.35) {
                    this.robot.reset({ ...this.robot.getState(), carrying: false });
                    this.state.score += 500 + this.state.timeLeft * 10;
                    this.state.phase = PHASES.WON;
                    this.state.message = 'MISSION COMPLETE';
                    events.push({ type: 'DROP', action, success: true, win: true, state: this.robotState() });
                } else {
                    events.push({ type: 'DROP', action, success: false, message: 'DROP ZONE OUT OF RANGE' });
                }
                continue;
            }

            if (action === 'EXEC') continue;
            if (this.state.phase === PHASES.WON) break;

            return { ok: false, error: `Unknown action: ${action}`, state: this.getState(), events };
        }

        this.state.robot = this.robotState();
        if (this.state.phase === PHASES.PLAYING) {
            this.state.message = this.state.robot.carrying ? 'DELIVER THE CORE' : 'LOCATE THE CORE';
        }

        return { ok: true, startState, state: this.getState(), events };
    }

    getState() {
        return {
            ...this.state,
            robot: this.robotState(),
            box: { ...this.state.box },
            target: { ...this.state.target }
        };
    }

    cellDistance(a, b) {
        return Math.hypot(Number(a?.x) - Number(b?.x), Number(a?.y) - Number(b?.y));
    }

    randomCell(exclude = []) {
        let cell;
        do {
            cell = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
        } while (exclude.some(p => p.x === cell.x && p.y === cell.y));
        return cell;
    }
}

module.exports = { GameManager, PHASES };
