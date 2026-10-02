const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('host UI contains the complete interactive game surface', () => {
  const html = read('src/public/index.html');
  for (const id of ['idle','game','result','qr','session','controllerUrl','gameCanvas','timer','pos','heading','payload','score','queue']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing host element: ${id}`);
  }
  assert.match(html, /socket\.on\(['"]player_connected/);
  assert.match(html, /socket\.on\(['"]game_execution/);
  assert.match(html, /ResizeObserver/);
  assert.match(html, /if \(!window\.GameRenderer\)/);
});

test('controller UI contains command programming controls', () => {
  const html = read('src/public/controller.html');
  for (const action of ['TURN_L','TURN_R','GRAB','DROP']) {
    assert.match(html, new RegExp(`data-action=["']${action}["']`), `missing controller action: ${action}`);
  }
  assert.match(html, /id=["']exec["']/);
  assert.match(html, /id=["']clear["']/);
  assert.match(html, /controller_command/);
  assert.match(html, /queue: queue/);
  assert.match(html, /data-remove/);
  assert.match(html, /player_linked/);
  assert.match(html, /countdown/);
});

test('browser renderer assets exist and are syntactically complete', () => {
  for (const rel of ['src/public/GameRenderer.js','src/public/MovementAnimator.js']) {
    assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
    assert.ok(read(rel).length > 500, `${rel} is unexpectedly small`);
  }
});

test('server exposes browser renderer and session endpoints', () => {
  const server = read('src/server.js');
  assert.match(server, /express\.static/);
  assert.match(server, /\/canvas\/GameRenderer\.js/);
  assert.match(server, /\/api\/session/);
  assert.match(server, /\/api\/qr/);
  assert.match(server, /server\.listen\(PORT, '0\.0\.0\.0'/);
  assert.match(server, /controllerUrl/);
  assert.match(server, /countdownToken/);
});

test('controller UI exposes the required radial movement and rotation controls', () => {
  const html = read('src/public/controller.html');
  assert.match(html, /RADIAL MOVE VECTOR/);
  assert.match(html, /pointerdown/);
  assert.match(html, /distance/);
  assert.match(html, /angle/);
  for (const deg of ['30','45','60','90']) assert.match(html, new RegExp(`${deg}°`));
  assert.match(html, /GRIP \/ GRAB/);
  assert.match(html, /MOVE .*px/);
});
