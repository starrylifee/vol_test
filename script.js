const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let timeScale = 1.0;
let eruptionForce = 15;
let particleDensity = 5;
let isErupting = false;
let lastTime = 0;

// UI Elements
const timeScaleInput = document.getElementById('timeScale');
const timeScaleValue = document.getElementById('timeScaleValue');
const eruptionForceInput = document.getElementById('eruptionForce');
const eruptionForceValue = document.getElementById('eruptionForceValue');
const particleCountInput = document.getElementById('particleCount');
const particleCountValue = document.getElementById('particleCountValue');
const eruptBtn = document.getElementById('eruptBtn');

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Event Listeners
timeScaleInput.addEventListener('input', (e) => {
    timeScale = parseFloat(e.target.value);
    timeScaleValue.textContent = timeScale.toFixed(1);
});

eruptionForceInput.addEventListener('input', (e) => {
    eruptionForce = parseInt(e.target.value);
    let label = 'Medium';
    if(eruptionForce < 10) label = 'Low';
    else if(eruptionForce > 20) label = 'Extreme';
    else if(eruptionForce > 15) label = 'High';
    eruptionForceValue.textContent = label;
});

particleCountInput.addEventListener('input', (e) => {
    particleDensity = parseInt(e.target.value);
    let label = 'Medium';
    if(particleDensity <= 3) label = 'Low';
    else if(particleDensity >= 8) label = 'High';
    particleCountValue.textContent = label;
});

eruptBtn.addEventListener('click', () => {
    isErupting = !isErupting;
    eruptBtn.textContent = isErupting ? 'Stop Eruption' : 'Trigger Eruption';
    eruptBtn.style.backgroundColor = isErupting ? '#e74c3c' : 'var(--accent)';
});

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        // Random angle pointing upwards (-pi/2 is straight up, give it a spread)
        const angle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
        // Velocity based on eruption force
        const speed = Math.random() * (eruptionForce * 0.8) + (eruptionForce * 0.2);
        
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.life = 0;
        this.maxLife = Math.random() * 150 + 100;
        this.size = Math.random() * 4 + 2;
        
        // Lava colors: yellow -> orange -> red -> dark gray (smoke)
        this.colorType = Math.random(); // 0-1
    }

    update(dt) {
        // Apply gravity
        const gravity = 0.15;
        this.vy += gravity * dt;

        // Apply air resistance (horizontal mostly)
        this.vx *= Math.pow(0.99, dt);

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life += dt;
    }

    draw(ctx) {
        const lifeRatio = this.life / this.maxLife;
        
        let r, g, b, a;
        
        if (lifeRatio < 0.3) {
            // Bright Yellow/White
            r = 255; g = 255; b = Math.random() * 100; a = 1;
        } else if (lifeRatio < 0.6) {
            // Orange/Red
            r = 255; g = Math.max(0, 150 - (lifeRatio-0.3)*500); b = 0; a = 1 - (lifeRatio-0.3);
        } else {
            // Dark gray/smoke
            const c = 50 - (lifeRatio - 0.6) * 100;
            r = c; g = c; b = c; a = Math.max(0, 1 - lifeRatio);
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + (lifeRatio * 5), 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawVolcano() {
    const cx = width / 2;
    const cy = height;

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(cx - 300, cy);
    ctx.lineTo(cx - 60, cy - 250);
    // Crater
    ctx.lineTo(cx + 60, cy - 250);
    ctx.lineTo(cx + 300, cy);
    ctx.closePath();
    ctx.fill();

    // Lava glow in crater
    const grad = ctx.createLinearGradient(cx, cy - 250, cx, cy - 200);
    grad.addColorStop(0, 'rgba(255, 69, 0, 0.8)');
    grad.addColorStop(1, 'rgba(255, 69, 0, 0)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 250, 60, 10, 0, 0, Math.PI * 2);
    ctx.fill();
}

function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    
    // Calculate raw delta time in frames (assuming 60fps, ~16.6ms per frame)
    let rawDt = (timestamp - lastTime) / (1000 / 60);
    // Cap dt to prevent massive jumps if tab is inactive
    if (rawDt > 5) rawDt = 5;
    
    // Apply user time scale! This is the core of the slow motion feature.
    const dt = rawDt * timeScale;
    
    lastTime = timestamp;

    // Clear canvas with slight fade for motion blur effect
    ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
    ctx.fillRect(0, 0, width, height);

    drawVolcano();

    // Spawn new particles
    if (isErupting) {
        // The faster the time scale, the more particles we should technically spawn to keep density consistent,
        // but spawning based on rawDt makes it look more physically accurate when slowed down.
        const spawnCount = Math.floor(particleDensity * dt);
        const chance = (particleDensity * dt) % 1;
        
        let toSpawn = spawnCount + (Math.random() < chance ? 1 : 0);
        
        // Ensure at least some spawn if erupting but very slow
        if(toSpawn === 0 && Math.random() < (0.5 * timeScale)) {
            toSpawn = 1;
        }

        const craterX = width / 2;
        const craterY = height - 250;

        for (let i = 0; i < toSpawn; i++) {
            // Add some noise to spawn position along the crater
            const startX = craterX + (Math.random() * 80 - 40);
            particles.push(new Particle(startX, craterY));
        }
    }

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(dt);
        p.draw(ctx);

        if (p.life >= p.maxLife || p.y > height || p.x < 0 || p.x > width) {
            particles.splice(i, 1);
        }
    }

    requestAnimationFrame(animate);
}

// Start loop
requestAnimationFrame(animate);
