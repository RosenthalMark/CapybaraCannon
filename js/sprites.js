/**
 * Sprite Sheet & Animation Management
 * Handles async loading, slicing, and frame playback for Capybara and Cannon animations.
 */

export class SpriteSheetManager {
  constructor() {
    this.images = new Map();
    this.animations = new Map();
    this.loadCount = 0;
    this.totalToLoad = 0;
    this.isLoaded = false;
  }

  loadImage(key, src) {
    if (this.images.has(key)) return this.images.get(key);
    this.totalToLoad++;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      this.loadCount++;
      if (this.loadCount >= this.totalToLoad) {
        this.isLoaded = true;
      }
    };
    img.onerror = () => {
      console.warn(`Failed to load sprite sheet: ${src}`);
      this.loadCount++;
    };
    this.images.set(key, img);
    return img;
  }

  registerAnimation(name, config) {
    // config: { imageKey, cols, rows, startRow = 0, frameCount, frameDuration = 0.08, loop = true }
    this.animations.set(name, config);
  }

  initDefaultAssets() {
    // 1. Capybara Run (15 frames: 5 cols x 3 rows)
    this.loadImage('cappy_run', 'assets/art/capy/run/cappy_run_sheet.png');
    this.registerAnimation('run', {
      imageKey: 'cappy_run',
      cols: 5,
      rows: 3,
      startRow: 0,
      frameCount: 15,
      frameDuration: 0.055,
      loop: true
    });

    // 2. Capybara Jumps (Jump B row 0, Double Jump row 1 in 6x2 sheet)
    this.loadImage('cappy_jumps', 'assets/art/capy/jump/cappy_jump_doublejump_sheet.png');
    this.registerAnimation('jump', {
      imageKey: 'cappy_jumps',
      cols: 6,
      rows: 2,
      startRow: 0,
      frameCount: 6,
      frameDuration: 0.09,
      loop: false
    });
    this.registerAnimation('double_jump', {
      imageKey: 'cappy_jumps',
      cols: 6,
      rows: 2,
      startRow: 1,
      frameCount: 6,
      frameDuration: 0.08,
      loop: false
    });

    // 3. Jetpack Eject (5 frames: 5 cols x 1 row)
    this.loadImage('jetpack_eject', 'assets/art/capy/jetpack/cappy_jetpack_eject_sheet.png');
    this.registerAnimation('jetpack_eject', {
      imageKey: 'jetpack_eject',
      cols: 5,
      rows: 1,
      startRow: 0,
      frameCount: 5,
      frameDuration: 0.14,
      loop: false
    });

    // 4. Parachute Deploy & Glide
    this.loadImage('chute_deploy', 'assets/art/capy/parachute/cappy_parachute_deploy_sheet.png');
    this.registerAnimation('parachute_deploy', {
      imageKey: 'chute_deploy',
      cols: 6,
      rows: 1,
      startRow: 0,
      frameCount: 6,
      frameDuration: 0.09,
      loop: false
    });

    this.loadImage('chute_glide', 'assets/art/capy/parachute/cappy_parachute_glide_sheet.png');
    this.registerAnimation('parachute_glide', {
      imageKey: 'chute_glide',
      cols: 4,
      rows: 1,
      startRow: 0,
      frameCount: 4,
      frameDuration: 0.22,
      loop: true
    });

    // 5. Ground Impact & Dizzy Stars
    this.loadImage('impact_bonk', 'assets/art/capy/impact/ground/cappy_faceplant_bonk_sheet.png');
    this.registerAnimation('impact_bonk', {
      imageKey: 'impact_bonk',
      cols: 5,
      rows: 1,
      startRow: 0,
      frameCount: 5,
      frameDuration: 0.12,
      loop: false
    });

    this.loadImage('impact_roll', 'assets/art/capy/impact/ground/cappy_trip_roll_crash_sheet.png');
    this.registerAnimation('impact_roll', {
      imageKey: 'impact_roll',
      cols: 5,
      rows: 2,
      startRow: 0,
      frameCount: 5,
      frameDuration: 0.10,
      loop: false
    });

    this.loadImage('dizzy_stars', 'assets/art/capy/impact/ground/cappy_dizzy_stars_sheet.png');
    this.registerAnimation('dizzy_stars', {
      imageKey: 'dizzy_stars',
      cols: 5,
      rows: 2,
      startRow: 0,
      frameCount: 10,
      frameDuration: 0.09,
      loop: true
    });

    // 6. Cannon Assets
    this.loadImage('cannon_launch', 'assets/canon/cannon_launch_sequence.png');
    this.registerAnimation('cannon_blast', {
      imageKey: 'cannon_launch',
      cols: 4,
      rows: 3,
      startRow: 0,
      frameCount: 12,
      frameDuration: 0.045, // ~0.54s detonation blast
      loop: false
    });

    this.loadImage('cannon_lcd', 'assets/canon/cannon_lcd_capy_sheet.png');
    this.loadImage('cannon_concept', 'assets/canon/cannon_concept.png');
  }

  getFrameRect(animName, frameIndex) {
    const anim = this.animations.get(animName);
    if (!anim) return null;
    const img = this.images.get(anim.imageKey);
    if (!img || !img.complete || img.naturalWidth === 0) return null;

    const cellW = img.naturalWidth / anim.cols;
    const cellH = img.naturalHeight / anim.rows;

    const localIndex = frameIndex % anim.frameCount;
    const col = localIndex % anim.cols;
    const row = anim.startRow + Math.floor(localIndex / anim.cols);

    return {
      img,
      sx: col * cellW,
      sy: row * cellH,
      sw: cellW,
      sh: cellH
    };
  }

  getLCDFrame(frameIndex) {
    const img = this.images.get('cannon_lcd');
    if (!img || !img.complete || img.naturalWidth === 0) return null;

    const cols = 3;
    const rows = 2;
    const cellW = img.naturalWidth / cols;
    const cellH = img.naturalHeight / rows;

    const idx = Math.max(0, Math.min(5, frameIndex));
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    return {
      img,
      sx: col * cellW,
      sy: row * cellH,
      sw: cellW,
      sh: cellH
    };
  }
}

