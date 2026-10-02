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

        ctx.fillStyle = '#05070b';
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
        ctx.shadowColor = '#00f6ff';
        ctx.strokeStyle = 'rgba(0,246,255,.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, boardSize, boardSize);
        ctx.restore();

        // tiles
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                ctx.fillStyle = (x + y) % 2 ? '#0b1219' : '#0d171f';
                ctx.fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
                ctx.strokeStyle = 'rgba(45,115,130,.12)';
                ctx.strokeRect(ox + x * cell, oy + y * cell, cell, cell);
            }
        }

        this.drawTarget(ctx, this.state.target, ox, oy, cell);
        if (!this.state.robot?.carrying) this.drawBox(ctx, this.state.box, ox, oy, cell);
        this.drawParticles(ctx, ox, oy, cell);
        this.drawRobot(ctx, this.state.robot, ox, oy, cell);
        this.drawMovementVector(ctx, this.lastVector, this.state.robot, ox, oy, cell);

        // corner brackets
        ctx.strokeStyle = '#16d9e3';
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
        const x = ox + p.x * cell, y = oy + p.y * cell;
        ctx.save();
        ctx.shadowBlur = 18; ctx.shadowColor = '#f4ff4f';
        ctx.strokeStyle = '#f4ff4f'; ctx.lineWidth = 3;
        ctx.strokeRect(x + cell*.18, y + cell*.18, cell*.64, cell*.64);
        ctx.strokeRect(x + cell*.31, y + cell*.31, cell*.38, cell*.38);
        ctx.restore();
        ctx.fillStyle = 'rgba(244,255,79,.08)';
        ctx.fillRect(x, y, cell, cell);
    }

    drawBox(ctx, p, ox, oy, cell) {
        if (!p) return;
        const x = ox + p.x * cell, y = oy + p.y * cell;
        ctx.save();
        ctx.shadowBlur = 14; ctx.shadowColor = '#ff9f1c';
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(x + cell*.25, y + cell*.25, cell*.5, cell*.5);
        ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
        ctx.strokeRect(x + cell*.25, y + cell*.25, cell*.5, cell*.5);
        ctx.strokeStyle = '#5a2c00';
        ctx.beginPath();
        ctx.moveTo(x+cell*.25,y+cell*.25); ctx.lineTo(x+cell*.75,y+cell*.75);
        ctx.moveTo(x+cell*.75,y+cell*.25); ctx.lineTo(x+cell*.25,y+cell*.75);
        ctx.stroke();
        ctx.restore();
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
        ctx.strokeStyle = '#00f6ff'; ctx.fillStyle = '#00f6ff'; ctx.lineWidth = 3;
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
        const size = cell * .52;

        ctx.save();
        ctx.translate(cx, cy);

        // The robot body stays upright. Only the FACE/HEAD marker rotates to
        // one exact cardinal direction. MOVE commands never alter this value;
        // only TURN_L / TURN_R does. This prevents ambiguous diagonal-looking
        // poses and makes the robot's heading easy to read at a glance.
        const heading = {
            angle: (Number(r.rotation ?? ({ NORTH:0,EAST:90,SOUTH:180,WEST:270 }[r.direction] ?? 0)) * Math.PI) / 180
        };

        ctx.shadowBlur = 22; ctx.shadowColor = '#00f6ff';
        ctx.fillStyle = '#b9fbff';
        ctx.fillRect(-size/2, -size/2, size, size);
        ctx.fillStyle = '#172b35';
        ctx.fillRect(-size*.4, size*.35, size*.8, size*.13);

        // Fixed body/eyes.
        ctx.fillStyle = '#14222b';
        ctx.fillRect(-size*.32, -size*.25, size*.64, size*.42);
        ctx.fillStyle = '#00f6ff';
        ctx.fillRect(-size*.2, -size*.12, size*.12, size*.12);
        ctx.fillRect(size*.08, -size*.12, size*.12, size*.12);

        // A single, clearly cardinal head indicator.
        ctx.save();
        ctx.rotate(heading.angle);
        ctx.fillStyle = '#f4ff4f';
        ctx.fillRect(-size*.09, -size*.66, size*.18, size*.18);
        ctx.beginPath();
        ctx.moveTo(0, -size*.82);
        ctx.lineTo(-size*.14, -size*.61);
        ctx.lineTo(size*.14, -size*.61);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();
        ctx.save(); ctx.fillStyle = '#dfff3f'; ctx.font = '9px Share Tech Mono, monospace'; ctx.fillText(`${Math.round(r.rotation ?? 0)}°`, cx + size*.4, cy - size*.55); ctx.restore();

        if (r.carrying) {
            ctx.fillStyle = '#ff9f1c';
            ctx.fillRect(cx - cell*.16, cy - cell*.78, cell*.32, cell*.32);
        }
    }

    drawParticles(ctx, ox, oy, cell) {
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(0,246,255,${Math.max(0,p.life)*.35})`;
            ctx.fillRect(ox + p.x*cell, oy + p.y*cell, 3, 3);
        });
    }
}

if (typeof module !== 'undefined') module.exports = { GameRenderer };
