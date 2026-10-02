const test = require('node:test');
const assert = require('node:assert/strict');
const { GameManager } = require('../src/logic/GameManager');

test('radial movement preserves exact angle/distance and heading', () => {
    const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
    game.robot.reset({ x: 4, y: 4, direction: 'NORTH', rotation: 0, carrying: false });
    game.start();
    const result = game.executeQueue([{ action: 'MOVE', distance: 50, angle: 45 }]);
    assert.equal(result.ok, true);
    assert.equal(result.state.robot.rotation, 0);
    assert.equal(result.state.robot.direction, 'NORTH');
    assert.ok(Math.abs(result.state.robot.x - 4.7071) < 0.002);
    assert.ok(Math.abs(result.state.robot.y - 3.2929) < 0.002);
    assert.deepEqual(result.events[0].vector, { x: 0.7071, y: -0.7071 });
});

test('turn changes heading but does not change position', () => {
    const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
    game.robot.reset({ x: 4, y: 4, direction: 'NORTH', rotation: 0, carrying: false });
    game.start();
    const result = game.executeQueue([{ action: 'TURN_R', degrees: 60 }]);
    assert.equal(result.state.robot.x, 4);
    assert.equal(result.state.robot.y, 4);
    assert.equal(result.state.robot.rotation, 60);
});

test('GRIP and DROP require proximity and complete a mission', () => {
    const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
    game.robot.reset({ x: 1, y: 1, direction: 'NORTH', rotation: 0, carrying: false });
    game.state.box = { x: 1, y: 1 };
    game.state.target = { x: 3, y: 1 };
    game.start();

    let result = game.executeQueue([{ action: 'GRIP' }]);
    assert.equal(result.events[0].success, true);
    assert.equal(result.state.robot.carrying, true);

    result = game.executeQueue([{ action: 'MOVE', distance: 100, angle: 90 }, { action: 'DROP' }]);
    assert.equal(result.events.at(-1).success, true);
    assert.equal(result.state.phase, 'WON');
});

test('GRIP and DROP report range failures instead of silently doing nothing', () => {
    const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
    game.robot.reset({ x: 1, y: 1, direction: 'NORTH', rotation: 0, carrying: false });
    game.state.box = { x: 4, y: 4 };
    game.state.target = { x: 7, y: 7 };
    game.start();
    let result = game.executeQueue([{ action: 'GRIP' }]);
    assert.equal(result.events[0].message, 'OBJECT OUT OF RANGE');
    game.robot.reset({ x: 4, y: 4, direction: 'NORTH', rotation: 0, carrying: true });
    result = game.executeQueue([{ action: 'DROP' }]);
    assert.equal(result.events[0].message, 'DROP ZONE OUT OF RANGE');
});

test('ADJUST aligns a nearby pickup or drop target without changing heading', () => {
    const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
    game.start();
    game.robot.alignTo(game.state.box.x + 0.5, game.state.box.y);
    const before = game.robot.getStateDetailed().rotation;
    let result = game.executeQueue([{ action: 'ADJUST' }]);
    assert.equal(result.events[0].success, true);
    assert.equal(result.state.robot.x, game.state.box.x);
    assert.equal(result.state.robot.y, game.state.box.y);
    assert.equal(result.state.robot.rotation, before);

    result = game.executeQueue([{ action: 'GRIP' }]);
    assert.equal(result.events[0].success, true);
    game.robot.alignTo(game.state.target.x + 0.5, game.state.target.y);
    result = game.executeQueue([{ action: 'ADJUST' }, { action: 'DROP' }]);
    assert.equal(result.events.find(e => e.type === 'ADJUST').success, true);
    assert.equal(result.events.find(e => e.type === 'DROP').success, true);
    assert.equal(result.state.phase, 'WON');
});

test('ADJUST fails when the robot is not very close to its current target', () => {
    const game = new GameManager({ gridSize: 10, durationSeconds: 120 });
    game.start();
    const result = game.executeQueue([{ action: 'ADJUST' }]);
    assert.equal(result.events[0].success, false);
    assert.equal(result.events[0].message, 'ADJUST OUT OF RANGE');
});
