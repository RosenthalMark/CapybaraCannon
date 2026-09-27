/**
 * Interactive Obstacles & Boosters
 * TNT, Trampolines, Yuzus, Hot Springs, Pelicans, and Cacti
 */

export class Obstacle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.width = 40;
    this.height = 40;
    this.animTimer = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.animTimer += dt * 3;
  }

  checkCollision(capy) {
    if (!this.active) return false;

    // Approximate distance collision
    const dx = capy.x - this.x;
    const dy = capy.y - (this.y - this.height * 0.5);
    const distSq = dx * dx + dy * dy;
    const hitRadius = (this.width * 0.5) + capy.radius;

    return distSq < hitRadius * hitRadius;
  }

  draw(ctx) {
    // Overridden by subclasses
  }
}

export class TNT extends Obstacle {
  constructor(x, y) {
    super(x, y, 'tnt');
    this.width = 38;
    this.height = 44;
  }

  onCollide(capy, engine) {
    this.active = false;
    engine.stats.tntHit++;
    engine.audio.playExplosion();
    engine.particles.emitExplosion(this.x, this.y - 20);
    engine.triggerScreenShake(16, 0.45);
    engine.ui.showToast("💥 MEGA TNT BLAST!", "tnt");

    capy.setExpression('surprised', 1.8);
    // Super blast: launch forward and skyward with extreme impulse
    capy.vx = Math.max(Math.abs(capy.vx) * 1.35, 750) + (Math.random() * 80);
    capy.vy = -Math.max(Math.abs(capy.vy) * 1.25, 800) - (Math.random() * 120);
    capy.angularVelocity = (Math.random() - 0.5) * 20;
    capy.triggerSquash(0.5);
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red TNT Barrel
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(-16, -42, 32, 42, 6);
    ctx.fill();

    // Dark bands
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(-16, -36, 32, 5);
    ctx.fillRect(-16, -12, 32, 5);

    // "TNT" text in white / yellow
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', 0, -23);

    // Fuse and spark
    const fuseWiggle = Math.sin(this.animTimer * 4) * 2;
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.quadraticCurveTo(fuseWiggle, -50, 6 + fuseWiggle, -52);
    ctx.stroke();

    // Sparkle on fuse
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(6 + fuseWiggle, -52, 2.5 + Math.sin(this.animTimer * 6) * 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Trampoline extends Obstacle {
  constructor(x, y) {
    super(x, y, 'trampoline');
    this.width = 54;
    this.height = 28;
    this.squash = 1.0;
  }

  update(dt) {
    super.update(dt);
    this.squash += (1.0 - this.squash) * 10 * dt;
  }

  onCollide(capy, engine) {
    engine.stats.bounces++;
    engine.audio.playBoing();
    engine.particles.emitBounce(this.x, this.y - 10, 1.5);
    engine.triggerScreenShake(6, 0.25);
    engine.ui.showToast("🍄 BOING!", "spring");

    this.squash = 0.4;
    capy.setExpression('surprised', 1.2);
    capy.vy = -Math.max(Math.abs(capy.vy) * 1.3, 750);
    capy.vx = Math.max(capy.vx * 1.08, 300);
    capy.angularVelocity += 6;
    capy.triggerSquash(0.55);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Giant Bouncy Mushroom style trampoline
    const capHeight = 18 * this.squash;
    const stemHeight = 14 * this.squash;

    // Stem
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(-8, -stemHeight, 16, stemHeight);

    // Mushroom Cap
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(0, -stemHeight, 26, capHeight, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Cap spots
    ctx.fillStyle = '#a7f3d0';
    ctx.beginPath();
    ctx.arc(-12, -stemHeight - capHeight * 0.4, 4, 0, Math.PI * 2);
    ctx.arc(10, -stemHeight - capHeight * 0.5, 5, 0, Math.PI * 2);
    ctx.arc(0, -stemHeight - capHeight * 0.7, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Yuzu extends Obstacle {
  constructor(x, y) {
    super(x, y, 'yuzu');
    this.width = 32;
    this.height = 32;
    this.floatOffset = Math.random() * Math.PI * 2;
  }

  onCollide(capy, engine) {
    this.active = false;
    engine.stats.yuzusCollected++;
    engine.audio.playYuzu();
    engine.particles.emitYuzuSparkles(this.x, this.y);
    engine.ui.showToast("🍊 CITRUS TURBO!", "yuzu");

    capy.setExpression('happy', 1.5);
    capy.vx = Math.max(capy.vx + 260, 550);
    capy.vy = Math.min(capy.vy - 160, -180);
    capy.glideBoostTimer = 1.2;
  }

  draw(ctx) {
    if (!this.active) return;
    const floatY = Math.sin(this.animTimer + this.floatOffset) * 8;

    ctx.save();
    ctx.translate(this.x, this.y + floatY);

    // Golden halo glow
    ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // Orange fruit
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-3, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Green leaf
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(3, -12, 5, 2.5, 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class HotSpring extends Obstacle {
  constructor(x, y) {
    super(x, y, 'hotspring');
    this.width = 80;
    this.height = 20;
    this.steamTimer = 0;
  }

  update(dt) {
    super.update(dt);
    this.steamTimer += dt;
  }

  onCollide(capy, engine) {
    engine.audio.playSplash();
    engine.particles.emitSteam(this.x, this.y - 6);
    engine.ui.showToast("♨️ ONENESS SPA!", "spring");

    capy.setExpression('happy', 2.0);
    // Smooth high speed glide, neutralizes downward crash
    capy.vy = Math.min(capy.vy, -120);
    capy.vx = Math.max(capy.vx + 180, 480);
    capy.glideBoostTimer = 1.5;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Mud / Pool Basin
    ctx.fillStyle = '#3e2714';
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mineral water
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(0, -2, 36, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Steam wisps
    const wisp1 = Math.sin(this.animTimer * 2) * 6;
    const wisp2 = Math.cos(this.animTimer * 2.5) * 6;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12 + wisp1, -6);
    ctx.quadraticCurveTo(-16 + wisp1, -16, -10 + wisp1, -24);
    ctx.moveTo(12 + wisp2, -6);
    ctx.quadraticCurveTo(8 + wisp2, -16, 14 + wisp2, -24);
    ctx.stroke();

    ctx.restore();
  }
}

export class Pelican extends Obstacle {
  constructor(x, y) {
    super(x, y, 'pelican');
    this.width = 46;
    this.height = 42;
    this.floatY = Math.sin(this.animTimer) * 10;
  }

  update(dt) {
    super.update(dt);
  }

  onCollide(capy, engine) {
    this.active = false;
    engine.stats.birdsHit++;
    engine.audio.playBird();
    engine.particles.emitFeathers(this.x, this.y - 20);
    engine.ui.showToast("🐦 PELICAN BOOST!", "yuzu");

    capy.setExpression('happy', 1.5);
    // Flap lift: lifts capybara high into the air
    capy.vx = Math.max(capy.vx * 1.15 + 160, 520);
    capy.vy = -Math.max(Math.abs(capy.vy) * 0.9 + 300, 620);
  }

  draw(ctx) {
    if (!this.active) return;
    const float = Math.sin(this.animTimer * 2) * 6;

    ctx.save();
    ctx.translate(this.x, this.y + float);

    // Large white/pink body
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, -18, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    const wingAngle = Math.sin(this.animTimer * 4) * 0.3;
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(-4, -18, 12, 7, wingAngle, 0, Math.PI * 2);
    ctx.fill();

    // Big orange beak / pouch
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.moveTo(12, -22);
    ctx.quadraticCurveTo(28, -20, 24, -10);
    ctx.quadraticCurveTo(14, -12, 10, -16);
    ctx.fill();

    // Cute Eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(8, -22, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Cactus extends Obstacle {
  constructor(x, y) {
    super(x, y, 'cactus');
    this.width = 34;
    this.height = 48;
  }

  onCollide(capy, engine) {
    this.active = false;
    engine.audio.playHazard();
    engine.particles.emitBounce(this.x, this.y - 20, 0.6);
    engine.triggerScreenShake(10, 0.25);

    const speed = Math.sqrt(capy.vx * capy.vx + capy.vy * capy.vy);
    if (speed < 260 || capy.isGrounded) {
      // Direct full stop!
      capy.vx = 0;
      capy.vy = 0;
      capy.angularVelocity = 0;
      capy.inFlight = false;
      capy.isSliding = false;
      capy.isGrounded = true;
      capy.setExpression('dizzy', 999);
      engine.ui.showToast("🌵 IMPALED! CACTUS STOP!", "hazard");
    } else {
      // Massive momentum penalty
      capy.vx *= 0.16;
      capy.vy = Math.min(capy.vy * 0.2, 0);
      capy.angularVelocity *= 0.1;
      capy.setExpression('dizzy', 2.0);
      capy.triggerSquash(0.6);
      if (Math.abs(capy.vx) < 30) {
        capy.vx = 0;
        capy.vy = 0;
        capy.inFlight = false;
        capy.isSliding = false;
        capy.isGrounded = true;
        capy.setExpression('dizzy', 999);
      }
      engine.ui.showToast("🌵 OUCH! SPIKED!", "hazard");
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Green Cactus trunk
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.roundRect(-7, -46, 14, 46, 6);
    ctx.fill();

    // Left Arm
    ctx.beginPath();
    ctx.moveTo(-7, -24);
    ctx.lineTo(-16, -24);
    ctx.lineTo(-16, -34);
    ctx.lineTo(-10, -34);
    ctx.lineTo(-10, -20);
    ctx.lineTo(-7, -20);
    ctx.fill();

    // Right Arm
    ctx.beginPath();
    ctx.moveTo(7, -18);
    ctx.lineTo(16, -18);
    ctx.lineTo(16, -28);
    ctx.lineTo(10, -28);
    ctx.lineTo(10, -14);
    ctx.lineTo(7, -14);
    ctx.fill();

    // Thorns
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-10, -38, 3, 2);
    ctx.fillRect(7, -32, 3, 2);
    ctx.fillRect(-2, -26, 3, 2);

    ctx.restore();
  }
}

export class MudPit extends Obstacle {
  constructor(x, y) {
    super(x, y, 'mud');
    this.width = 75;
    this.height = 16;
  }

  onCollide(capy, engine) {
    engine.audio.playSplash();
    engine.particles.emitSteam(this.x, this.y - 4);
    engine.triggerScreenShake(6, 0.18);

    const speed = Math.sqrt(capy.vx * capy.vx + capy.vy * capy.vy);
    capy.vy = 0; // absorb vertical bounce into the mud

    if (speed < 240 || capy.isGrounded) {
      capy.vx = 0;
      capy.vy = 0;
      capy.inFlight = false;
      capy.isSliding = false;
      capy.isGrounded = true;
      capy.setExpression('dizzy', 999);
      engine.ui.showToast("💩 STUCK IN WETLAND MUD!", "hazard");
    } else {
      capy.vx *= 0.14;
      capy.setExpression('surprised', 1.5);
      engine.ui.showToast("🌾 HEAVY MUD DRAG!", "hazard");
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Mud Pit Basin
    ctx.fillStyle = '#2d1810';
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gooey inner mud
    ctx.fillStyle = '#45220c';
    ctx.beginPath();
    ctx.ellipse(0, -1, 32, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mud bubbles
    const bubble1 = Math.sin(this.animTimer * 3) * 3;
    ctx.fillStyle = '#5c2d10';
    ctx.beginPath();
    ctx.arc(-14, -2, Math.max(1, 3 + bubble1 * 0.5), 0, Math.PI * 2);
    ctx.arc(12, -3, Math.max(1, 2.5 - bubble1 * 0.4), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
