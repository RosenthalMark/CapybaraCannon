/**
 * Particle System for visual juices, explosions, smoke, and sparkles
 */

export class Particle {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = options.vx ?? (Math.random() * 200 - 100);
    this.vy = options.vy ?? (Math.random() * 200 - 100);
    this.radius = options.radius ?? Math.random() * 5 + 3;
    this.maxRadius = options.maxRadius ?? this.radius * 2;
    this.color = options.color ?? '#fbbf24';
    this.alpha = options.alpha ?? 1.0;
    this.decay = options.decay ?? (Math.random() * 0.8 + 0.6);
    this.gravity = options.gravity ?? 180;
    this.drag = options.drag ?? 0.98;
    this.spin = options.spin ?? (Math.random() * 6 - 3);
    this.angle = Math.random() * Math.PI * 2;
    this.shape = options.shape ?? 'circle'; // 'circle', 'square', 'sparkle', 'smoke', 'feather'
    this.isDead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= Math.pow(this.drag, dt * 60);
    this.vy *= Math.pow(this.drag, dt * 60);
    this.angle += this.spin * dt;

    if (this.shape === 'smoke') {
      this.radius += (this.maxRadius - this.radius) * 3 * dt;
    }

    this.alpha -= this.decay * dt;
    if (this.alpha <= 0) {
      this.alpha = 0;
      this.isDead = true;
    }
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;

    if (this.shape === 'circle' || this.shape === 'smoke') {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, this.radius), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'square') {
      const s = this.radius * 2;
      ctx.fillRect(-this.radius, -this.radius, s, s);
    } else if (this.shape === 'sparkle') {
      // 4-point star
      const r = this.radius;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.5);
      ctx.quadraticCurveTo(0, 0, r * 1.5, 0);
      ctx.quadraticCurveTo(0, 0, 0, r * 1.5);
      ctx.quadraticCurveTo(0, 0, -r * 1.5, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r * 1.5);
      ctx.fill();
    } else if (this.shape === 'feather') {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 1.8, this.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.isDead) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
  }

  clear() {
    this.particles = [];
  }

  // Preset emitters

  emitCannonBlast(x, y, angleRad, scale = 1.0) {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const sparkCount = Math.round(24 * scale);
    const smokeCount = Math.round(18 * scale);

    // Flash & sparks
    for (let i = 0; i < sparkCount; i++) {
      const spread = (Math.random() - 0.5) * 0.7;
      const speed = (Math.random() * 600 + 200) * Math.min(1.5, scale);
      const pAngle = angleRad + spread;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(pAngle) * speed,
        vy: Math.sin(pAngle) * speed,
        radius: (Math.random() * 4 + 2) * Math.min(1.4, scale),
        color: ['#fef08a', '#f59e0b', '#ef4444', '#ffffff'][Math.floor(Math.random() * 4)],
        decay: Math.random() * 1.5 + 1.2,
        gravity: 250,
        shape: 'square'
      }));
    }

    // Heavy Smoke
    for (let i = 0; i < smokeCount; i++) {
      const speed = (Math.random() * 250 + 50) * Math.min(1.4, scale);
      const pAngle = angleRad + (Math.random() - 0.5) * 1.0;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(pAngle) * speed,
        vy: Math.sin(pAngle) * speed,
        radius: (Math.random() * 10 + 8) * Math.min(1.4, scale),
        maxRadius: (Math.random() * 35 + 25) * Math.min(1.5, scale),
        color: ['#e2e8f0', '#94a3b8', '#64748b'][Math.floor(Math.random() * 3)],
        alpha: 0.85,
        decay: Math.random() * 0.7 + 0.4,
        gravity: -20, // gently drifts up
        shape: 'smoke'
      }));
    }
  }

  emitExplosion(x, y) {
    // Fireball center
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 650 + 100;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 12 + 6,
        maxRadius: Math.random() * 40 + 20,
        color: ['#ffdd00', '#ff6600', '#ff2200', '#444444'][Math.floor(Math.random() * 4)],
        alpha: 0.95,
        decay: Math.random() * 1.2 + 0.8,
        gravity: 120,
        shape: 'smoke'
      }));
    }

    // Sparks
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 800 + 150;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 150,
        radius: Math.random() * 3.5 + 1.5,
        color: '#fff',
        decay: Math.random() * 1.8 + 1.0,
        gravity: 400,
        shape: 'sparkle'
      }));
    }
  }

  emitBounce(x, y, intensity = 1) {
    const count = Math.min(Math.floor(intensity * 12) + 4, 25);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.5;
      const speed = Math.random() * 220 * intensity + 50;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        color: ['#4ade80', '#86efac', '#78350f', '#a16207'][Math.floor(Math.random() * 4)],
        decay: Math.random() * 1.5 + 0.8,
        gravity: 450,
        shape: 'square'
      }));
    }
  }

  emitYuzuSparkles(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 300 + 80;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        radius: Math.random() * 6 + 3,
        color: ['#fbbf24', '#fde047', '#fff'][Math.floor(Math.random() * 3)],
        alpha: 1.0,
        decay: Math.random() * 1.0 + 0.7,
        gravity: 100,
        shape: 'sparkle'
      }));
    }
  }

  emitSteam(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push(new Particle(x + (Math.random() - 0.5) * 40, y, {
        vx: (Math.random() - 0.5) * 40,
        vy: -Math.random() * 100 - 40,
        radius: Math.random() * 8 + 6,
        maxRadius: Math.random() * 25 + 15,
        color: '#e0f2fe',
        alpha: 0.6,
        decay: 0.8,
        gravity: -30,
        shape: 'smoke'
      }));
    }
  }

  emitFeathers(x, y) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 250 + 60;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 6 + 4,
        color: ['#ffffff', '#f1f5f9', '#fbcfe8', '#fdba74'][Math.floor(Math.random() * 4)],
        decay: 0.6,
        gravity: 80,
        drag: 0.94,
        spin: Math.random() * 8 - 4,
        shape: 'feather'
      }));
    }
  }

  emitZenBoost(x, y) {
    // Citrus rocket plume behind capybara
    for (let i = 0; i < 28; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 1.0;
      const speed = Math.random() * 400 + 150;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 50,
        radius: Math.random() * 5 + 3,
        color: ['#f59e0b', '#fbbf24', '#ffffff'][Math.floor(Math.random() * 3)],
        decay: 1.6,
        gravity: 150,
        shape: 'sparkle'
      }));
    }
  }

  emitJetpackThrust(x, y, angle = 0) {
    // Small flame spark and smoke puff drifting downward/backward from thruster
    const pAngle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.5;
    const speed = Math.random() * 180 + 80;
    this.particles.push(new Particle(x, y, {
      vx: Math.cos(pAngle) * speed - 60,
      vy: Math.sin(pAngle) * speed + 40,
      radius: Math.random() * 3.5 + 2,
      color: ['#f97316', '#fbbf24', '#ef4444', '#fef08a'][Math.floor(Math.random() * 4)],
      alpha: 0.9,
      decay: 2.8,
      gravity: 80,
      shape: 'circle'
    }));

    if (Math.random() < 0.35) {
      this.particles.push(new Particle(x, y, {
        vx: -Math.random() * 80 - 20,
        vy: Math.random() * 60 + 20,
        radius: Math.random() * 5 + 3,
        maxRadius: Math.random() * 16 + 10,
        color: '#94a3b8',
        alpha: 0.5,
        decay: 1.5,
        gravity: -20,
        shape: 'smoke'
      }));
    }
  }
}
