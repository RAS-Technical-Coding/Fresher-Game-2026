# Freshers' Day Robot Game - Implementation Plan

## Team Structure & Roles (7 Members)

To parallelize the work effectively, here is the suggested role distribution and folder ownership for your 7-member team:

1. **Team Lead & Integration ** - `src/core/`
   - **Role:** Set up the initial project scaffold, ensure modules communicate correctly, and manage the central Game Loop.
2. **UI/UX Developer** - `src/ui/`
   - **Role:** Build the responsive HTML layout, CSS styling, the command input box (or chat log), timer display, and score/status panels.
3. **Canvas & Graphics Engine Developer** - `src/canvas/`
   - **Role:** Work purely on HTML5 Canvas. Draw the arena grid, render the robot sprite with rotation, draw the pick-up box, and the drop zone.
4. **Command Interpreter Engineer** - `src/interpreter/`
   - **Role:** Build the parsing engine. Take raw string inputs (e.g., `TURN L 60, FWD 100, GRIP`) and convert them into structured JSON action queues.
5. **Game State Controller** - `src/logic/`
   - **Role:** Implement the randomizer (generating valid X/Y coords for spawn and drop), timer countdown logic, and collision detection for gripping/dropping.
6. **Animation & Movement Specialist** - `src/core/` & `src/canvas/`
   - **Role:** Translate the parsed commands into smooth visual transitions. Calculate vector movements, rotation interpolation, and handle the "holding box" visual state.
7. **QA Tester & Asset Manager** - `src/assets/` & `tests/`
   - **Role:** Source or create 2D sprites (robot, box, zones), sound effects, and write edge-case test sequences to ensure the game doesn't break if a user enters weird commands.

---

## 4-Phase Implementation Plan

### Phase 1: Skeleton & Setup
- Initialize the Git repository.
- Setup basic HTML structure with a blank `<canvas>` and an `<input>` field.
- **Canvas Team:** Draw a basic static grid and place placeholder colored squares for the Robot, Box, and Drop Zone.
- **Interpreter Team:** Write a basic JS function that splits a string by commas and spaces to extract commands.

### Phase 2: Core Mechanics
- **Logic Team:** Implement coordinate generation ensuring the box and drop zone never overlap the robot's start position. Add basic distance-checking functions (collision).
- **Movement Team:** Make the robot instantly jump to coordinates based on simple commands (no animation yet, just logic verification).
- **UI Team:** Connect the command input box so it sends text to the Interpreter when "Enter" or "Send" is pressed.

### Phase 3: Animation & Polish
- **Movement & Canvas Teams:** Implement `requestAnimationFrame`. When a command like `FWD 100` is read, smoothly animate the robot's X/Y over a set duration. Animate rotation for `TURN`.
- **Logic Team:** Combine the "GRIP" command with collision detection. If the robot is within threshold of the box, visually attach the box to the robot.
- **UI Team:** Hook up the 2-minute countdown timer and game over / victory modals.

### Phase 4: Testing & Balancing
- **QA:** Playtest the game. Check edge cases like the robot moving out of bounds, trying to grip thin air, or sending empty commands.
- Adjust movement speed and turning speed to ensure tasks are doable within the 2-minute time limit but still challenging.

---

## Folder Structure

The following directories have been created in your workspace:
* `src/assets/` - Images, sprites, and sounds.
* `src/ui/` - HTML layout, CSS styles, DOM manipulation scripts.
* `src/canvas/` - Grid rendering, entity drawing, visual feedback.
* `src/interpreter/` - String parsing and command queuing.
* `src/logic/` - Game state, collisions, math helpers, randomizer.
* `src/core/` - Main game loop, central event bus tying it all together.
* `docs/` - Documentation, API specs for team members.
* `tests/` - QA test scripts and command sequence test cases.
