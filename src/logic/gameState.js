const EventEmitter = require("events");

class GameStateController extends EventEmitter {
    constructor(options = {}) {
        super();

        const gridSize = options.gridSize ?? 10;
        const tileSize = options.tileSize ?? 50;
        const gameTime = options.gameTime ?? 120;

        // Fix 5: a grid needs at least 2 tiles' worth per axis (3 distinct
        // positions are required, so 2x2 = 4 tiles is the smallest safe grid).
        if (!Number.isInteger(gridSize) || gridSize < 2) {
            throw new RangeError("gridSize must be an integer >= 2");
        }
        if (!(tileSize > 0)) {
            throw new RangeError("tileSize must be a positive number");
        }
        if (!(gameTime > 0) || !Number.isFinite(gameTime)) {
            throw new RangeError("gameTime must be a positive number of seconds");
        }

        this.GRID_SIZE = gridSize;
        this.TILE_SIZE = tileSize;
        this.GAME_TIME = gameTime;

        this.gameStatus = "WAITING";

        // Timer is deadline-based (immune to event-loop delays).
        this.deadline = null;
        this.frozenTimeRemaining = this.GAME_TIME;
        this.lastEmittedSecond = null;
        this.timer = null;

        // Fix 2: tracks whether a layout was generated (e.g. by randomizeTurn)
        // that startGame() should keep rather than overwrite.
        this.layoutReady = false;

        this.robot = { x: 0, y: 0, rotation: 0, holding: false };
        this.box = { x: 0, y: 0, held: false, delivered: false };
        this.destination = { x: 0, y: 0 };
    }

    // ---------- Lifecycle ----------

    startGame() {
        if (this.gameStatus === "RUNNING") {
            return false;
        }

        this.stopTimer();

        // Fix 2: only generate a layout if none has been generated yet.
        if (!this.layoutReady) {
            this.applyRandomLayout();
        }
        // The layout is consumed by this game; the next game gets a fresh
        // one unless randomizeTurn() is called again.
        this.layoutReady = false;

        this.frozenTimeRemaining = this.GAME_TIME;
        this.gameStatus = "RUNNING";

        this.emit("gameStarted", this.getState());

        this.startTimer();

        return true;
    }

    // Forces a brand new layout and returns to WAITING.
    resetGame() {
        this.stopTimer();

        this.frozenTimeRemaining = this.GAME_TIME;
        this.gameStatus = "WAITING";

        this.applyRandomLayout();
        this.layoutReady = false;
    }

    randomizeTurn() {
        if (this.gameStatus === "RUNNING") {
            return false;
        }

        this.applyRandomLayout();
        this.layoutReady = true;

        this.emit("positionsRandomized", this.getState());

        return true;
    }

    applyRandomLayout() {
        const positions = this.generateValidPositions();

        this.robot = {
            x: positions.robot.x,
            y: positions.robot.y,
            rotation: 0,
            holding: false
        };

        this.box = {
            x: positions.box.x,
            y: positions.box.y,
            held: false,
            delivered: false
        };

        this.destination = {
            x: positions.destination.x,
            y: positions.destination.y
        };
    }

    // ---------- Position helpers ----------

    generateRandomCoordinate() {
        return Math.floor(Math.random() * this.GRID_SIZE);
    }

    generateValidPositions() {
        let robot;
        let box;
        let destination;

        // Safe: constructor guarantees GRID_SIZE >= 2 (at least 4 tiles).
        do {
            robot = {
                x: this.generateRandomCoordinate(),
                y: this.generateRandomCoordinate()
            };
            box = {
                x: this.generateRandomCoordinate(),
                y: this.generateRandomCoordinate()
            };
            destination = {
                x: this.generateRandomCoordinate(),
                y: this.generateRandomCoordinate()
            };
        } while (
            this.samePosition(robot, box) ||
            this.samePosition(robot, destination) ||
            this.samePosition(box, destination)
        );

        return { robot, box, destination };
    }

    samePosition(position1, position2) {
        return position1.x === position2.x && position1.y === position2.y;
    }

    distance(position1, position2) {
        const dx = position1.x - position2.x;
        const dy = position1.y - position2.y;

        return Math.sqrt(dx * dx + dy * dy);
    }

    isGripperCloseToBox() {
        return this.distance(this.robot, this.box) <= 1;
    }

    // ---------- Actions ----------

    tryGrip() {
        if (this.gameStatus !== "RUNNING") {
            return false;
        }

        if (this.box.delivered || this.robot.holding) {
            return false;
        }

        if (!this.isGripperCloseToBox()) {
            this.emit("gripFailed", {
                reason: "Robot is too far from the box"
            });

            return false;
        }

        this.robot.holding = true;
        this.box.held = true;

        this.emit("boxPickedUp", this.getState());

        return true;
    }

