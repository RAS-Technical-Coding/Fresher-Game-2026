class MovementAnimator {
    constructor(options = {}) {
        this.stepDuration = options.stepDuration ?? 100;
        this.onStep = options.onStep ?? null;
        this.onComplete = options.onComplete ?? null;

        if (!Number.isInteger(this.stepDuration) || this.stepDuration < 0) {
            throw new Error('stepDuration must be a non-negative integer');
        }

        if (this.onStep !== null && typeof this.onStep !== 'function') {
            throw new Error('onStep must be a function');
        }

        if (this.onComplete !== null && typeof this.onComplete !== 'function') {
            throw new Error('onComplete must be a function');
        }

        this.running = false;
        this.timer = null;
        this.resolveCurrent = null;
    }

    async play(snapshots = []) {
        if (!Array.isArray(snapshots)) {
            throw new Error('snapshots must be an array');
        }

        this.stop();

        if (snapshots.length === 0) {
            if (this.onComplete) {
                this.onComplete();
            }

            return [];
        }

        this.running = true;

        return new Promise((resolve) => {
            this.resolveCurrent = resolve;

            let index = 0;

            const step = () => {
                if (!this.running) {
                    return;
                }

                const snapshot = { ...snapshots[index] };

                if (this.onStep) {
                    this.onStep(snapshot);
                }

                index += 1;

                if (index >= snapshots.length) {
                    this.running = false;
                    this.timer = null;
                    this.resolveCurrent = null;

                    if (this.onComplete) {
                        this.onComplete();
                    }

                    resolve(
                        snapshots.map((state) => ({ ...state }))
                    );

                    return;
                }

                this.timer = setTimeout(step, this.stepDuration);
            };

            step();
        });
    }

    stop() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const resolveCurrent = this.resolveCurrent;

        this.running = false;
        this.resolveCurrent = null;

        if (resolveCurrent) {
            resolveCurrent([]);
        }
    }

    isRunning() {
        return this.running;
    }
}

module.exports = {
    MovementAnimator
};
