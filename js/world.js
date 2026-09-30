/**
 * World, Terrain Generation, Parallax Backgrounds, and Cannon
 */

import { TNT, Trampoline, Yuzu, HotSpring, Pelican, Cactus, MudPit, JetpackPickup } from './obstacles.js?v=5';
import { GlobalSprites, AnimationPlayer } from './sprites.js';

export class World {
  constructor(baseGroundY = 550) {
    this.baseGroundY = baseGroundY;
    this.obstacles = [];
    this.spawnedDistance = 0;
    this.chunkSize = 600;

    // Cannon properties
    this.cannonX = 70;
    this.cannonY = baseGroundY;
    this.minCannonAngle = 10 * (Math.PI / 180); // minimum allowed elevation (10 deg)
    this.maxCannonAngle = 60 * (Math.PI / 180); // maximum allowed elevation (60 deg)
    this.cannonAngle = 45 * (Math.PI / 180); // in radians
    this.cannonLength = 55;
    this.cannonWidth = 32;
    this.cannonRecoil = 0;

    // Cannon Blast & LCD Animations
    this.cannonBlastPlayer = new AnimationPlayer(GlobalSprites);
    this.cannonLCDState = 0; // 0: AIMING, 1: LOADING, 2: CHAMBER, 3: CHARGING, 4: LAUNCH, 5: MAX

    // Procedural clouds
    this.clouds = [];
    for (let i = 0; i < 20; i++) {
      this.clouds.push({
        x: (Math.random() - 0.2) * 4000,
        y: Math.random() * 300 - 100,
        scale: Math.random() * 0.8 + 0.6,
        speed: Math.random() * 15 + 5
      });
    }
  }

  reset() {
    this.obstacles = [];
    this.spawnedDistance = 300; // start spawning after launch zone
    this.cannonRecoil = 0;
    this.generateInitialObstacles();
  }

  /**
   * Continuous smooth terrain function.
   * Flat launch platform at x < 250, then smooth gentle rolling hills.
   */
  getGroundY(x) {
    if (x < 180) {
      return this.baseGroundY;
    }
    const blend = Math.min(1.0, (x - 180) / 120);
    const hill1 = Math.sin(x * 0.0018) * 35;
    const hill2 = Math.sin(x * 0.0042) * 18;
    const hill3 = Math.cos(x * 0.0008) * 40;
    return this.baseGroundY + (hill1 + hill2 + hill3) * blend;
  }

  /**
   * Derivative of terrain slope for collision reflection & angle
   */
  getGroundSlope(x) {
    const delta = 2.0;
    const y1 = this.getGroundY(x - delta);
    const y2 = this.getGroundY(x + delta);
    return Math.atan2(y2 - y1, delta * 2);
  }

