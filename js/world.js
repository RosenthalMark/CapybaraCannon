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

    // Warehouse Facility Corridor properties
    this.ceilingHeight = 480; // Distance between floor and ceiling in px

    // Procedural clouds (preserved for outdoor mode)
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

  /**
   * Continuous warehouse facility ceiling height
   */
  getCeilingY(x) {
    return this.getGroundY(x) - this.ceilingHeight;
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
      { x: 1380, type: 'yuzu' },
      { x: 2500, type: 'jetpack' }
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
    // Industrial Warehouse / High-Tech Laboratory Facility Background
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0e17');
    grad.addColorStop(0.5, '#111827');
    grad.addColorStop(1, '#1e293b');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Parallax Facility Wall Panels & Structural Pillars
    ctx.save();
    const parallax = 0.2;
    const colSpacing = 280;
    const startCol = Math.floor((camera.x * parallax) / colSpacing) - 2;
    const endCol = startCol + Math.ceil(width / colSpacing) + 4;

    for (let c = startCol; c <= endCol; c++) {
      const colScreenX = c * colSpacing - camera.x * parallax;

      // Industrial Steel Support Column
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(colScreenX, 0, 36, height);
      ctx.fillStyle = '#334155';
      ctx.fillRect(colScreenX + 4, 0, 4, height);
      ctx.fillRect(colScreenX + 28, 0, 4, height);

      // Soft Cyan Neon Status Light Strip
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.fillRect(colScreenX + 16, height * 0.2, 4, height * 0.45);

      // Warning hazard stencil on column
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(colScreenX + 8, height * 0.35, 20, 10);
    }

    // Overhead horizontal conduit pipes
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 70, width, 14);
    ctx.fillRect(0, 92, width, 8);
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 72, width, 3);

    // Hanging Warehouse Work Lamp Light Cones
    for (let c = startCol; c <= endCol; c += 2) {
      const lampX = c * colSpacing + 140 - camera.x * parallax;
      const coneGrad = ctx.createRadialGradient(lampX, 100, 10, lampX, 350, 260);
      coneGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      coneGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(lampX - 10, 100);
      ctx.lineTo(lampX + 10, 100);
      ctx.lineTo(lampX + 130, 450);
      ctx.lineTo(lampX - 130, 450);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  drawWorld(ctx, camera, viewportWidth, viewportHeight) {
    const leftX = camera.x - viewportWidth * 0.5 / camera.zoom - 200;
    const rightX = camera.x + viewportWidth * 0.5 / camera.zoom + 200;

    // 1. Draw Physical Warehouse Industrial Ceiling (With Hazard Chevrons)
    ctx.save();
    // Solid ceiling mass above ceilingY
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(leftX, -1000);
    for (let x = leftX; x <= rightX; x += 30) {
      ctx.lineTo(x, this.getCeilingY(x));
    }
    ctx.lineTo(rightX, -1000);
    ctx.closePath();
    ctx.fill();

    // Heavy Industrial Steel Girder Beam
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    for (let x = leftX; x <= rightX; x += 30) {
      const y = this.getCeilingY(x);
      if (x === leftX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Steel Beam Rim Highlight
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#64748b';
    ctx.stroke();

    // Diagonal Yellow & Black Caution Hazard Stripe Border along the ceiling edge
    ctx.lineWidth = 6;
    ctx.setLineDash([18, 14]);
    ctx.strokeStyle = '#eab308'; // Safety Yellow
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 2. Draw Reinforced Warehouse Concrete Floor
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(leftX, this.baseGroundY + 1200);
    for (let x = leftX; x <= rightX; x += 30) {
      ctx.lineTo(x, this.getGroundY(x));
    }
    ctx.lineTo(rightX, this.baseGroundY + 1200);
    ctx.closePath();
    ctx.fill();

    // Reinforced Industrial Curb Beam
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    for (let x = leftX; x <= rightX; x += 30) {
      const y = this.getGroundY(x);
      if (x === leftX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Neon Floor Guide Line (Cyan Runner Strip)
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    // Subtle hazard markings along the floor
    ctx.lineWidth = 3;
    ctx.setLineDash([24, 20]);
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 3. Draw Obstacles
    for (const obs of this.obstacles) {
      if (obs.x >= leftX - 100 && obs.x <= rightX + 100) {
        obs.draw(ctx);
      }
    }

    // 4. Draw Cannon (at rest on platform)
    this.drawCannon(ctx);
  }

  drawCannon(ctx) {
    const x = this.cannonX;
    const y = this.getGroundY(x);

    const destW = 240;
    const destH = 180;
    const drawX = -70;
    const drawY = -172;

    // Check if blast animation is playing
    let frameIndex = 0;
    if (this.cannonBlastPlayer && this.cannonBlastPlayer.currentAnim === 'cannon_blast') {
      frameIndex = this.cannonBlastPlayer.frameIndex;
    }

    const rect = GlobalSprites.getFrameRect('cannon_blast', frameIndex);

    ctx.save();
    ctx.translate(x, y);

    // If capybara is peeking out of the cannon barrel before fire
    if (this.onDrawBarrelInterior && (this.cannonBlastPlayer?.isFinished ?? true) && frameIndex === 0) {
      this.onDrawBarrelInterior(ctx, -this.cannonRecoil);
    }

    // Render custom cannon sprite
    if (rect) {
      ctx.drawImage(rect.img, rect.sx, rect.sy, rect.sw, rect.sh, drawX - this.cannonRecoil, drawY, destW, destH);
    }

    ctx.restore();
  }

  getMuzzlePosition() {
    const baseY = this.getGroundY(this.cannonX);
    // Align directly with the custom cannon barrel opening in the artwork
    const cos = Math.cos(this.cannonAngle);
    const sin = Math.sin(this.cannonAngle);
    const muzzleOffsetX = 66 + cos * 10;
    const muzzleOffsetY = -86 - sin * 10;

    return {
      x: this.cannonX + muzzleOffsetX,
      y: baseY + muzzleOffsetY
    };
  }

  get cannonImage() {
    return GlobalSprites.images.get('cannon_launch') || null;
  }

  get cannonLaunchAnimActive() {
    return this.cannonBlastPlayer ? this.cannonBlastPlayer.isPlaying : false;
  }

  get cannonLaunchFrame() {
    return this.cannonBlastPlayer ? this.cannonBlastPlayer.frameIndex : 0;
  }
}
