# Freshers-Game-2026

# 8-Bit Retro Robot Game - Implementation Plan

## The Architecture: Remote Mobile Controller & QR System
To support a dynamic, interactive experience for freshers, the game operates on a **Second-Screen Client-Server Architecture**:
- **Host System (Laptop/Server):** Runs a Node.js web server with WebSockets (Socket.io). It displays the main game visual on the laptop. When idle, it shows a large QR code.
- **Controller System (Mobile):** When a user scans the QR code, their phone connects to the session. The phone displays the controller interface (radial wheel, action buttons).
- **Session Flow:** 
  1. Laptop shows "IEEE RAS START" and a QR Code.
  2. Player scans QR and connects -> Game starts on laptop.
  3. Player inputs commands on phone (Turn R/L, Grab, Drop, Exec) which are sent in real-time to the laptop.
  4. Game Over (Win/Loss/Timeout) -> Connection to phone is terminated, phone UI closes, and Laptop generates a new session/QR for the next player.

## The Aesthetic: 8-Bit Retro / CRT Arcade
The game will have a strong retro arcade feel on both the Host and the Mobile Controller:
- **Visuals:** CRT monitor curvature, scanlines, pixelated 8-bit fonts, and side-bar glitch aesthetics.
- **Audio:** Chiptune background music and 8-bit sound effects (beeps, boops) for actions.
- **Movement:** Instead of smooth modern interpolation, the robot should move with snappy, frame-by-frame 8-bit style animations.

---

## Team Roles

### 1. Team Lead & Integration (`src/server/`):
- **Role:** Set up the Node.js/Express server and Socket.io web sockets. Manage the overarching architecture.
- **Key Task:** Wire the Mobile Controller events to the Host Game instance, handle session IDs, generate the QR codes dynamically, and enforce the "one player at a time" connection flow.

### 2. UI/UX Developer (`src/ui/`):
- **Role:** Build the HTML/CSS layouts for BOTH the Laptop Host screen and the Mobile Controller screen.
- **Key Tasks:** 
  - Add a CRT scanline overlay using CSS (pointer-events: none).
  - Source and implement an 8-bit web font (like 'Press Start 2P').
  - Build the Mobile UI: Angle radial wheel, "Turn R", "Turn L", "GRAB", "Drop", and "EXEC" buttons. 

### 3. Canvas & Graphics Engine (`src/canvas/`):
- **Role:** Render the game world in an 8-bit style on the Laptop Host screen.
- **Key Tasks:** 
  - Draw a blocky, high-contrast grid.
  - Render the robot, the box, and the drop zone using pixel-art sprites instead of vector shapes.

### 4. Command Interpreter Engineer (`src/interpreter/`):
- **Role:** Parse the mobile controller inputs.
- **Key Tasks:** 
  - Translate the WebSocket payloads (e.g., `{action: 'EXEC', queue: ['TURN_R', 'MOVE_45']}`) into the logic the game engine can process.

### 5. Game State Controller (`src/logic/`):
- **Role:** Handle the core rules of the game on the Host side.
- **Key Tasks:** 
  - Implement a rigorous 2-minute countdown timer.
  - Build the randomizer to spawn the robot and boxes on a grid system (e.g., 10x10 tiles).
  - Trigger "Game Over" and notify the server to disconnect the mobile client.

### 6. Animation & Movement (`src/core/`):
- **Role:** Move the robot across the Canvas based on the logic state.
- **Key Tasks:** 
  - Translate the parsed commands into movement.
  - Implement "snappy" grid-based movement (moving from tile to tile) to match the 8-bit vibe.

### 7. Asset Creator & QA Tester (`src/assets/`):
- **Role:** Source the retro assets and break the game.
- **Key Tasks:** 
  - Find free 8-bit sound effects.
  - Find or draw simple 16x16 or 32x32 pixel sprites.
  - Test the latency between mobile taps and laptop rendering.

---

### 4 Phase Implementation:

### Phase 1: Server Skeleton & Connection Flow
- Initialize Node.js + Express + Socket.io.
- Create dynamic URL generation and display QR codes on the Laptop.
- Build the basic Mobile Controller view to connect, send a test ping, and disconnect cleanly when reset.

### Phase 2: Barebones & Aesthetics
- **UI & Assets:** Lock in the CRT CSS overlay, fonts, and background colors.
- **Controller UI:** Implement the radial wheel and command buttons on the mobile view.
- **Canvas:** Draw the static grid and placeholder squares for entities on the laptop view.

### Phase 3: Wiring it Together
- Connect Mobile Button Presses -> Socket.io -> Laptop Command Interpreter -> Movement Logic -> Canvas.
- Make the robot physically jump from tile to tile when the "EXEC" command is fired from the phone.
- Add collision detection for picking up and dropping the box.

### Phase 4: Polish & Playtest
- Implement the 2-minute timer and win/loss screens ("GAME OVER").
- Server aggressively disconnects the phone client on Game Over to prepare for the next fresher.
- Add the 8-bit sound effects and test network latency over local Wi-Fi.