  update(dt, cameraX) {
    // Recoil recovery
    this.cannonRecoil += (0 - this.cannonRecoil) * 8 * dt;

    // Cannon blast animation update
    if (this.cannonBlastPlayer) {
      this.cannonBlastPlayer.update(dt);
    }

    // Drifting clouds
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x - cameraX * 0.2 > 2500) {
        cloud.x -= 3000;
      }
    }

    // Update active obstacles
    for (const obs of this.obstacles) {
      obs.update(dt);
    }

    // Spawn new obstacles ahead of camera
    const horizon = cameraX + 2200;
    while (this.spawnedDistance < horizon) {
      this.spawnChunk(this.spawnedDistance);
      this.spawnedDistance += this.chunkSize;
    }

    // Cull obstacles far behind
    this.obstacles = this.obstacles.filter(obs => obs.x > cameraX - 1000);
  }

  spawnChunk(startX) {
    // 1 to 2 items per 600px chunk for a well-balanced, open landscape
    const count = Math.random() < 0.5 ? 1 : 2;
    const slotSize = this.chunkSize / count;

    for (let i = 0; i < count; i++) {
      // Well-spaced slots so items never overlap
      const x = startX + i * slotSize + 60 + Math.random() * (slotSize - 120);
      const groundY = this.getGroundY(x);
      const rand = Math.random();

      if (rand < 0.16) {
        // Trampoline on ground
        this.obstacles.push(new Trampoline(x, groundY));
      } else if (rand < 0.32) {
        // Yuzu: floating citrus
        const airY = Math.random() < 0.45 ? groundY - 35 : groundY - (Math.random() * 220 + 80);
        this.obstacles.push(new Yuzu(x, airY));
      } else if (rand < 0.42) {
        // Jetpack pickup (floating in air or resting on ground)
        const airY = Math.random() < 0.5 ? groundY - 30 : groundY - (Math.random() * 180 + 70);
        this.obstacles.push(new JetpackPickup(x, airY));
      } else if (rand < 0.54) {
        // TNT barrel on ground
        this.obstacles.push(new TNT(x, groundY));
      } else if (rand < 0.67) {
        // Pelican flying in air
        const airY = groundY - (Math.random() * 240 + 100);
        this.obstacles.push(new Pelican(x, airY));
      } else if (rand < 0.78) {
        // Hot spring on ground
        this.obstacles.push(new HotSpring(x, groundY));
      } else if (rand < 0.90) {
        // Cactus on ground (hazard)
        this.obstacles.push(new Cactus(x, groundY));
      } else {
        // Sticky Mud Pit on ground (hazard)
        this.obstacles.push(new MudPit(x, groundY));
      }
    }
  }

  generateInitialObstacles() {
    // Give a clear, exciting runway right after the cannon (cannon at x = 70)
    // A few spaced introductory items so the start feels open and inviting:
    const startItems = [
      { x: 500, type: 'trampoline' },
      { x: 920, type: 'yuzu' },
      { x: 1350, type: 'cactus' },
      { x: 1800, type: 'jetpack' }
    ];

    for (const item of startItems) {
      const groundY = this.getGroundY(item.x);
      if (item.type === 'trampoline') this.obstacles.push(new Trampoline(item.x, groundY));
      else if (item.type === 'yuzu') this.obstacles.push(new Yuzu(item.x, groundY - 50));
      else if (item.type === 'cactus') this.obstacles.push(new Cactus(item.x, groundY));
      else if (item.type === 'jetpack') this.obstacles.push(new JetpackPickup(item.x, groundY - 45));
    }

    this.spawnedDistance = 1600;
  }

  triggerCannonFire(amount = 26) {
    this.cannonRecoil = amount; // kick back
    if (this.cannonBlastPlayer) {
      this.cannonBlastPlayer.play('cannon_blast', true);
    }
    this.cannonLCDState = 4;
  }

  drawBackground(ctx, camera, width, height) {
    // Dynamic Sky Gradient based on altitude
    const skyAltitude = Math.max(0, (this.baseGroundY - camera.y));
    const isHigh = Math.min(1.0, skyAltitude / 1400);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    if (isHigh < 0.4) {
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.6, '#7dd3fc');
      grad.addColorStop(1, '#bae6fd');
    } else if (isHigh < 0.8) {
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(0.5, '#3b82f6');
      grad.addColorStop(1, '#93c5fd');
    } else {
      // Stratosphere / Starry space vibe
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.4, '#1e1b4b');
      grad.addColorStop(1, '#312e81');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Parallax Distant Mountains
    this.drawMountains(ctx, camera, width, height);

    // Parallax Clouds
    this.drawClouds(ctx, camera, width, height);
  }

  drawMountains(ctx, camera, width, height) {
    ctx.save();
    const parallax = 0.15;
    const offsetX = -(camera.x * parallax) % width;

    // Distant soft blue hills
    ctx.fillStyle = 'rgba(125, 211, 252, 0.45)';
    ctx.beginPath();
    ctx.moveTo(-width, height);
    for (let x = -width; x <= width * 2; x += 150) {
      const y = height * 0.55 + Math.sin((x + camera.x * parallax) * 0.003) * 60;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width * 2, height);
    ctx.fill();

    // Midground green canopy
    ctx.fillStyle = 'rgba(52, 211, 153, 0.4)';
    ctx.beginPath();
    ctx.moveTo(-width, height);
    for (let x = -width; x <= width * 2; x += 100) {
      const y = height * 0.65 + Math.sin((x + camera.x * 0.3) * 0.005) * 45;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width * 2, height);
    ctx.fill();

    ctx.restore();
  }

  drawClouds(ctx, camera, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';

    for (const c of this.clouds) {
      const screenX = (c.x - camera.x * 0.25) % (width + 400);
      const screenY = c.y - camera.y * 0.15 + 150;

      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.scale(c.scale, c.scale);
      this.drawPuffyCloud(ctx);
      ctx.restore();
    }
    ctx.restore();
  }

  drawPuffyCloud(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.arc(26, -10, 26, 0, Math.PI * 2);
    ctx.arc(55, 0, 28, 0, Math.PI * 2);
    ctx.arc(28, 12, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWorld(ctx, camera, viewportWidth, viewportHeight) {
    // 1. Draw Rolling Ground
    const leftX = camera.x - viewportWidth * 0.5 / camera.zoom - 200;
    const rightX = camera.x + viewportWidth * 0.5 / camera.zoom + 200;

    // Deep soil layer
    ctx.fillStyle = '#5a381e';
    ctx.beginPath();
    ctx.moveTo(leftX, this.baseGroundY + 1200);
    for (let x = leftX; x <= rightX; x += 30) {
      ctx.lineTo(x, this.getGroundY(x));
    }
    ctx.lineTo(rightX, this.baseGroundY + 1200);
    ctx.closePath();
    ctx.fill();

    // Grass Top Border
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    for (let x = leftX; x <= rightX; x += 30) {
      const y = this.getGroundY(x);
      if (x === leftX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Lush meadow highlight border
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#86efac';
    ctx.stroke();

    // 2. Draw Obstacles
    for (const obs of this.obstacles) {
      if (obs.x >= leftX - 100 && obs.x <= rightX + 100) {
        obs.draw(ctx);
      }
    }

    // 3. Draw The Cannon
    this.drawCannon(ctx);
  }

  drawCannon(ctx) {
    const x = this.cannonX;
    const y = this.getGroundY(x);

    // 1. Explosive 12-Frame Detonation Sequence on Fire
    if (this.cannonBlastPlayer && this.cannonBlastPlayer.currentAnim === 'cannon_blast' && !this.cannonBlastPlayer.isFinished) {
      const rect = GlobalSprites.getFrameRect('cannon_blast', this.cannonBlastPlayer.frameIndex);
      if (rect) {
        ctx.save();
        ctx.translate(x, y);
        ctx.drawImage(rect.img, rect.sx, rect.sy, rect.sw, rect.sh, -65, -100, 180, 135);
        ctx.restore();
        return;
      }
    }

    ctx.save();
    ctx.translate(x, y);

    // Wooden Carriage Wheels
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, -18, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Wheel spokes
    ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(Math.cos(a) * 16, -18 + Math.sin(a) * 16);
      ctx.stroke();
    }

    // Hubcap
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -18, 5, 0, Math.PI * 2);
    ctx.fill();

    // Render Neon LCD Screen on Carriage
    const lcd = GlobalSprites.getLCDFrame(this.cannonLCDState ?? 0);
    if (lcd) {
      ctx.save();
      ctx.translate(-14, -6);
      ctx.fillStyle = '#050510';
      ctx.fillRect(-12, -8, 24, 16);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-12, -8, 24, 16);
      ctx.drawImage(lcd.img, lcd.sx, lcd.sy, lcd.sw, lcd.sh, -11, -7, 22, 14);
      ctx.restore();
    }

    // Cannon Barrel Pivot
    ctx.translate(0, -22);
    ctx.rotate(-this.cannonAngle); // negative because canvas Y is down

    // Recoil offset
    const recoilX = -this.cannonRecoil;

    // Bronze Cannon Barrel
    const grad = ctx.createLinearGradient(recoilX, -16, recoilX, 16);
    grad.addColorStop(0, '#78716c');
    grad.addColorStop(0.3, '#d6d3d1');
    grad.addColorStop(0.7, '#57534e');
    grad.addColorStop(1, '#292524');

    ctx.fillStyle = grad;
    ctx.beginPath();
    // Barrel taper
    ctx.moveTo(recoilX - 12, -16);
    ctx.lineTo(recoilX + 54, -13);
    ctx.lineTo(recoilX + 54, 13);
    ctx.lineTo(recoilX - 12, 16);
    ctx.closePath();
    ctx.fill();

    // Hook to render loaded entity (Capybara) inside the barrel before the rim is drawn
    if (this.onDrawBarrelInterior) {
      this.onDrawBarrelInterior(ctx, recoilX);
    }

    // Muzzle Rim
    ctx.fillStyle = '#a8a29e';
    ctx.beginPath();
    ctx.ellipse(recoilX + 54, 0, 4, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cannon Base Knob
    ctx.fillStyle = '#44403c';
    ctx.beginPath();
    ctx.arc(recoilX - 12, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getMuzzlePosition() {
    const baseY = this.getGroundY(this.cannonX);
    const pivotY = baseY - 22;
    const len = this.cannonLength + 6;
    const cos = Math.cos(this.cannonAngle);
    const sin = Math.sin(this.cannonAngle);

    return {
      x: this.cannonX + cos * len,
      y: pivotY - sin * len
    };
  }
}
