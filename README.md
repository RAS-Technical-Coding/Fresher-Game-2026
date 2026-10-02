# IEEE RAS Robot Run — Fresher Game 2026

A two-screen arcade game for the IEEE RAS fresher event:

- **Host/laptop:** displays the CRT-style arcade game, QR code, 10×10 game board, timer, score and live robot telemetry.
- **Phone:** acts as the player's controller. The player builds a command sequence and presses **EXECUTE SEQUENCE**.
- **Networking:** Node.js + Express + Socket.IO, with one controller per round.

## Requirements implemented

1. Host idle/attract screen with IEEE RAS branding and a dynamic QR code.
2. Phone scans the QR and joins the current session.
3. One-player-at-a-time session locking.
4. Random robot/core/target positions on a 10×10 grid.
5. 120-second mission timer.
6. Phone controls: radial movement input, TURN L, TURN R, GRAB CORE, DROP CORE and EXECUTE SEQUENCE.
7. Command validation through `CommandInterpreter`.
8. Existing `RobotMovement` remains the movement foundation.
9. Existing `MovementAnimator` is used by the host to animate every movement snapshot tile-by-tile.
10. GRAB only succeeds on the core; DROP only wins on the target.
11. Score and mission-complete / timeout states.
12. Controller is disconnected at game end and the host creates a fresh session/QR.
13. The host canvas has a runtime renderer fallback and a `ResizeObserver`, so the game board still initializes correctly when the game screen changes from hidden to visible.
14. LAN-address detection prefers the default network route and avoids common virtual-adapter addresses such as VMware/VirtualBox when possible.
15. QR generation has a visible URL fallback so the controller link is still available if QR rendering fails.

## Run on Windows

From the folder containing `package.json`:

```powershell
npm install
npm test
npm start
```

Open the host on the laptop:

```text
http://localhost:3000
```

Connect the phone and laptop to the **same Wi-Fi network**, then scan the QR displayed by the host.

## Project structure

```text
src/
├── core/
│   ├── RobotMovement.js
│   └── MovementAnimator.js
├── logic/
│   └── GameManager.js
├── interpreter/
│   └── CommandInterpreter.js
├── canvas/
│   └── GameRenderer.js
├── server/
│   ├── sessionManager.js
│   └── socketManager.js
├── public/
│   ├── index.html
│   ├── controller.html
│   └── MovementAnimator.js
└── server.js
```

## Game flow

```text
HOST IDLE
   ↓
QR / SESSION
   ↓
PHONE CONNECTS
   ↓
RANDOM 10×10 MISSION
   ↓
PHONE BUILDS COMMAND QUEUE
   ↓
EXECUTE
   ↓
SOCKET.IO
   ↓
COMMAND INTERPRETER
   ↓
GAME MANAGER + ROBOT MOVEMENT
   ↓
HOST ANIMATES TILE-BY-TILE
   ↓
GRAB CORE → REACH TARGET → DROP
   ↓
WIN / TIMEOUT
   ↓
CONTROLLER DISCONNECTS
   ↓
FRESH SESSION + QR
```

## Validation performed

- All automated tests pass: **32/32** (28 core movement/animation tests + 4 host/controller/server UI integration checks).
- Server-side JavaScript syntax checked successfully.
- Host and controller inline browser JavaScript syntax checked successfully.
- Game-manager smoke test completed successfully for a complete `MOVE → GRAB → MOVE → DROP` mission.


## Controller / Game Requirements
- The phone uses a radial MOVE control. Drag from the center to choose a movement angle (0–359°) and distance (10–250 px).
- The arena maps 50 px to one grid cell, so a `MOVE 50px @ 90°` command moves one cell right.
- TURN L/R uses a selectable 30°, 45°, 60°, or 90° rotation. Robot movement does not change its rotation.
- The host shows the robot rotation and the latest movement vector (angle + distance) visually.
- GRIP/GRAB and DROP remain discrete commands.
- Pickup/drop cells randomize for every new player session.
