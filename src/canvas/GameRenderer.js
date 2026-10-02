class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.state = null;
        this.particles = [];
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

    drawRobot(ctx, r, ox, oy, cell) {
        if (!r) return;
        const cx = ox + (r.x + .5) * cell;
        const cy = oy + (r.y + .5) * cell;
        const size = cell * .52;

        ctx.save();
        ctx.translate(cx, cy);
        const rot = { NORTH: 0, EAST: Math.PI/2, SOUTH: Math.PI, WEST: -Math.PI/2 }[r.direction] || 0;
        ctx.rotate(rot);
        ctx.shadowBlur = 22; ctx.shadowColor = '#00f6ff';
        ctx.fillStyle = '#b9fbff';
        ctx.fillRect(-size/2, -size/2, size, size);
        ctx.fillStyle = '#14222b';
        ctx.fillRect(-size*.32, -size*.28, size*.64, size*.45);
        ctx.fillStyle = '#00f6ff';
        ctx.fillRect(-size*.2, -size*.15, size*.12, size*.12);
        ctx.fillRect(size*.08, -size*.15, size*.12, size*.12);
        ctx.fillStyle = '#172b35';
        ctx.fillRect(-size*.4, size*.42, size*.8, size*.12);
        // antenna
        ctx.strokeStyle = '#00f6ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0,-size*.5); ctx.lineTo(0,-size*.78); ctx.stroke();
        ctx.fillStyle = '#f4ff4f'; ctx.fillRect(-3,-size*.84,6,6);
        ctx.restore();

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
