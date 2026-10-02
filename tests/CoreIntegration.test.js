const test = require('node:test');
const assert = require('node:assert/strict');

const { RobotMovement } = require('../src/core/RobotMovement');
const { MovementAnimator } = require('../src/core/MovementAnimator');

test('robot movement integrates with animation', async () => {
    const robot = new RobotMovement(10, {
        x: 0,
        y: 0,
        direction: 'EAST'
    });

    const movement = robot.move(4);

    const frames = [];

    const animator = new MovementAnimator({
        stepDuration: 0,
        onStep: (state) => {
            frames.push(state);
        }
    });

    const animation = await animator.play(movement.snapshots);

    assert.deepStrictEqual(
        frames.map((state) => [state.x, state.y]),
        [
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0]
        ]
    );

    assert.deepStrictEqual(
        animation,
        movement.snapshots
    );

    assert.deepStrictEqual(
        robot.getState(),
        {
            x: 4,
            y: 0,
            direction: 'EAST',
            carrying: false
        }
    );
});

test('blocked movement does not generate invalid animation frames', async () => {
    const robot = new RobotMovement(10, {
        x: 9,
        y: 9,
        direction: 'EAST'
    });

    const movement = robot.move(3);
    const frames = [];

    const animator = new MovementAnimator({
        stepDuration: 0,
        onStep: (state) => frames.push(state)
    });

    await animator.play(movement.snapshots);

    assert.equal(movement.blocked, true);
    assert.equal(movement.stepsMoved, 0);
    assert.deepStrictEqual(frames, []);
    assert.deepStrictEqual(robot.getState(), {
        x: 9,
        y: 9,
        direction: 'EAST',
        carrying: false
    });
});
