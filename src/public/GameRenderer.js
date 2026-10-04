class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.state = null;
        this.particles = [];
        this.lastVector = null;
        this.lastTime = performance.now();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        requestAnimationFrame(t => this.loop(t));
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.floor(rect.width * dpr);
        this.canvas.height = Math.floor(rect.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = rect.width;
        this.height = rect.height;
    }

    setState(state) {
        this.state = state;
        // The canvas starts inside a hidden screen, so its first measurement
        // can be 0x0. Re-measure whenever state arrives after the game opens.
        this.resize();
        if (state?.robot) this.spawnTrail(state.robot);
    }

    setMovementVector(vector) {
        this.lastVector = vector ? { ...vector } : null;
    }

    animateRobot(snapshot) {
        if (!this.state) return;
        this.state.robot = { ...snapshot };
        this.spawnTrail(snapshot);
    }

    spawnTrail(robot) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: robot.x + 0.5,
                y: robot.y + 0.5,
                life: 1,
                vx: (Math.random() - 0.5) * 0.02,
                vy: (Math.random() - 0.5) * 0.02
            });
        }
    }

    loop(now) {
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        this.updateParticles(dt);
        this.draw();
        requestAnimationFrame(t => this.loop(t));
    }

    updateParticles(dt) {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt * 1.8;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width || 800;
        const h = this.height || 600;
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#08091d';
        ctx.fillRect(0, 0, w, h);

        if (!this.state) return;

        const n = this.state.gridSize || 10;
        const boardSize = Math.min(w * 0.86, h * 0.88);
        const ox = (w - boardSize) / 2;
        const oy = (h - boardSize) / 2;
        const cell = boardSize / n;

        // board glow
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#5279e8';
        ctx.strokeStyle = 'rgba(98,131,224,.38)';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, boardSize, boardSize);
        ctx.restore();

        // tiles
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                ctx.fillStyle = (x + y) % 2 ? '#171a35' : '#1d2141';
                ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
                ctx.fillStyle = 'rgba(9,10,29,.32)';
                ctx.fillRect(ox + x * cell, oy + y * cell + cell - 2, cell, 2);
            }
        }

        this.drawTarget(ctx, this.state.target, ox, oy, cell);
        if (!this.state.robot?.carrying) this.drawBox(ctx, this.state.box, ox, oy, cell);
        this.drawParticles(ctx, ox, oy, cell);
        this.drawRobot(ctx, this.state.robot, ox, oy, cell);
        this.drawMovementVector(ctx, this.lastVector, this.state.robot, ox, oy, cell);

        // corner brackets
        ctx.strokeStyle = '#657fd0';
        ctx.lineWidth = 3;
        const s = 18;
        [[ox,oy,1,1],[ox+boardSize,oy,-1,1],[ox,oy+boardSize,1,-1],[ox+boardSize,oy+boardSize,-1,-1]]
            .forEach(([x,y,dx,dy]) => {
                ctx.beginPath();
                ctx.moveTo(x + dx*s, y); ctx.lineTo(x,y); ctx.lineTo(x,y + dy*s);
                ctx.stroke();
            });
    }

    drawTarget(ctx, p, ox, oy, cell) {
        if (!p) return;
        const x = ox + (p.x + .5) * cell, y = oy + (p.y + .5) * cell, s = cell * .64;
        // EVE: a tiny hand-drawn block sprite, built from crisp rectangles.
        const px = s / 12, put = (gx, gy, gw, gh, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x-s/2+gx*px), Math.round(y-s/2+gy*px), Math.ceil(gw*px), Math.ceil(gh*px)); };
        ctx.fillStyle = 'rgba(74,94,177,.18)'; ctx.fillRect(x-cell*.42,y-cell*.42,cell*.84,cell*.84);
        put(3,0,6,1,'#f4f5ff'); put(2,1,8,1,'#e6e9fa'); put(1,2,10,6,'#f4f5ff');
        put(2,8,8,2,'#d8def6'); put(4,10,4,1,'#b7c3eb');
        put(3,3,6,2,'#171a35'); put(4,3,1,1,'#55baff'); put(7,3,1,1,'#55baff');
        put(0,4,1,3,'#c6d0f2'); put(11,4,1,3,'#c6d0f2');
    }

    drawBox(ctx, p, ox, oy, cell) {
        if (!p) return;
        const x = ox + (p.x + .5) * cell, y = oy + (p.y + .5) * cell, s = cell*.62, px=s/12;
        const put=(gx,gy,gw,gh,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x-s/2+gx*px),Math.round(y-s/2+gy*px),Math.ceil(gw*px),Math.ceil(gh*px));};
        // Boot held in WALL-E's rusty gripper, with a little living plant.
        put(2,6,8,5,'#633d32'); put(1,7,10,3,'#9d6040'); put(2,10,8,2,'#50312e');
        put(4,3,1,4,'#4f9b54'); put(5,2,3,1,'#75c75d'); put(7,1,2,2,'#4f9b54'); put(3,3,2,1,'#75c75d');
        put(2,7,8,1,'#d3944c'); put(5,8,2,2,'#342640');
    }

    drawMovementVector(ctx, vector, robot, ox, oy, cell) {
        if (!vector || !robot) return;
        const angle = Number(vector.angleDeg) || 0;
        const len = Math.min(cell * 1.8, Math.max(cell * 0.7, (Number(vector.distancePx) || 50) / 50 * cell));
        const cx = ox + (robot.x + .5) * cell;
        const cy = oy + (robot.y + .5) * cell;
        const rad = angle * Math.PI / 180;
        const ex = cx + Math.sin(rad) * len;
        const ey = cy - Math.cos(rad) * len;
        ctx.save();
        ctx.strokeStyle = '#80baff'; ctx.fillStyle = '#80baff'; ctx.lineWidth = 3;
        ctx.setLineDash([7,5]);
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(ex,ey); ctx.stroke();
        ctx.setLineDash([]);
        const head = 10;
        ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(ex - Math.sin(rad-.55)*head, ey + Math.cos(rad-.55)*head); ctx.lineTo(ex - Math.sin(rad+.55)*head, ey + Math.cos(rad+.55)*head); ctx.closePath(); ctx.fill();
        ctx.font = '10px Share Tech Mono, monospace'; ctx.fillText(`MOVE ${Math.round(vector.distancePx || 0)}px @ ${Math.round(angle)}°`, ex + 8, ey - 8);
        ctx.restore();
    }

    drawRobot(ctx, r, ox, oy, cell) {
        if (!r) return;
        const cx = ox + (r.x + .5) * cell;
        const cy = oy + (r.y + .5) * cell;
        const size = cell * .72;

        ctx.save();
        ctx.translate(cx, cy);

        // The robot body stays upright. Only the FACE/HEAD marker rotates to
        // one exact cardinal direction. MOVE commands never alter this value;
        // only TURN_L / TURN_R does. This prevents ambiguous diagonal-looking
        // poses and makes the robot's heading easy to read at a glance.
        const heading = {
            angle: (Number(r.rotation ?? ({ NORTH:0,EAST:90,SOUTH:180,WEST:270 }[r.direction] ?? 0)) * Math.PI) / 180
        };

        const px=size/16, put=(gx,gy,gw,gh,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(-size/2+gx*px),Math.round(-size/2+gy*px),Math.ceil(gw*px),Math.ceil(gh*px));};
        // WALL-E's binocular head, square chassis, and tracked base.
        put(2,3,12,8,'#b96d2c'); put(3,2,10,2,'#e1a646'); put(1,5,2,5,'#8d4c2d');
        put(3,11,10,2,'#d49443'); put(2,13,12,2,'#30344d'); put(0,12,4,3,'#4d5265'); put(12,12,4,3,'#4d5265');
        put(2,13,2,1,'#22263b'); put(6,13,2,1,'#22263b'); put(10,13,2,1,'#22263b');
        put(3,0,5,5,'#dca951'); put(8,0,5,5,'#dca951'); put(4,1,3,3,'#f1e8cd'); put(9,1,3,3,'#f1e8cd');
        put(5,2,2,2,'#171a35'); put(10,2,2,2,'#171a35'); put(5,2,1,1,'#83c9fa'); put(10,2,1,1,'#83c9fa');
        // Direction notch rotates with the programmed heading.
        ctx.save(); ctx.rotate(heading.angle); put(7,-2,2,3,'#ffdc78'); ctx.restore();

        ctx.restore();
        ctx.save(); ctx.fillStyle = '#f4c35a'; ctx.font = '9px Share Tech Mono, monospace'; ctx.fillText(`${Math.round(r.rotation ?? 0)}°`, cx + size*.4, cy - size*.55); ctx.restore();

        if (r.carrying) {
            this.drawBox(ctx, {x:r.x + .45,y:r.y - .25}, ox, oy, cell);
        }
    }

    drawParticles(ctx, ox, oy, cell) {
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(128,186,255,${Math.max(0,p.life)*.35})`;
            ctx.fillRect(Math.round(ox + p.x*cell), Math.round(oy + p.y*cell), 3, 3);
        });
    }
}

if (typeof module !== 'undefined') module.exports = { GameRenderer };
