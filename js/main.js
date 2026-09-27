/**
 * Capybara Cannon - Main Game Loop & Controller
 */

import { sound } from './audio.js?v=6';
import { ParticleSystem } from './particles.js?v=6';
import { Capybara } from './capybara.js?v=6';
import { World } from './world.js?v=6';
import { PhysicsEngine } from './physics.js?v=6';
import { UIManager } from './ui.js?v=6';

// Polyfill roundRect for any browser/webview lacking native support
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii = 0) {
    let r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.ui = new UIManager();
    this.audio = sound;
    this.particles = new ParticleSystem();
    this.capybara = new Capybara();
    this.world = new World();
    this.physics = new PhysicsEngine(this.world);

    // States: 'TITLE', 'AIMING', 'CHARGING', 'FLIGHT', 'STOPPED', 'GAMEOVER'
    this.state = 'TITLE';

    // Launch settings
    this.power = 0;
    this.powerDirection = 1;
    this.powerSpeed = 1.6; // meter oscillation speed
    this.minPower = 0.08;
    this.minLaunchSpeed = 480; // low power plop speed
    this.maxLaunchSpeed = 3100; // massive high-velocity cannon blast!
    this.zenBoosts = 1;

    // Run statistics
    this.stats = {
      distance: 0,
      maxAltitude: 0,
      topSpeed: 0,
      tntHit: 0,
      bounces: 0,
      yuzusCollected: 0,
      birdsHit: 0
    };

    // Camera
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1.0,
      targetZoom: 1.0
    };

    // Screen Shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;

    // Timing
    this.lastTime = performance.now();
    this.stopDelayTimer = 0;

    // Input flags
    this.keys = {
      up: false,
      down: false,
      space: false
    };

    this.init();
  }

  init() {
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.bindInputs();
    this.resetRun();

    // Start in Title Screen
    this.state = 'TITLE';
    this.ui.showTitleScreen(true);
    this.ui.showLaunchControls(false);
    this.audio.playTitleMusic();

    requestAnimationFrame((t) => this.loop(t));
  }

  handleResize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    this.world.baseGroundY = this.height * 0.72;
  }

  resetRun() {
    this.state = 'AIMING';
    this.power = 0;
    this.zenBoosts = 1;
    this.stopDelayTimer = 0;

    this.stats = {
      distance: 0,
      maxAltitude: 0,
      topSpeed: 0,
      tntHit: 0,
      bounces: 0,
      yuzusCollected: 0,
      birdsHit: 0
    };

    this.world.reset();
    this.particles.clear();

    const muzzle = this.world.getMuzzlePosition();
    this.capybara.reset(muzzle.x, muzzle.y);

    this.camera.x = this.world.cannonX + 150;
    this.camera.y = this.world.getGroundY(this.world.cannonX) - 100;
    this.camera.zoom = 1.0;

    this.ui.showLaunchControls(true);
    this.ui.setChargingState(false);
    this.ui.updatePowerMeter(0);
    this.ui.updateBoosts(this.zenBoosts);
    this.ui.updateHUD(0, 0, 0);
    this.ui.hideResults();
  }

  bindInputs() {
    // Title music unlock on user gesture
    const unlockTitleAudio = () => {
      if (this.state === 'TITLE' && !this.audio.titleMusicPlaying) {
        this.audio.playTitleMusic();
      }
    };
    window.addEventListener('click', unlockTitleAudio);
    window.addEventListener('touchstart', unlockTitleAudio, { passive: true });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (this.state === 'TITLE') {
        unlockTitleAudio();
      }
      if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.keys.up = true;
      }
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.keys.down = true;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!this.keys.space) {
          this.keys.space = true;
          this.handleActionPress();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.keys.up = false;
      }
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.keys.down = false;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        this.keys.space = false;
        this.handleActionRelease();
      }
    });

    // Launch Button (Mouse & Touch)
    const onActionStart = (e) => {
      e.preventDefault();
      this.handleActionPress();
    };

    const onActionEnd = (e) => {
      e.preventDefault();
      this.handleActionRelease();
    };

    this.ui.launchBtn.addEventListener('mousedown', onActionStart);
    window.addEventListener('mouseup', onActionEnd);

    this.ui.launchBtn.addEventListener('touchstart', onActionStart, { passive: false });
    window.addEventListener('touchend', onActionEnd, { passive: false });

    // Mid-air boost trigger button
    this.ui.airBoostTrigger.addEventListener('click', () => {
      this.triggerZenBoost();
    });

    // Aiming by Mouse Drag / Move
    let isAimDragging = false;
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.state === 'AIMING') {
        isAimDragging = true;
        this.aimWithScreenCoords(e.clientX, e.clientY);
      } else if (this.state === 'FLIGHT') {
        this.triggerZenBoost();
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isAimDragging && (this.state === 'AIMING' || this.state === 'CHARGING')) {
        this.aimWithScreenCoords(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      isAimDragging = false;
    });

    // Touch Aiming
    this.canvas.addEventListener('touchmove', (e) => {
      if ((this.state === 'AIMING' || this.state === 'CHARGING') && e.touches[0]) {
        this.aimWithScreenCoords(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    // UI Buttons
    this.ui.audioBtn.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      this.ui.updateAudioBtn(isMuted);
    });

    this.ui.helpBtn.addEventListener('click', () => {
      this.ui.showHelp(true);
    });

    this.ui.closeHelpBtn.addEventListener('click', () => {
      this.ui.showHelp(false);
    });

    this.ui.replayBtn.addEventListener('click', () => {
      this.resetRun();
    });

    // Title Screen Navigation Buttons
    this.ui.titlePlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.audio.stopTitleMusic();
      this.ui.showTitleScreen(false);
      this.resetRun();
      this.state = 'AIMING';
    });

    this.ui.titleShopBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.ui.showShop(true);
    });

    this.ui.titleAccountBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.ui.showAccount(true);
    });

    this.ui.titleCustomizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.ui.showCustomize(true);
    });

    this.ui.titleSelectionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.ui.showSelection(true);
    });

    // Destination Scaffold Modal Close Buttons
    this.ui.closeShopBtn.addEventListener('click', () => {
      this.ui.showShop(false);
    });

    this.ui.closeAccountBtn.addEventListener('click', () => {
      this.ui.showAccount(false);
    });

    this.ui.closeCustomizeBtn.addEventListener('click', () => {
      this.ui.showCustomize(false);
    });

    this.ui.closeSelectionBtn.addEventListener('click', () => {
      this.ui.showSelection(false);
    });

    // Return to Title Screen from Results Modal
    this.ui.titleReturnBtn.addEventListener('click', () => {
      this.ui.hideResults();
      this.state = 'TITLE';
      this.ui.showTitleScreen(true);
      this.ui.showLaunchControls(false);
      this.audio.playTitleMusic();
    });
  }

  aimWithScreenCoords(clientX, clientY) {
    // Transform screen coords to world coords
    const worldX = (clientX - this.width * 0.5) / this.camera.zoom + this.camera.x;
    const worldY = (clientY - this.height * 0.5) / this.camera.zoom + this.camera.y;

    const cannonY = this.world.getGroundY(this.world.cannonX) - 22;
    const dx = worldX - this.world.cannonX;
    const dy = cannonY - worldY; // inverted because Y is down

    if (dx > 5) {
      let angle = Math.atan2(dy, dx);
      // Clamp angle between 5 deg and 85 deg
      angle = Math.max(5 * Math.PI / 180, Math.min(85 * Math.PI / 180, angle));
      this.world.cannonAngle = angle;
    }
  }

  handleActionPress() {
    if (this.state === 'TITLE') {
      if (!this.audio.titleMusicPlaying) {
        this.audio.playTitleMusic();
      }
      return;
    }
    if (this.state === 'AIMING') {
      this.state = 'CHARGING';
      this.power = this.minPower;
      this.powerDirection = 1;
      this.ui.setChargingState(true);
      this.audio.resume();
    } else if (this.state === 'FLIGHT') {
      this.triggerZenBoost();
    }
  }

  handleActionRelease() {
    if (this.state === 'CHARGING') {
      this.fireCannon();
    }
  }

  calculateLaunchSpeed(power01) {
    const p = Math.max(0, Math.min(1.0, power01));
    // Non-linear power curve: p^1.75 creates huge dramatic difference between low and high power!
    const curve = Math.pow(p, 1.75);
    return this.minLaunchSpeed + curve * (this.maxLaunchSpeed - this.minLaunchSpeed);
  }

  fireCannon() {
    this.state = 'FLIGHT';
    this.ui.showLaunchControls(false);

    // Calculate launch velocity with exponential punch
    const angle = this.world.cannonAngle;
    const speed = this.calculateLaunchSpeed(this.power);

    const muzzle = this.world.getMuzzlePosition();
    this.capybara.x = muzzle.x;
    this.capybara.y = muzzle.y;
    this.capybara.vx = Math.cos(angle) * speed;
    this.capybara.vy = -Math.sin(angle) * speed;
    this.capybara.angle = -angle; // align with barrel
    this.capybara.angularVelocity = (Math.random() - 0.5) * 5;
    this.capybara.inFlight = true;
    this.capybara.setExpression('zen');

    // Bullet-stretch squash effect scaled with blast power
    const stretchFactor = Math.max(0.32, 1.0 - (speed / this.maxLaunchSpeed) * 0.6);
    this.capybara.triggerSquash(stretchFactor);

    // Heavy kickback recoil scaled with power (14px to 42px!)
    const recoilAmount = 14 + this.power * 28;
    this.world.triggerCannonFire(recoilAmount);

    // Dynamic screen shake (8 to 28 intensity!)
    const shakeIntensity = 8 + this.power * 22;
    const shakeDuration = 0.25 + this.power * 0.25;
    this.triggerScreenShake(shakeIntensity, shakeDuration);

    // Explosive cannon audio with thump scaled to launch power
    this.audio.playCannon(this.power);

    // Massive muzzle blast particles scaled with power
    this.particles.emitCannonBlast(muzzle.x, muzzle.y, -angle, 0.8 + this.power * 1.8);

    if (this.power >= 0.86) {
      this.ui.showToast("💥 MAXIMUM CANNON BLAST!", "tnt");
    } else if (this.power >= 0.55) {
      this.ui.showToast("🚀 HIGH POWER LAUNCH!", "boost");
    } else {
      this.ui.showToast("💨 WEAK LAUNCH", "hazard");
    }
  }

  triggerZenBoost() {
    if (this.state !== 'FLIGHT' || this.zenBoosts <= 0) return;

    this.zenBoosts--;
    this.ui.updateBoosts(this.zenBoosts);
    this.audio.playBoost();
    this.particles.emitZenBoost(this.capybara.x, this.capybara.y);
    this.triggerScreenShake(8, 0.2);
    this.ui.showToast("🍊 ZEN BOOST!", "yuzu");

    this.capybara.setExpression('happy', 1.2);
    // Add forward & upward impulse
    this.capybara.vx = Math.max(this.capybara.vx + 280, 520);
    this.capybara.vy = -Math.max(Math.abs(this.capybara.vy) * 0.8 + 260, 480);
    this.capybara.angularVelocity += 8;
  }

  triggerScreenShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05); // clamp delta
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // 1. Aiming angle keyboard controls
    if (this.state === 'AIMING' || this.state === 'CHARGING') {
      const angleSpeed = 1.0 * dt;
      if (this.keys.up) {
        this.world.cannonAngle = Math.min(85 * Math.PI / 180, this.world.cannonAngle + angleSpeed);
      }
      if (this.keys.down) {
        this.world.cannonAngle = Math.max(5 * Math.PI / 180, this.world.cannonAngle - angleSpeed);
      }
    }

    // 2. Power Meter Oscillation in CHARGING
    if (this.state === 'CHARGING') {
      this.power += this.powerDirection * this.powerSpeed * dt;
      if (this.power >= 1.0) {
        this.power = 1.0;
        this.powerDirection = -1;
      } else if (this.power <= this.minPower) {
        this.power = this.minPower;
        this.powerDirection = 1;
      }
      this.ui.updatePowerMeter(this.power);
    }

    // 3. Physics & Capybara update
    if (this.state === 'FLIGHT') {
      this.physics.update(this.capybara, dt, (x, y, intensity) => {
        this.audio.playBounce(intensity);
        this.particles.emitBounce(x, y, intensity);
        this.stats.bounces++;
      });

      this.capybara.update(dt);

      // Check obstacle collisions
      for (const obs of this.world.obstacles) {
        if (obs.checkCollision(this.capybara)) {
          obs.onCollide(this.capybara, this);
        }
      }

      // Check flight stop
      if (!this.capybara.inFlight) {
        this.state = 'STOPPED';
        this.stopDelayTimer = 1.1;
      }

      // Track statistics
      const distanceMeters = Math.max(0, (this.capybara.x - this.world.cannonX) / 10);
      const groundAtX = this.world.getGroundY(this.capybara.x);
      const altitudeMeters = Math.max(0, (groundAtX - this.capybara.y) / 10);
      const speedKmh = (Math.sqrt(this.capybara.vx ** 2 + this.capybara.vy ** 2) / 10) * 3.6;

      this.stats.distance = distanceMeters;
      if (altitudeMeters > this.stats.maxAltitude) this.stats.maxAltitude = altitudeMeters;
      if (speedKmh > this.stats.topSpeed) this.stats.topSpeed = speedKmh;

      this.ui.updateHUD(distanceMeters, altitudeMeters, speedKmh);
    } else if (this.state === 'STOPPED') {
      this.capybara.update(dt);
      this.stopDelayTimer -= dt;
      if (this.stopDelayTimer <= 0) {
        this.state = 'GAMEOVER';
        this.audio.playGameOver();
        this.ui.showResults(this.stats);
      }
    }

    // 4. Update World and Particles
    this.world.update(dt, this.camera.x);
    this.particles.update(dt);

    // 5. Camera Tracking & Dynamic Zoom
    this.updateCamera(dt);

    // 6. Screen shake decay
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
    }
  }

  updateCamera(dt) {
    let targetX = this.world.cannonX + 150;
    let targetY = this.world.getGroundY(this.world.cannonX) - 100;

    if (this.state === 'FLIGHT' || this.state === 'STOPPED' || this.state === 'GAMEOVER') {
      targetX = this.capybara.x + this.capybara.vx * 0.25 + 140;
      targetY = this.capybara.y + this.capybara.vy * 0.15;

      // Keep camera from going too far underground
      const groundY = this.world.getGroundY(this.capybara.x);
      targetY = Math.min(targetY, groundY - 140);

      // Dynamic Zoom based on speed and altitude
      const speed = Math.sqrt(this.capybara.vx ** 2 + this.capybara.vy ** 2);
      const altitude = Math.max(0, groundY - this.capybara.y);

      if (speed > 800 || altitude > 700) {
        this.camera.targetZoom = 0.58;
      } else if (speed > 400 || altitude > 350) {
        this.camera.targetZoom = 0.78;
      } else if (this.state === 'STOPPED' || this.state === 'GAMEOVER') {
        this.camera.targetZoom = 1.15; // close up on cute chill capybara!
      } else {
        this.camera.targetZoom = 0.95;
      }
    } else {
      this.camera.targetZoom = 1.0;
    }

    // Smooth camera interpolation
    this.camera.x += (targetX - this.camera.x) * 6 * dt;
    this.camera.y += (targetY - this.camera.y) * 6 * dt;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 3 * dt;
  }

  render() {
    const width = this.width;
    const height = this.height;

    // 1. Draw Sky and Parallax Background (Screen Space)
    this.world.drawBackground(this.ctx, this.camera, width, height);

    // 2. Set up World Transform with Camera & Screen Shake
    this.ctx.save();

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeDuration > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }

    this.ctx.translate(width * 0.5 + shakeX, height * 0.5 + shakeY);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // 3. Draw Terrain, Obstacles, and Cannon
    this.world.drawWorld(this.ctx, this.camera, width, height);

    // 4. Draw Trajectory Guide in AIMING mode
    if (this.state === 'AIMING' || this.state === 'CHARGING') {
      this.drawTrajectoryGuide(this.ctx);
    }

    // 5. Draw Capybara
    this.capybara.draw(this.ctx);

    // 6. Draw World Particles (smoke, explosions, sparkles)
    this.particles.draw(this.ctx);

    this.ctx.restore();
  }

  drawTrajectoryGuide(ctx) {
    const muzzle = this.world.getMuzzlePosition();
    const angle = this.world.cannonAngle;
    const speed = this.state === 'CHARGING'
      ? this.calculateLaunchSpeed(this.power)
      : this.calculateLaunchSpeed(0.5);

    const vx = Math.cos(angle) * speed;
    const vy = -Math.sin(angle) * speed;

    ctx.save();
    ctx.strokeStyle = this.power >= 0.85 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(254, 240, 138, 0.75)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(muzzle.x, muzzle.y);

    const maxT = 0.45 + (speed / this.maxLaunchSpeed) * 0.4;
    for (let t = 0.05; t <= maxT; t += 0.05) {
      const px = muzzle.x + vx * t;
      const py = muzzle.y + vy * t + 0.5 * this.physics.gravity * t * t;
      ctx.lineTo(px, py);
    }

    ctx.stroke();
    ctx.restore();
  }
}

// Start Game when window loads
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();

  // Temporary Development / Debug Hitbox Visualizer (Disabled by default in production)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debugHitboxes') === '1') {
      document.body.classList.add('debug-hitboxes');
    }
  } catch (e) {}

  window.toggleHitboxDebug = (enable) => {
    const shouldEnable = enable !== undefined ? enable : !document.body.classList.contains('debug-hitboxes');
    document.body.classList.toggle('debug-hitboxes', shouldEnable);
    return shouldEnable;
  };
});