    releaseBox() {
        if (this.gameStatus !== "RUNNING") {
            return false;
        }

        if (!this.robot.holding) {
            return false;
        }

        this.robot.holding = false;
        this.box.held = false;

        this.box.x = this.robot.x;
        this.box.y = this.robot.y;

        this.checkDrop();

        return true;
    }

    checkDrop() {
        if (
            this.samePosition(this.box, this.destination) &&
            !this.robot.holding
        ) {
            this.box.delivered = true;

            // Fix 1: win path now also emits gameOver + disconnectClient.
            this.finishGame("WON", "DELIVERED");

            return true;
        }

        return false;
    }

    // Fixes 3 and 4: integer validation and single-tile moves only.
    moveRobot(x, y) {
        if (this.gameStatus !== "RUNNING") {
            return false;
        }

        if (!Number.isInteger(x) || !Number.isInteger(y)) {
            return false;
        }

        if (x < 0 || x >= this.GRID_SIZE || y < 0 || y >= this.GRID_SIZE) {
            return false;
        }

        const stepSize =
            Math.abs(x - this.robot.x) + Math.abs(y - this.robot.y);

        if (stepSize !== 1) {
            return false;
        }

        this.robot.x = x;
        this.robot.y = y;

        if (this.robot.holding) {
            this.box.x = x;
            this.box.y = y;
        }

        this.emit("robotMoved", this.getState());

        return true;
    }

    moveRobotBy(dx, dy) {
        if (!Number.isInteger(dx) || !Number.isInteger(dy)) {
            return false;
        }

        return this.moveRobot(this.robot.x + dx, this.robot.y + dy);
    }

    turnRobot(angle) {
        if (this.gameStatus !== "RUNNING") {
            return false;
        }

        if (!Number.isFinite(angle)) {
            return false;
        }

        this.robot.rotation = (this.robot.rotation + angle) % 360;

        if (this.robot.rotation < 0) {
            this.robot.rotation += 360;
        }

        this.emit("robotTurned", { rotation: this.robot.rotation });

        return true;
    }

    // ---------- Timer (deadline-based) ----------

    getTimeRemaining() {
        if (this.gameStatus === "RUNNING" && this.deadline !== null) {
            return Math.max(
                0,
                Math.ceil((this.deadline - Date.now()) / 1000)
            );
        }

        return this.frozenTimeRemaining;
    }

    startTimer() {
        this.stopTimer();

        this.deadline = Date.now() + this.GAME_TIME * 1000;
        this.lastEmittedSecond = this.GAME_TIME;

        // Tick faster than 1s so the display and the end time stay accurate;
        // remaining time is always computed from the deadline, never counted.
        this.timer = setInterval(() => {
            if (this.gameStatus !== "RUNNING") {
                return;
            }

            const remaining = this.getTimeRemaining();

            if (remaining !== this.lastEmittedSecond) {
                this.lastEmittedSecond = remaining;
                this.emit("timerUpdate", { timeRemaining: remaining });
            }

            if (Date.now() >= this.deadline) {
                this.endGame("TIME_UP");
            }
        }, 100);
    }

    stopTimer() {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    // ---------- Ending ----------

    endGame(reason = "GAME_OVER") {
        this.finishGame("LOST", reason);
    }

    // Single exit point for both win and loss so both notify the server.
    finishGame(status, reason) {
        if (this.gameStatus === "WON" || this.gameStatus === "LOST") {
            return;
        }

        // Freeze the remaining time before changing status.
        this.frozenTimeRemaining =
            status === "LOST" && reason === "TIME_UP"
                ? 0
                : this.getTimeRemaining();

        this.stopTimer();
        this.deadline = null;
        this.gameStatus = status;

        if (status === "WON") {
            this.emit("gameWon", {
                timeRemaining: this.frozenTimeRemaining
            });
        }

        this.emit("gameOver", {
            reason,
            result: status,
            timeRemaining: this.frozenTimeRemaining,
            disconnectClient: true
        });

        this.emit("disconnectClient", { reason });
    }

    // ---------- State ----------

    getState() {
        return {
            gridSize: this.GRID_SIZE,
            tileSize: this.TILE_SIZE,
            timeRemaining: this.getTimeRemaining(),
            gameStatus: this.gameStatus,

            robot: {
                x: this.robot.x,
                y: this.robot.y,
                rotation: this.robot.rotation,
                holding: this.robot.holding
            },

            box: {
                x: this.box.x,
                y: this.box.y,
                held: this.box.held,
                delivered: this.box.delivered
            },

            destination: {
                x: this.destination.x,
                y: this.destination.y
            }
        };
    }

    destroy() {
        this.stopTimer();
        this.removeAllListeners();
    }
}

module.exports = GameStateController;
