const test = require('node:test');
const assert = require('node:assert/strict');

const {
    MovementAnimator
} = require('../src/core/MovementAnimator');

test('plays snapshots in order', async () => {
    const received = [];

    const animator = new MovementAnimator({
        stepDuration: 0,
        onStep: (state) => received.push(state)
    });

    const snapshots = [
        { x: 1, y: 0, direction: 'EAST' },
        { x: 2, y: 0, direction: 'EAST' },
        { x: 3, y: 0, direction: 'EAST' }
    ];

    const result = await animator.play(snapshots);

    assert.deepStrictEqual(received, snapshots);
    assert.deepStrictEqual(result, snapshots);
    assert.equal(animator.isRunning(), false);
});

test('calls onComplete after the final step', async () => {
    let completed = false;

    const animator = new MovementAnimator({
        stepDuration: 0,
        onComplete: () => {
            completed = true;
        }
    });

    await animator.play([
        { x: 1, y: 1, direction: 'NORTH' }
    ]);

    assert.equal(completed, true);
});

test('handles an empty animation', async () => {
    let completed = false;

    const animator = new MovementAnimator({
        onComplete: () => {
            completed = true;
        }
    });

    const result = await animator.play([]);

    assert.deepStrictEqual(result, []);
    assert.equal(completed, true);
});

test('rejects invalid snapshots', async () => {
    const animator = new MovementAnimator();

    await assert.rejects(
        animator.play(null),
        /snapshots must be an array/
    );
});

test('can stop an animation', async () => {
    const received = [];

    const animator = new MovementAnimator({
        stepDuration: 50,
        onStep: (state) => received.push(state)
    });

    const animation = animator.play([
        { x: 1, y: 0, direction: 'EAST' },
        { x: 2, y: 0, direction: 'EAST' },
        { x: 3, y: 0, direction: 'EAST' }
    ]);

    animator.stop();

    const result = await animation;

    assert.deepStrictEqual(result, []);
    assert.equal(animator.isRunning(), false);
    assert.equal(received.length, 1);
});
