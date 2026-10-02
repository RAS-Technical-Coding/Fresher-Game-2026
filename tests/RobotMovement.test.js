const test = require('node:test');
const assert = require('node:assert/strict');

const {
    RobotMovement
} = require('../src/core/RobotMovement');

test('initializes on the grid', () => {
    const robot = new RobotMovement(10, {
        x: 2,
        y: 3,
        direction: 'NORTH'
    });

    assert.deepStrictEqual(robot.getState(), {
        x: 2,
        y: 3,
        direction: 'NORTH',
        carrying: false
    });
});

test('turns right correctly', () => {
    const robot = new RobotMovement();

    robot.turnRight();
    assert.equal(robot.getState().direction, 'EAST');

    robot.turnRight();
    assert.equal(robot.getState().direction, 'SOUTH');
});

test('turns left correctly', () => {
    const robot = new RobotMovement();

    robot.turnLeft();
    assert.equal(robot.getState().direction, 'WEST');

    robot.turnLeft();
    assert.equal(robot.getState().direction, 'SOUTH');
});

test('moves north', () => {
    const robot = new RobotMovement(10, {
        x: 5,
        y: 5,
        direction: 'NORTH'
    });

    const result = robot.move();

    assert.equal(result.moved, true);
    assert.equal(result.blocked, false);
    assert.equal(result.stepsMoved, 1);

    assert.deepStrictEqual(robot.getState(), {
        x: 5,
        y: 4,
        direction: 'NORTH',
        carrying: false
    });
});

test('moves east multiple tiles', () => {
    const robot = new RobotMovement(10, {
        x: 2,
        y: 4,
        direction: 'EAST'
    });

    const result = robot.move(3);

    assert.equal(result.stepsMoved, 3);

    assert.deepStrictEqual(robot.getState(), {
        x: 5,
        y: 4,
        direction: 'EAST',
        carrying: false
    });

    assert.equal(result.snapshots.length, 3);
});

test('prevents movement outside the grid', () => {
    const robot = new RobotMovement(10, {
        x: 0,
        y: 0,
        direction: 'NORTH'
    });

    const result = robot.move();

    assert.equal(result.moved, false);
    assert.equal(result.blocked, true);
    assert.equal(result.stepsMoved, 0);

    assert.deepStrictEqual(robot.getState(), {
        x: 0,
        y: 0,
        direction: 'NORTH',
        carrying: false
    });
});

test('stops at the boundary during multi tile movement', () => {
    const robot = new RobotMovement(10, {
        x: 8,
        y: 5,
        direction: 'EAST'
    });

    const result = robot.move(3);

    assert.equal(result.moved, true);
    assert.equal(result.blocked, true);
    assert.equal(result.stepsMoved, 1);

    assert.deepStrictEqual(robot.getState(), {
        x: 9,
        y: 5,
        direction: 'EAST',
        carrying: false
    });
});

test('executes normalized commands', () => {
    const robot = new RobotMovement(10, {
        x: 1,
        y: 1,
        direction: 'NORTH'
    });

    robot.applyCommand('TURN_R');

    robot.applyCommand({
        action: 'MOVE',
        steps: 2
    });

    assert.deepStrictEqual(robot.getState(), {
        x: 3,
        y: 1,
        direction: 'EAST',
        carrying: false
    });
});

test('executes a command queue', () => {
    const robot = new RobotMovement(10);

    const result = robot.executeQueue([
        'TURN_R',
        { action: 'MOVE', steps: 2 },
        'TURN_R',
        { action: 'MOVE', steps: 1 }
    ]);

    assert.deepStrictEqual(result.state, {
        x: 2,
        y: 1,
        direction: 'SOUTH',
        carrying: false
    });

    assert.equal(result.results.length, 4);
});

test('resets correctly', () => {
    const robot = new RobotMovement();

    robot.turnRight();
    robot.move();

    robot.reset({
        x: 7,
        y: 8,
        direction: 'WEST',
        carrying: true
    });

    assert.deepStrictEqual(robot.getState(), {
        x: 7,
        y: 8,
        direction: 'WEST',
        carrying: true
    });
});
