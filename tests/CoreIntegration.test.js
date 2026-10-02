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

    assert.deepStrictEqual(robot.getState(), { x: 4, y: 0, direction: 'EAST', carrying: false });
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
    assert.deepStrictEqual(robot.getState(), { x: 9, y: 9, direction: 'EAST', carrying: false });
});

test('directional movement commands move in absolute grid directions without changing heading', () => {
    const { GameManager } = require('../src/logic/GameManager');
    const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
    game.robot.reset({ x: 5, y: 5, direction: 'NORTH', carrying: false });
    game.state.robot = game.robot.getState();
    game.start();

    const result = game.executeQueue([
        { action: 'MOVE_UP', steps: 1 },
        { action: 'MOVE_RIGHT', steps: 1 },
        { action: 'MOVE_DOWN', steps: 1 },
        { action: 'MOVE_LEFT', steps: 1 }
    ]);

    assert.equal(result.ok, true);
    assert.deepStrictEqual(
        [result.state.robot.x, result.state.robot.y],
        [5, 5]
    );
    // Absolute D-pad movement changes position only; heading stays unchanged.
    assert.equal(result.state.robot.direction, 'NORTH');
});


test('turn commands change heading while movement preserves it', () => {
    const { GameManager } = require('../src/logic/GameManager');
    const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
    game.robot.reset({ x: 5, y: 5, direction: 'NORTH', carrying: false });
    game.state.robot = game.robot.getState();
    game.start();

    const move = game.executeQueue([{ action: 'MOVE_RIGHT', steps: 1 }]);
    assert.equal(move.state.robot.direction, 'NORTH');
    assert.deepStrictEqual([move.state.robot.x, move.state.robot.y], [6, 5]);

    const turn = game.executeQueue([{ action: 'TURN_R' }]);
    assert.equal(turn.state.robot.direction, 'EAST');

    const moveAgain = game.executeQueue([{ action: 'MOVE_RIGHT', steps: 1 }]);
    assert.equal(moveAgain.state.robot.direction, 'EAST');
    assert.deepStrictEqual([moveAgain.state.robot.x, moveAgain.state.robot.y], [7, 5]);
});


test('radial MOVE uses pixel distance and angle without changing rotation', () => {
    const { GameManager } = require('../src/logic/GameManager');
    const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
    game.robot.reset({ x: 4, y: 4, direction: 'NORTH', carrying: false });
    game.state.robot = game.robot.getStateDetailed();
    game.start();
    const result = game.executeQueue([{ action: 'MOVE', distance: 50, angle: 90 }]);
    assert.equal(result.ok, true);
    assert.deepStrictEqual([result.state.robot.x, result.state.robot.y], [5, 4]);
    assert.equal(result.state.robot.rotation, 0);
    assert.equal(result.events[0].distancePx, 50);
    assert.equal(result.events[0].angleDeg, 90);
});

test('TURN supports 30/45/60/90 degree rotation', () => {
    const { GameManager } = require('../src/logic/GameManager');
    const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
    game.start();
    for (const degrees of [30,45,60,90]) {
        const result = game.executeQueue([{ action: 'TURN_R', degrees }]);
        assert.equal(result.ok, true);
    }
    assert.equal(resultSafeRotation(game), 225);
    function resultSafeRotation(g) { return g.getState().robot.rotation; }
});
