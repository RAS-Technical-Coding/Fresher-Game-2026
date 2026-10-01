# Freshers-Game-2026

# 8-Bit Retro Robot Game - Implementation Plan

## The Aesthetic: 8-Bit Retro / CRT Arcade
The game will have a strong retro arcade feel:
- **Visuals:** CRT monitor curvature, scanlines, pixelated 8-bit fonts, and side-bar glitch aesthetics.
- **Audio:** Chiptune background music and 8-bit sound effects (beeps, boops) for actions.
- **Movement:** Instead of smooth modern interpolation, the robot should move with snappy, frame-by-frame 8-bit style animations.

---

## Team Roles

### 1. Team Lead & Integration:
- **Role:** Wire everything together. Ensure the UI triggers the Interpreter, which updates the Logic, which tells the Canvas to render.
- **Key Task:** Manage GitHub merge conflicts and keep everyone on schedule.

### 2. UI/UX Developer (`src/ui/`):
- **Role:** Build the HTML/CSS layout focusing entirely on the Retro Aesthetic.
- **Key Tasks:** 
  - Add a CRT scanline overlay using CSS (pointer-events: none).
  - Source and implement an 8-bit web font (like 'Press Start 2P').
  - Style the command input box and timer to look like a vintage terminal.

### 3. Canvas & Graphics Engine (`src/canvas/`):
- **Role:** Render the game world in an 8-bit style.
- **Key Tasks:** 
  - Draw a blocky, high-contrast grid.
  - Render the robot, the box, and the drop zone using pixel-art sprites instead of vector shapes.

### 4. Command Interpreter Engineer (`src/interpreter/`):
- **Role:** Parse the player's text commands.
- **Key Tasks:** 
  - Write regex or string splitting functions to convert `TURN L 60, FWD 100` into `[{action: 'turn', dir: 'L', val: 60}, {action: 'move', val: 100}]`.

### 5. Game State Controller (`src/logic/`):
- **Role:** Handle the core rules of the game.
- **Key Tasks:** 
  - Implement a rigorous 2-minute countdown timer.
  - Build the randomizer to spawn the robot and boxes on a grid system (e.g., 10x10 tiles) instead of exact pixel coordinates to fit the retro theme.

### 6. Animation & Movement (`src/core/`):
- **Role:** Move the robot across the Canvas based on the logic state.
- **Key Tasks:** 
  - Translate the parsed commands into movement.
  - Implement "snappy" grid-based movement (moving from tile to tile) rather than smooth fluid movement, to match the 8-bit vibe.

### 7. Asset Creator & QA Tester (`src/assets/`):
- **Role:** Source the retro assets and break the game.
- **Key Tasks:** 
  - Find free 8-bit sound effects (sfxr/bfxr is great for this).
  - Find or draw simple 16x16 or 32x32 pixel sprites.
  - Aggressively playtest the command inputs to find bugs.

---

### 4 Phase Implementation:

### Barebones & Aesthetics:
- **UI & Assets:** Lock in the CRT CSS overlay, fonts, and background colors. Find all sprites and sounds.
- **Interpreter & Logic:** Get the basic command parser working and generate the randomized grid coordinates.
- **Canvas:** Draw the static grid and placeholder squares for entities.

### Wiring it Together:
- **Lead & Movement:** Connect the Input Box -> Interpreter -> Movement Logic -> Canvas.
- Make the robot physically jump from tile to tile when commands are submitted.
- Add collision detection for picking up and dropping the box.

### Polish & Playtest:
- Implement the 2-minute timer and win/loss screens (styled as "GAME OVER" arcade screens).
- Add the 8-bit sound effects.
- QA tester runs through various edge-case command sequences.

### Delivery:
- Final bug fixes and deployment for Freshers' Day!
