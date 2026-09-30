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

    // States: 'TITLE', 'CANNON_LOADING', 'AIMING', 'CHARGING', 'FLIGHT', 'JETPACK_FLIGHT', 'PARACHUTE_GLIDE', 'RUNNER', 'STOPPED', 'GAMEOVER'
    this.state = 'TITLE';

    // Cannon loading intro animation state
    this.loadingPhase = 'READY'; // 'ENTER', 'CLIMB', 'BARREL_ENTRY', 'BARREL_PAUSE', 'HEAD_POP', 'READY'
    this.loadingTimer = 0;
    this.loadingHeadPeek = 4;

    // Connect cannon interior rendering callback
    this.world.onDrawBarrelInterior = (ctx, recoilX) => {
      this.drawLoadedCapybaraInBarrel(ctx, recoilX);
    };

    // Launch settings
    this.power = 0;
    this.powerDirection = 1;
    this.powerSpeed = 1.6; // meter oscillation speed
    this.minPower = 0.08;
    this.minLaunchSpeed = 480; // low power plop speed
    this.maxLaunchSpeed = 3100; // massive high-velocity cannon blast!
    this.zenBoosts = 1;

    // Jetpack & Fuel System (~5.5s continuous thrust capacity)
    this.jetpackMaxFuel = 5.5;
    this.jetpackFuel = 5.5;

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
      left: false,
      right: false,
      space: false
    };
    this.touchSteerDirection = 0; // -1: left, 1: right

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

    // Reset Jetpack & Runner state
    this.jetpackFuel = this.jetpackMaxFuel;
    this.capybara.hasJetpack = false;
    this.capybara.isThrusting = false;
    this.capybara.isParachuting = false;
    this.capybara.isRunning = false;
    this.capybara.hasDoubleJumped = false;
    this.capybara.isLethallyHit = false;
    this.ui.setJetpackActive(false);
    this.ui.updateJetpackFuel(1.0);

    // Development / Test mode check: auto-equip jetpack or show dev button if requested via URL
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isDevMode = urlParams.get('debug') === '1' || urlParams.get('testJetpack') === '1' || urlParams.get('jetpack') === '1';
      if (this.ui.jetpackDevBtn) {
        if (isDevMode) {
          this.ui.jetpackDevBtn.classList.remove('hidden');
        } else {
          this.ui.jetpackDevBtn.classList.add('hidden');
        }
      }
      if (urlParams.get('jetpack') === '1' || urlParams.get('testJetpack') === '1') {
        this.equipJetpack(true);
      }
    } catch (e) {}
  }

  startCannonLoading() {
    this.state = 'CANNON_LOADING';
    this.loadingPhase = 'ENTER';
    this.loadingTimer = 0;
    this.loadingHeadPeek = 0;
    this.ui.showLaunchControls(true);
    if (this.world) this.world.cannonLCDState = 1;
    this.capybara.isGrounded = true;
    if (this.capybara.anim) this.capybara.anim.play('run');

    // Initial position on ground terrace entering from the left
    const startX = this.world.cannonX - 120;
    this.capybara.x = startX;
    this.capybara.y = this.world.getGroundY(startX) - 14;
    this.capybara.vx = 0;
    this.capybara.vy = 0;
    this.capybara.angle = 0;
    this.capybara.angularVelocity = 0;
    this.capybara.walkCycle = 0;
    this.capybara.setExpression('zen');
  }

  finishCannonLoading() {
    this.state = 'AIMING';
    this.loadingPhase = 'READY';
    this.loadingHeadPeek = 4;
    this.loadingTimer = 0;
    this.world.cannonRecoil = 0;
    if (this.world) this.world.cannonLCDState = 0;
    this.capybara.scaleX = 1.0;
    this.capybara.scaleY = 1.0;
    this.capybara.walkCycle = 0;
    this.capybara.setExpression('happy', 1.0);
    this.ui.showLaunchControls(true);

    const muzzle = this.world.getMuzzlePosition();
    this.capybara.x = muzzle.x;
    this.capybara.y = muzzle.y;
    this.capybara.angle = -this.world.cannonAngle;
  }

  updateCannonLoading(dt) {
    this.loadingTimer += dt;
    const cannonX = this.world.cannonX;

    switch (this.loadingPhase) {
      case 'ENTER': {
        const duration = 1.1;
        const progress = Math.min(1.0, this.loadingTimer / duration);
        const startX = cannonX - 120;
        const endX = cannonX - 28;

        this.capybara.x = startX + progress * (endX - startX);
        const curGround = this.world.getGroundY(this.capybara.x);
        this.capybara.walkCycle = progress * Math.PI * 10;
        this.capybara.y = curGround - 14 + Math.abs(Math.sin(this.capybara.walkCycle)) * -3;
        this.capybara.angle = 0;

        if (this.loadingTimer >= duration) {
          this.loadingPhase = 'CLIMB';
          this.loadingTimer = 0;
          this.capybara.walkCycle = 0;
        }
        break;
      }

      case 'CLIMB': {
        const duration = 0.6;
        const progress = Math.min(1.0, this.loadingTimer / duration);
        const ease = progress * progress * (3 - 2 * progress); // smoothstep

        const startX = cannonX - 28;
        const startY = this.world.getGroundY(startX) - 14;
        const muzzle = this.world.getMuzzlePosition();

        this.capybara.x = startX + ease * (muzzle.x - startX);
        this.capybara.y = startY + ease * (muzzle.y - startY);
        this.capybara.angle = -this.world.cannonAngle * ease;
        this.capybara.walkCycle = progress * Math.PI * 6;

        if (this.loadingTimer >= duration) {
          this.loadingPhase = 'BARREL_ENTRY';
          this.loadingTimer = 0;
          this.capybara.walkCycle = 0;
        }
        break;
      }

      case 'BARREL_ENTRY': {
        const duration = 0.5;
        const progress = Math.min(1.0, this.loadingTimer / duration);

        const cos = Math.cos(this.world.cannonAngle);
        const sin = Math.sin(this.world.cannonAngle);
        const muzzle = this.world.getMuzzlePosition();
        const slideDistance = 35 * progress;

        this.capybara.x = muzzle.x - cos * slideDistance;
        this.capybara.y = muzzle.y + sin * slideDistance;
        this.capybara.angle = -this.world.cannonAngle;

        this.capybara.scaleX = 1.0 - progress * 0.25;
        this.capybara.scaleY = 1.0 - progress * 0.25;

        if (this.loadingTimer >= duration) {
          this.loadingPhase = 'BARREL_PAUSE';
          this.loadingTimer = 0;
          this.capybara.scaleX = 1.0;
          this.capybara.scaleY = 1.0;
          this.particles.emitBounce(muzzle.x, muzzle.y, 0.25);
        }
        break;
      }

      case 'BARREL_PAUSE': {
        const duration = 0.9;
        this.world.cannonRecoil = Math.sin(this.loadingTimer * 28) * 1.5;

        if (this.loadingTimer >= duration) {
          this.loadingPhase = 'HEAD_POP';
          this.loadingTimer = 0;
          this.world.cannonRecoil = 0;
        }
        break;
      }

      case 'HEAD_POP': {
        const duration = 0.35;
        const progress = Math.min(1.0, this.loadingTimer / duration);
        const popEase = Math.sin(progress * Math.PI * 0.5 * 1.25);
        this.loadingHeadPeek = -14 + popEase * 18;
        this.capybara.setExpression('happy', 1.0);

        if (this.loadingTimer >= duration) {
          this.finishCannonLoading();
        }
        break;
      }
    }

    this.capybara.update(dt);
  }

  drawLoadedCapybaraInBarrel(ctx, recoilX) {
    if (this.state === 'CANNON_LOADING' && this.loadingPhase === 'BARREL_ENTRY') {
      ctx.save();
      const progress = Math.min(1.0, this.loadingTimer / 0.5);
      const slide = progress * 30;
      ctx.translate(recoilX + 66 - slide, -86);
      const scale = 1.0 - progress * 0.25;
      ctx.scale(scale, scale);
      this.capybara.drawHead(ctx);
      ctx.restore();
      return;
    }

    const isPeeking = this.state === 'AIMING' || this.state === 'CHARGING' ||
      (this.state === 'CANNON_LOADING' && (this.loadingPhase === 'HEAD_POP' || this.loadingPhase === 'READY'));

    if (isPeeking) {
      ctx.save();
      let peek = this.loadingHeadPeek ?? 4;
      if (this.state === 'CHARGING') {
        peek -= this.power * 8; // pull back slightly during charge
      }
      ctx.translate(recoilX + 66 + peek, -86);
      ctx.rotate(-this.world.cannonAngle * 0.4);
      this.capybara.drawHead(ctx);
      ctx.restore();
    }
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
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = true;
      }
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = true;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!this.keys.space) {
          this.keys.space = true;
          this.onActionDown();
        }
      }
      if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J') {
        this.toggleJetpack();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.keys.up = false;
      }
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.keys.down = false;
      }
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = false;
      }
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = false;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        this.keys.space = false;
        this.onActionUp();
      }
    });

    // Launch Button (Mouse & Touch)
    const onActionStart = (e) => {
      e.preventDefault();
      this.onActionDown();
    };

    const onActionEnd = (e) => {
      e.preventDefault();
      this.onActionUp();
    };

    this.ui.launchBtn.addEventListener('mousedown', onActionStart);
    window.addEventListener('mouseup', onActionEnd);

    this.ui.launchBtn.addEventListener('touchstart', onActionStart, { passive: false });
    window.addEventListener('touchend', onActionEnd, { passive: false });
    window.addEventListener('touchcancel', onActionEnd, { passive: false });

    // Mid-air boost trigger button
    this.ui.airBoostTrigger.addEventListener('click', () => {
      this.onActionDown();
    });

    // Development / Test Jetpack Toggle Button
    if (this.ui.jetpackDevBtn) {
      this.ui.jetpackDevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleJetpack();
      });
    }

    // Aiming by Mouse Drag / Move & Flight Action Down
    let isAimDragging = false;
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.state === 'AIMING') {
        isAimDragging = true;
        this.aimWithScreenCoords(e.clientX, e.clientY);
      } else if (this.state === 'CANNON_LOADING') {
        this.finishCannonLoading();
      } else if (this.state === 'PARACHUTE_GLIDE') {
        // Click left or right of center to steer parachute
        this.touchSteerDirection = e.clientX < window.innerWidth * 0.5 ? -1 : 1;
      } else if (this.state === 'FLIGHT' || this.state === 'JETPACK_FLIGHT' || this.state === 'RUNNER') {
        this.onActionDown();
      }
    });

    window.addEventListener('mouseup', () => {
      isAimDragging = false;
      this.touchSteerDirection = 0;
    });

    // Canvas Touch in Flight / Jetpack / Parachute / Runner
    this.canvas.addEventListener('touchstart', (e) => {
      if (this.state === 'CANNON_LOADING') {
        e.preventDefault();
        this.finishCannonLoading();
      } else if (this.state === 'PARACHUTE_GLIDE') {
        e.preventDefault();
        const touch = e.touches[0];
        if (touch) {
          this.touchSteerDirection = touch.clientX < window.innerWidth * 0.5 ? -1 : 1;
        }
      } else if (this.state === 'FLIGHT' || this.state === 'JETPACK_FLIGHT' || this.state === 'RUNNER') {
        e.preventDefault();
        this.onActionDown();
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.state === 'PARACHUTE_GLIDE') {
        const touch = e.touches[0];
        if (touch) {
          this.touchSteerDirection = touch.clientX < window.innerWidth * 0.5 ? -1 : 1;
        }
      } else if ((this.state === 'AIMING' || this.state === 'CHARGING') && e.touches[0]) {
        this.aimWithScreenCoords(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.touchSteerDirection = 0;
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
      this.startCannonLoading();
    });

    // Title Screen Navigation Buttons
    this.ui.titlePlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.audio.stopTitleMusic();
      this.ui.showTitleScreen(false);
      this.resetRun();
      this.startCannonLoading();
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
      // Clamp angle between configured world limits (10 deg to 60 deg)
      const minAngle = this.world.minCannonAngle ?? (10 * Math.PI / 180);
      const maxAngle = this.world.maxCannonAngle ?? (60 * Math.PI / 180);
      angle = Math.max(minAngle, Math.min(maxAngle, angle));
      this.world.cannonAngle = angle;
    }
  }

  onActionDown() {
    if (this.state === 'TITLE') {
      if (!this.audio.titleMusicPlaying) {
        this.audio.playTitleMusic();
      }
      return;
    }
    if (this.state === 'CANNON_LOADING') {
      this.finishCannonLoading();
      this.state = 'CHARGING';
      this.power = this.minPower;
      this.powerDirection = 1;
      this.ui.setChargingState(true);
      this.audio.resume();
      if (this.world) this.world.cannonLCDState = 3;
      return;
    }
    if (this.state === 'AIMING') {
      this.state = 'CHARGING';
      this.power = this.minPower;
      this.powerDirection = 1;
      this.ui.setChargingState(true);
      this.audio.resume();
      if (this.world) this.world.cannonLCDState = 3;
    } else if (this.state === 'FLIGHT') {
      this.triggerZenBoost();
    } else if (this.state === 'JETPACK_FLIGHT') {
      if (this.jetpackFuel > 0) {
        this.capybara.isThrusting = true;
      }
    } else if (this.state === 'RUNNER') {
      if (this.capybara.hasJetpack && this.jetpackFuel > 0) {
        this.state = 'JETPACK_FLIGHT';
        this.capybara.isThrusting = true;
      } else if (this.capybara.isGrounded) {
        // Ground Jump - split-second snappy jump
        this.capybara.vy = -620;
        this.capybara.y -= 6;
        this.capybara.isGrounded = false;
        this.capybara.hasDoubleJumped = false;
        if (this.capybara.anim) {
          this.capybara.anim.play('jump', true);
        }
        this.audio.playBounce(0.35);
      } else if (!this.capybara.hasDoubleJumped) {
        // Mid-air Double Jump - split-second responsive
        this.capybara.vy = -560;
        this.capybara.hasDoubleJumped = true;
        if (this.capybara.anim) {
          this.capybara.anim.play('double_jump', true);
        }
        this.audio.playBounce(0.55);
      }
    } else if (this.state === 'PARACHUTE_GLIDE') {
      // Gliding down with parachute
    }
  }

  onActionUp() {
    if (this.state === 'CHARGING') {
      this.fireCannon();
    } else if (this.state === 'JETPACK_FLIGHT') {
      this.capybara.isThrusting = false;
    }
  }

  equipJetpack(refillFuel = true) {
    this.capybara.hasJetpack = true;
    this.capybara.isParachuting = false;
    if (refillFuel) {
      this.jetpackFuel = this.jetpackMaxFuel;
    }
    this.ui.setJetpackActive(true);
    this.ui.updateJetpackFuel(this.jetpackFuel / this.jetpackMaxFuel);

    if (this.state === 'FLIGHT' || this.state === 'PARACHUTE_GLIDE') {
      this.state = 'JETPACK_FLIGHT';
      this.ui.showToast("🎒 JETPACK ENGAGED!", "boost");
    } else if (this.state === 'RUNNER') {
      this.ui.showToast("🎒 JETPACK COLLECTED! TAP SPACE TO FLY!", "boost");
    } else if (this.state === 'AIMING' || this.state === 'CHARGING') {
      this.ui.showToast("🎒 JETPACK EQUIPPED FOR LAUNCH", "boost");
    }
  }

  removeJetpack(deployChute = true) {
    if (!this.capybara.hasJetpack) return;
    this.capybara.hasJetpack = false;
    this.capybara.isThrusting = false;
    this.ui.setJetpackActive(false);

    if (this.capybara.anim) {
      this.capybara.anim.play('jetpack_eject');
    }

    if (deployChute && !this.capybara.isGrounded) {
      this.deployParachute();
    } else if (this.capybara.isGrounded) {
      this.state = 'RUNNER';
      this.capybara.isRunning = true;
      if (this.capybara.anim) this.capybara.anim.play('run');
    } else {
      this.state = 'FLIGHT';
    }
  }

  deployParachute() {
    this.state = 'PARACHUTE_GLIDE';
    this.capybara.isParachuting = true;
    this.capybara.isThrusting = false;
    this.touchSteerDirection = 0;
    // Aerodynamic canopy drag decelerates high-speed ballistic flight into a steady glide
    this.capybara.vx = Math.min(360, Math.max(140, this.capybara.vx));
    if (this.capybara.anim) {
      this.capybara.anim.play('parachute_deploy');
    }
    this.ui.showToast("🪂 PARACHUTE DEPLOYED! (Steer: ← / → or Tap L/R)", "yuzu");
  }

  toggleJetpack() {
    if (this.capybara.hasJetpack) {
      this.removeJetpack(true);
    } else {
      this.equipJetpack(true);
    }
  }

  enterJetpackFlight() {
    this.toggleJetpack();
  }

  // Backwards-compatibility aliases
  handleActionPress() {
    this.onActionDown();
  }

  handleActionRelease() {
    this.onActionUp();
  }

  calculateLaunchSpeed(power01) {
    const p = Math.max(0, Math.min(1.0, power01));
    // Non-linear power curve: p^1.75 creates huge dramatic difference between low and high power!
    const curve = Math.pow(p, 1.75);
    return this.minLaunchSpeed + curve * (this.maxLaunchSpeed - this.minLaunchSpeed);
  }

  fireCannon() {
    if (this.capybara.hasJetpack) {
      this.state = 'JETPACK_FLIGHT';
      this.ui.setJetpackActive(true);
    } else {
      this.state = 'FLIGHT';
    }
    this.ui.showLaunchControls(false);
    this.loadingPhase = null;
    this.capybara.walkCycle = 0;

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
    if (this.world) this.world.cannonLCDState = 5;

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
    // 0. Cannon loading intro animation
    if (this.state === 'CANNON_LOADING') {
      this.updateCannonLoading(dt);
    }

    // 1. Aiming angle keyboard controls
    if (this.state === 'AIMING' || this.state === 'CHARGING') {
      const angleSpeed = 1.0 * dt;
      const minAngle = this.world.minCannonAngle ?? (10 * Math.PI / 180);
      const maxAngle = this.world.maxCannonAngle ?? (60 * Math.PI / 180);
      if (this.keys.up) {
        this.world.cannonAngle = Math.min(maxAngle, this.world.cannonAngle + angleSpeed);
      }
      if (this.keys.down) {
        this.world.cannonAngle = Math.max(minAngle, this.world.cannonAngle - angleSpeed);
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
    if (this.state === 'FLIGHT' || this.state === 'JETPACK_FLIGHT' || this.state === 'PARACHUTE_GLIDE' || this.state === 'RUNNER') {
      this.physics.update(this.capybara, dt, (x, y, intensity) => {
        this.audio.playBounce(intensity);
        this.particles.emitBounce(x, y, intensity);
        this.stats.bounces++;
      });

      this.capybara.update(dt);

      // Jetpack fuel drain & thrust particle emission
      if (this.state === 'JETPACK_FLIGHT') {
        if (this.capybara.isThrusting) {
          this.jetpackFuel -= dt;
          const exhaustX = this.capybara.x - 12;
          const exhaustY = this.capybara.y + 6;
          this.particles.emitJetpackThrust(exhaustX, exhaustY, this.capybara.angle);

          if (this.jetpackFuel <= 0) {
            this.jetpackFuel = 0;
            this.capybara.isThrusting = false;
            this.ui.showToast("⚠️ JETPACK FUEL DEPLETED!", "hazard");
            this.removeJetpack(true); // Auto-eject jetpack and deploy parachute!
          }
        }
        this.ui.updateJetpackFuel(this.jetpackFuel / this.jetpackMaxFuel);
      }

      // Parachute gliding steering (Left / Right arrows or Phone screen Left / Right tap)
      if (this.state === 'PARACHUTE_GLIDE') {
        let steer = 0;
        if (this.keys.left) steer -= 1;
        if (this.keys.right) steer += 1;
        if (this.touchSteerDirection !== 0) steer += this.touchSteerDirection;

        if (steer < 0) {
          this.capybara.vx = Math.max(90, this.capybara.vx - 320 * dt);
          this.capybara.angle = Math.max(-0.24, this.capybara.angle - 2.0 * dt);
        } else if (steer > 0) {
          this.capybara.vx = Math.min(540, this.capybara.vx + 320 * dt);
          this.capybara.angle = Math.min(0.24, this.capybara.angle + 2.0 * dt);
        } else {
          // Gently return to level gliding
          this.capybara.angle += (0 - this.capybara.angle) * 3.5 * dt;
        }
      }

      // Check ground touchdown transitions
      if (this.capybara.isGrounded) {
        if (this.state === 'FLIGHT' || this.state === 'PARACHUTE_GLIDE') {
          this.state = 'RUNNER';
          this.capybara.isRunning = true;
          this.capybara.isParachuting = false;
          this.capybara.hasDoubleJumped = false;
          if (this.capybara.anim) this.capybara.anim.play('run');
        } else if (this.state === 'RUNNER') {
          this.capybara.hasDoubleJumped = false;
        }
      }

      // Check obstacle collisions
      for (const obs of this.world.obstacles) {
        if (obs.checkCollision(this.capybara)) {
          obs.onCollide(this.capybara, this);
        }
      }

      // Check flight stop (only triggered if lethally stopped)
      if (!this.capybara.inFlight) {
        this.state = 'STOPPED';
        this.capybara.isThrusting = false;
        this.capybara.isRunning = false;
        this.capybara.setExpression('dizzy', 999);
        if (this.capybara.anim) {
          this.capybara.anim.play('dizzy_stars');
        }
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

    if (this.state === 'FLIGHT' || this.state === 'JETPACK_FLIGHT' || this.state === 'PARACHUTE_GLIDE' || this.state === 'RUNNER' || this.state === 'STOPPED' || this.state === 'GAMEOVER') {
      targetX = this.capybara.x + this.capybara.vx * 0.25 + 140;
      targetY = this.capybara.y + this.capybara.vy * 0.15;

      // Keep camera from going too far underground
      const groundY = this.world.getGroundY(this.capybara.x);
      targetY = Math.min(targetY, groundY - 140);

      // Dynamic Zoom based on mode, speed, and altitude (closer up for readability & cute capy)
      const speed = Math.sqrt(this.capybara.vx ** 2 + this.capybara.vy ** 2);
      const altitude = Math.max(0, groundY - this.capybara.y);

      if (this.state === 'RUNNER') {
        this.camera.targetZoom = 1.38; // Close-up view for responsive platformer jumping & obstacles
      } else if (this.state === 'PARACHUTE_GLIDE') {
        this.camera.targetZoom = 1.22; // Comfortable zoom to see parachute canopy and landing
      } else if (this.state === 'STOPPED' || this.state === 'GAMEOVER') {
        this.camera.targetZoom = 1.45; // Close-up on cute chill/dizzy capybara!
      } else if (speed > 850 || altitude > 700) {
        this.camera.targetZoom = 0.68;
      } else if (speed > 450 || altitude > 350) {
        this.camera.targetZoom = 0.88;
      } else {
        this.camera.targetZoom = 1.08;
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

    // 5. Draw Capybara (when not loaded/occluded inside the cannon barrel)
    const isLoadedInBarrel = this.state === 'AIMING' || this.state === 'CHARGING' ||
      (this.state === 'CANNON_LOADING' && (this.loadingPhase === 'BARREL_ENTRY' || this.loadingPhase === 'BARREL_PAUSE' || this.loadingPhase === 'HEAD_POP' || this.loadingPhase === 'READY'));

    if (!isLoadedInBarrel) {
      this.capybara.draw(this.ctx);
    }

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

  window.toggleJetpackDebug = (enable) => {
    const btn = document.getElementById('jetpackDevBtn');
    if (!btn) return false;
    const isHidden = btn.classList.contains('hidden');
    const shouldShow = enable !== undefined ? enable : isHidden;
    btn.classList.toggle('hidden', !shouldShow);
    return shouldShow;
  };
});
