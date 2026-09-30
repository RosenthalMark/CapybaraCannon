/**
 * Capybara Entity
 * Renders the iconic chill capybara with yuzu fruit on head, animated expressions,
 * squash/stretch bounce physics, and rotation.
 */

import { GlobalSprites, AnimationPlayer } from './sprites.js';

export class Capybara {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 28; // collision radius (scaled up for close-up view)
    this.angle = 0;
    this.angularVelocity = 0;

    // Visual squash & stretch
    this.scaleX = 1.0;
    this.scaleY = 1.0;

    // Facial expression: 'zen', 'surprised', 'dizzy', 'happy'
    this.expression = 'zen';
    this.expressionTimer = 0;

    // States
    this.inFlight = false;
    this.isGrounded = false;
    this.isSliding = false;
    this.glideBoostTimer = 0; // for hot springs or citrus turbo
    this.crawlTimer = 0;
    this.walkCycle = 0;
    this.hasJetpack = true; // Jetpack Joyride style: permanent core equipment
    this.isThrusting = false;
    this.isParachuting = false;
    this.isRunning = true;
    this.isLethallyHit = false;
    this.hasDoubleJumped = false;

    // Sprite Animation Player
    this.anim = new AnimationPlayer(GlobalSprites);
    this.anim.play('run');
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVelocity = 0;
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.expression = 'zen';
    this.expressionTimer = 0;
    this.inFlight = true;
    this.isGrounded = true;
    this.isSliding = false;
    this.glideBoostTimer = 0;
    this.crawlTimer = 0;
    this.walkCycle = 0;
    this.hasJetpack = true;
    this.isThrusting = false;
    this.isParachuting = false;
    this.isRunning = true;
    this.isLethallyHit = false;
    this.hasDoubleJumped = false;
  }

  setExpression(expr, duration = 1.0) {
    this.expression = expr;
    this.expressionTimer = duration;
  }

  triggerSquash(squashFactor = 0.65) {
    this.scaleY = squashFactor;
    this.scaleX = 1 + (1 - squashFactor) * 0.75;
  }

  update(dt) {
    // Expression countdown
    if (this.expressionTimer > 0) {
      this.expressionTimer -= dt;
      if (this.expressionTimer <= 0) {
        this.expression = this.isGrounded && Math.abs(this.vx) < 5 ? 'dizzy' : 'zen';
      }
    }

    // Glide boost countdown
    if (this.glideBoostTimer > 0) {
      this.glideBoostTimer -= dt;
    }

    // Recover squash/stretch smoothly to 1.0
    this.scaleX += (1.0 - this.scaleX) * 12 * dt;
    this.scaleY += (1.0 - this.scaleY) * 12 * dt;

    // Smooth airborne / flight angle orientation (Jetpack Joyride style)
    if (this.isParachuting) {
      // Parachute stays upright, banking softly to steer tilt
      this.angularVelocity = 0;
    } else if (this.isGrounded) {
      // Grounded: conforms smoothly to terrain slope, zero tumble
      const targetAngle = this.world ? this.world.getGroundSlope(this.x) : 0;
      this.angle += (targetAngle - this.angle) * 12 * dt;
      this.angularVelocity = 0;
    } else if (this.isThrusting) {
      // Jetpack firing: energetic slight upward climb tilt (-0.12 rad / -7 deg)
      const targetAngle = -0.12;
      this.angle += (targetAngle - this.angle) * 10 * dt;
      this.angularVelocity = 0;
    } else if (!this.isGrounded) {
      // Gliding/falling downward: gentle banking with velocity vector (clamped tightly between -0.15 and +0.12 rad)
      const targetAngle = Math.atan2(this.vy, Math.max(160, this.vx)) * 0.28;
      const clampedTarget = Math.max(-0.15, Math.min(0.12, targetAngle));
      this.angle += (clampedTarget - this.angle) * 8 * dt;
      this.angularVelocity = 0;
    } else {
      this.angle += this.angularVelocity * dt;
      this.angularVelocity *= Math.pow(0.96, dt * 60);
    }

    // Sprite animation state selection & update
    if (this.anim) {
      // Scale running animation leg-frequency with horizontal velocity
      let animDt = dt;
      if (this.isGrounded && this.isRunning && this.anim.currentAnim === 'run') {
        const speedScale = Math.min(2.4, Math.max(0.85, Math.abs(this.vx) / 340));
        animDt *= speedScale;
      }
      this.anim.update(animDt);

      if (this.anim.currentAnim === 'jetpack_eject' && !this.anim.isFinished) {
        // Finish eject animation
      } else if (this.isParachuting) {
        if (this.anim.currentAnim !== 'parachute_deploy' && this.anim.currentAnim !== 'parachute_glide') {
          this.anim.play('parachute_deploy');
        } else if (this.anim.currentAnim === 'parachute_deploy' && this.anim.isFinished) {
          this.anim.play('parachute_glide');
        }
      } else if (this.expression === 'dizzy' && this.isGrounded && Math.abs(this.vx) < 20) {
        this.anim.play('dizzy_stars');
      } else if (this.isThrusting) {
        // While firing jetpack, keep energetic athletic running/flying legs active!
        if (this.anim.currentAnim !== 'run') {
          this.anim.play('run');
        }
      } else if (this.anim.currentAnim === 'jump' || this.anim.currentAnim === 'double_jump') {
        if (this.isGrounded) {
          this.anim.play('run');
        } else if (this.anim.frameIndex >= 4) {
          // NEVER freeze on flat belly-flop frame 5 while airborne! Hold athletic tuck (frame 3)
          this.anim.frameIndex = 3;
        }
      } else if (this.isGrounded) {
        if (this.anim.currentAnim !== 'run') {
          this.anim.play('run');
        }
      } else if (!this.isGrounded) {
        // In air without thrust: hold athletic run/flight pose, never flat
        if (this.anim.currentAnim !== 'jump' && this.anim.currentAnim !== 'double_jump') {
          this.anim.play('run');
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Apply flight orientation or tumble angle
    ctx.rotate(this.angle);
    ctx.scale(this.scaleX, this.scaleY);

    if (this.anim && this.anim.canDraw()) {
      if (this.anim.currentAnim === 'dizzy_stars') {
        this.anim.draw(ctx, 84, 64, 0, -4);
      } else if (this.anim.currentAnim === 'parachute_glide' || this.anim.currentAnim === 'parachute_deploy') {
        this.anim.draw(ctx, 90, 136, 0, -32);
      } else if (this.anim.currentAnim === 'jump' || this.anim.currentAnim === 'double_jump') {
        this.anim.draw(ctx, 92, 72, 0, -2);
      } else {
        this.anim.draw(ctx, 92, 64, 0, 0);
      }

      if (this.hasJetpack && !this.isParachuting && (this.inFlight || this.isRunning || this.isThrusting)) {
        this.drawJetpack(ctx);
      }
    } else {
      this.drawCapybaraBody(ctx);
    }

    ctx.restore();
  }

  drawCapybaraBody(ctx) {
    const furColor = '#935c34';
    const darkFur = '#784620';
    const bellyColor = '#a86f44';

    // 1. Back Little Legs / Paws (tucked or running)
    const walkPaw1 = this.walkCycle ? Math.sin(this.walkCycle) * 3 : 0;
    const walkPaw2 = this.walkCycle ? -Math.sin(this.walkCycle) * 3 : 0;

    ctx.fillStyle = darkFur;
    ctx.beginPath();
    ctx.ellipse(-14 + walkPaw1, 16, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(12 + walkPaw2, 16, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main Plump Body (rounded loaf shape)
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.roundRect(-22, -14, 44, 28, 14);
    ctx.fill();

    // 2b. Belly highlight
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Stubby Tail
    ctx.fillStyle = darkFur;
    ctx.beginPath();
    ctx.ellipse(-23, 2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Iconic Capybara Head & Snout (blocky/regal profile facing right)
    this.drawHead(ctx);

    // 5. Jetpack (when equipped)
    if (this.hasJetpack) {
      this.drawJetpack(ctx);
    }
  }

  drawHead(ctx) {
    const furColor = '#935c34';
    const darkFur = '#784620';
    const snoutColor = '#5e3415';
    const innerEar = '#45220c';

    // Head base
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.roundRect(4, -20, 24, 24, 8);
    ctx.fill();

    // Distinct blunt snout
    ctx.fillStyle = snoutColor;
    ctx.beginPath();
    ctx.roundRect(16, -15, 14, 18, [4, 8, 8, 4]);
    ctx.fill();

    // Nostril
    ctx.fillStyle = '#261205';
    ctx.beginPath();
    ctx.arc(26, -9, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Small rounded ear
    ctx.fillStyle = darkFur;
    ctx.beginPath();
    ctx.ellipse(4, -22, 5, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = innerEar;
    ctx.beginPath();
    ctx.ellipse(4, -22, 3, 2.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Facial Expression (Eyes & Mouth)
    this.drawFace(ctx);
  }

  drawJetpack(ctx) {
    ctx.save();
    // Position on capybara's back
    ctx.translate(-8, -2);

    // Jetpack Harness / Strap
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(8, 10);
    ctx.stroke();

    // Twin Thruster Canisters
    const canisterColor = '#94a3b8';
    const canisterHighlight = '#e2e8f0';
    const nozzleColor = '#334155';

    // Left canister
    ctx.fillStyle = canisterColor;
    ctx.beginPath();
    ctx.roundRect(-9, -12, 7, 16, 3);
    ctx.fill();
    ctx.fillStyle = canisterHighlight;
    ctx.fillRect(-8, -10, 2, 12);

    // Right canister
    ctx.fillStyle = canisterColor;
    ctx.beginPath();
    ctx.roundRect(0, -12, 7, 16, 3);
    ctx.fill();
    ctx.fillStyle = canisterHighlight;
    ctx.fillRect(1, -10, 2, 12);

    // Red accent stripes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-9, -5, 7, 2.5);
    ctx.fillRect(0, -5, 7, 2.5);

    // Thruster exhaust nozzles
    ctx.fillStyle = nozzleColor;
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(-2, 4);
    ctx.lineTo(-3, 8);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-1, 4);
    ctx.lineTo(7, 4);
    ctx.lineTo(6, 8);
    ctx.lineTo(0, 8);
    ctx.closePath();
    ctx.fill();

    // Animated exhaust flames when thrusting
    if (this.isThrusting) {
      const flameLen = 8 + Math.random() * 12;

      // Outer orange flame
      ctx.fillStyle = '#f97316';
      // Left flame
      ctx.beginPath();
      ctx.moveTo(-9, 8);
      ctx.lineTo(-3, 8);
      ctx.lineTo(-6, 8 + flameLen);
      ctx.closePath();
      ctx.fill();
      // Right flame
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(6, 8);
      ctx.lineTo(3, 8 + flameLen);
      ctx.closePath();
      ctx.fill();

      // Inner bright yellow flame core
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.lineTo(-4, 8);
      ctx.lineTo(-6, 8 + flameLen * 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(1, 8);
      ctx.lineTo(5, 8);
      ctx.lineTo(3, 8 + flameLen * 0.6);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  drawFace(ctx) {
    const eyeX = 14;
    const eyeY = -12;

    ctx.strokeStyle = '#1e0f05';
    ctx.fillStyle = '#1e0f05';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';

    switch (this.expression) {
      case 'zen': // Calm, serene horizontal slit eyes (-_-)
        ctx.beginPath();
        ctx.moveTo(eyeX - 4, eyeY);
        ctx.lineTo(eyeX + 3, eyeY);
        ctx.stroke();

        // Subtle calm smile
        ctx.beginPath();
        ctx.arc(22, -3, 3.5, 0.2, Math.PI * 0.7);
        ctx.stroke();
        break;

      case 'surprised': // Big round eyes (O_O)
        ctx.beginPath();
        ctx.arc(eyeX, eyeY - 1, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(eyeX + 1, eyeY - 1, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#1e0f05';
        ctx.fill();

        // Small open 'o' mouth
        ctx.beginPath();
        ctx.arc(22, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'dizzy': // X or spiral eyes (x_x)
        // 'x' eye
        ctx.beginPath();
        ctx.moveTo(eyeX - 3, eyeY - 3);
        ctx.lineTo(eyeX + 3, eyeY + 3);
        ctx.moveTo(eyeX + 3, eyeY - 3);
        ctx.lineTo(eyeX - 3, eyeY + 3);
        ctx.stroke();

        // Wobbly mouth
        ctx.beginPath();
        ctx.moveTo(18, -3);
        ctx.lineTo(21, -1);
        ctx.lineTo(24, -4);
        ctx.stroke();
        break;

      case 'happy': // Happy arches (^_^)
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3.5, Math.PI, Math.PI * 2);
        ctx.stroke();

        // Big smile
        ctx.beginPath();
        ctx.arc(22, -4, 4.5, 0.1, Math.PI * 0.85);
        ctx.stroke();
        break;
    }
  }

  drawYuzuOnHead(ctx) {
    const yuzuX = 12;
    const yuzuY = -27;

    // Orange body
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(yuzuX, yuzuY, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Orange highlight
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(yuzuX - 2, yuzuY - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Little green stem & leaf
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(yuzuX, yuzuY - 6);
    ctx.lineTo(yuzuX, yuzuY - 8);
    ctx.stroke();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(yuzuX + 2.5, yuzuY - 8, 3.5, 1.8, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
