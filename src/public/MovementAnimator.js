class MovementAnimator {
    constructor(options = {}) {
        this.stepDuration = options.stepDuration ?? 120;
        this.onStep = options.onStep ?? null;
        this.running = false;
        this.timer = null;
    }
    async play(snapshots = []) {
        this.stop();
        if (!snapshots.length) return [];
        this.running = true;
        return new Promise(resolve => {
            let i = 0;
            const step = () => {
                if (!this.running) return resolve([]);
                this.onStep?.({ ...snapshots[i] });
                i++;
                if (i >= snapshots.length) {
                    this.running = false;
                    this.timer = null;
                    return resolve(snapshots.map(s => ({ ...s })));
                }
                this.timer = setTimeout(step, this.stepDuration);
            };
            step();
        });
    }
    stop() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.running = false;
    }
}
window.MovementAnimator = MovementAnimator;
