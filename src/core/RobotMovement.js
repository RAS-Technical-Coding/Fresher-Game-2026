const DIRECTIONS = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

const VECTORS = {
    NORTH: { x: 0, y: -1 },
    EAST: { x: 1, y: 0 },
    SOUTH: { x: 0, y: 1 },
    WEST: { x: -1, y: 0 }
};

class RobotMovement {
    constructor(gridSize = 10, initialState = {}) {
        if (!Number.isInteger(gridSize) || gridSize <= 0) {
            throw new Error('gridSize must be a positive integer');
        }

        this.gridSize = gridSize;
        this.reset(initialState);
    }

    reset(state = {}) {
        const x = state.x ?? 0;
        const y = state.y ?? 0;
        const direction = state.direction ?? 'NORTH';
        const carrying = state.carrying ?? false;

        this.#validatePosition(x, y);
        this.#validateDirection(direction);

        this.state = {
            x,
            y,
            direction,
            carrying
        };

        return this.getState();
    }

    turnRight() {
        const currentIndex = DIRECTIONS.indexOf(this.state.direction);
        this.state.direction =
            DIRECTIONS[(currentIndex + 1) % DIRECTIONS.length];

        return this.getState();
    }

    turnLeft() {
        const currentIndex = DIRECTIONS.indexOf(this.state.direction);
        this.state.direction =
            DIRECTIONS[
                (currentIndex - 1 + DIRECTIONS.length) % DIRECTIONS.length
            ];

        return this.getState();
    }

    canMove(steps = 1) {
        this.#validateSteps(steps);

        const vector = VECTORS[this.state.direction];

        const targetX = this.state.x + vector.x * steps;
        const targetY = this.state.y + vector.y * steps;

        return this.#isInsideGrid(targetX, targetY);
    }

    move(steps = 1) {
        this.#validateSteps(steps);

        const vector = VECTORS[this.state.direction];
        const snapshots = [];

        for (let i = 0; i < steps; i += 1) {
            const nextX = this.state.x + vector.x;
            const nextY = this.state.y + vector.y;

            if (!this.#isInsideGrid(nextX, nextY)) {
                return {
                    moved: snapshots.length > 0,
                    blocked: true,
                    stepsMoved: snapshots.length,
                    snapshots
                };
            }

            this.state.x = nextX;
            this.state.y = nextY;

            snapshots.push(this.getState());
        }

        return {
            moved: snapshots.length > 0,
            blocked: false,
            stepsMoved: snapshots.length,
            snapshots
        };
    }

    applyCommand(command) {
        if (!command) {
            throw new Error('Command is required');
        }

        const normalized =
            typeof command === 'string'
                ? { action: command }
                : command;

        const action = String(normalized.action || '').toUpperCase();

        switch (action) {
            case 'TURN_R':
            case 'TURN_RIGHT':
                return {
                    action,
                    state: this.turnRight()
                };

            case 'TURN_L':
            case 'TURN_LEFT':
                return {
                    action,
                    state: this.turnLeft()
                };

            case 'MOVE':
                return {
                    action,
                    ...this.move(
                        normalized.steps ??
                        normalized.distance ??
                        normalized.val ??
                        1
                    )
                };

            default:
                throw new Error(`Unsupported movement command: ${action}`);
        }
    }

    executeQueue(queue = []) {
        if (!Array.isArray(queue)) {
            throw new Error('Command queue must be an array');
        }

        const results = [];

        for (const command of queue) {
            results.push(this.applyCommand(command));
        }

        return {
            state: this.getState(),
            results
        };
    }

    getState() {
        return { ...this.state };
    }

    #isInsideGrid(x, y) {
        return (
            x >= 0 &&
            x < this.gridSize &&
            y >= 0 &&
            y < this.gridSize
        );
    }

    #validatePosition(x, y) {
        if (
            !Number.isInteger(x) ||
            !Number.isInteger(y) ||
            !this.#isInsideGrid(x, y)
        ) {
            throw new Error(
                `Invalid robot position: (${x}, ${y})`
            );
        }
    }

    #validateDirection(direction) {
        if (!DIRECTIONS.includes(direction)) {
            throw new Error(`Invalid direction: ${direction}`);
        }
    }

    #validateSteps(steps) {
        if (!Number.isInteger(steps) || steps <= 0) {
            throw new Error('steps must be a positive integer');
        }
    }
}

module.exports = {
    RobotMovement,
    DIRECTIONS,
    VECTORS
};