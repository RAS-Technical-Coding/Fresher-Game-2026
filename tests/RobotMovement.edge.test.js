const test = require('node:test');
const assert = require('node:assert/strict');

const {
    RobotMovement
} = require('../src/core/RobotMovement');

test('rejects invalid grid size', () => {
    assert.throws(() => new RobotMovement(0), /gridSize/);
    assert.throws(() => new RobotMovement(-1), /gridSize/);
    assert.throws(() => new RobotMovement(1.5), /gridSize/);
});

test('rejects invalid initial position', () => {
    assert.throws(
        () => new RobotMovement(10, { x: -1, y: 0 }),
        /Invalid robot position/
    );

    assert.throws(
        () => new RobotMovement(10, { x: 10, y: 0 }),
        /Invalid robot position/
    );
});

test('rejects invalid direction', () => {
    assert.throws(
        () => new RobotMovement(10, { direction: 'DIAGONAL' }),
        /Invalid direction/
    );
});

test('rejects invalid movement steps', () => {
    const robot = new RobotMovement();

    assert.throws(() => robot.move(0), /positive integer/);
    assert.throws(() => robot.move(-1), /positive integer/);
    assert.throws(() => robot.move(1.5), /positive integer/);
});

test('rejects unsupported commands', () => {
    const robot = new RobotMovement();

    assert.throws(
        () => robot.applyCommand('FLY'),
        /Unsupported movement command/
    );
});

test('rejects invalid command queues', () => {
    const robot = new RobotMovement();

    assert.throws(
        () => robot.executeQueue(null),
        /Command queue must be an array/
    );
});

test('state snapshots cannot mutate internal state', () => {
    const robot = new RobotMovement();

    const state = robot.getState();
    state.x = 99;
    state.direction = 'SOUTH';

    assert.deepStrictEqual(robot.getState(), {
        x: 0,
        y: 0,
        direction: 'NORTH',
        carrying: false
    });
});

test('movement snapshots are produced for every tile', () => {
    const robot = new RobotMovement(10, {
        x: 1,
        y: 1,
        direction: 'EAST'
    });

    const result = robot.move(4);

    assert.deepStrictEqual(
        result.snapshots.map((state) => [state.x, state.y]),
        [
            [2, 1],
            [3, 1],
            [4, 1],
            [5, 1]
        ]
    );
});

test('all four directions move correctly', () => {
    const positions = [
        ['NORTH', 2, 1],
        ['EAST', 3, 2],
        ['SOUTH', 2, 3],
        ['WEST', 1, 2]
    ];

    for (const [direction, expectedX, expectedY] of positions) {
        const robot = new RobotMovement(10, {
            x: 2,
            y: 2,
            direction
        });

        robot.move();

        assert.equal(robot.getState().x, expectedX);
        assert.equal(robot.getState().y, expectedY);
    }
});

test('full rotation returns to original direction', () => {
    const robot = new RobotMovement();

    robot.turnRight();
    robot.turnRight();
    robot.turnRight();
    robot.turnRight();

    assert.equal(robot.getState().direction, 'NORTH');
});

test('left and right turns cancel each other', () => {
    const robot = new RobotMovement();

    robot.turnRight();
    robot.turnLeft();

    assert.equal(robot.getState().direction, 'NORTH');
});