export const GlobalSprites = new SpriteSheetManager();
GlobalSprites.initDefaultAssets();

export class AnimationPlayer {
  constructor(spriteManager = GlobalSprites) {
    this.sprites = spriteManager;
    this.currentAnim = null;
    this.animTimer = 0;
    this.frameIndex = 0;
    this.isFinished = false;
  }

  play(animName, forceRestart = false) {
    if (this.currentAnim === animName && !forceRestart) return;
    this.currentAnim = animName;
    this.animTimer = 0;
    this.frameIndex = 0;
    this.isFinished = false;
  }

  update(dt) {
    if (!this.currentAnim) return;
    const anim = this.sprites.animations.get(this.currentAnim);
    if (!anim) return;

    this.animTimer += dt;
    const totalDuration = anim.frameCount * anim.frameDuration;

    if (anim.loop) {
      const loopTime = this.animTimer % totalDuration;
      this.frameIndex = Math.floor(loopTime / anim.frameDuration);
    } else {
      if (this.animTimer >= totalDuration) {
        this.frameIndex = anim.frameCount - 1;
        this.isFinished = true;
      } else {
        this.frameIndex = Math.floor(this.animTimer / anim.frameDuration);
      }
    }
  }

  canDraw() {
    if (!this.currentAnim) return false;
    const rect = this.sprites.getFrameRect(this.currentAnim, this.frameIndex);
    return rect !== null;
  }

  draw(ctx, destW, destH, offsetX = 0, offsetY = 0, flipX = false) {
    if (!this.currentAnim) return false;
    const rect = this.sprites.getFrameRect(this.currentAnim, this.frameIndex);
    if (!rect) return false;

    ctx.save();
    if (flipX) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      rect.img,
      rect.sx, rect.sy, rect.sw, rect.sh,
      -destW * 0.5 + offsetX, -destH * 0.5 + offsetY, destW, destH
    );
    ctx.restore();
    return true;
  }
}
