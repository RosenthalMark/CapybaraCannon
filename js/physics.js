/**
 * Physics Engine
 * Handles ballistics, drag, sub-stepped ground collisions, bouncy restitution,
 * slope sliding, and angular momentum.
 */

export class PhysicsEngine {
  constructor(world) {
    this.world = world;
    this.gravity = 680; // px / sec^2
    this.airDrag = 0.00035; // velocity quadratic damping
    this.groundRestitution = 0.52; // bounciness
    this.groundFriction = 0.88; // horizontal slide damping on contact
    this.rollingFriction = 0.965; // continuous friction when rolling
    this.jetpackThrust = 1600; // upward thrust acceleration in px/sec^2
    this.jetpackMaxAltitude = 520; // maximum ground-relative flight envelope in px
    this.jetpackSoftBuffer = 120; // soft attenuation zone in px (400px - 520px)
  }

  update(capy, dt, onBounce) {
    if (!capy.inFlight) return;

    // Sub-step physics (3 substeps) for high-speed accuracy & zero ground clipping
    const subSteps = 3;
    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      if (!capy.inFlight) break;
      this.step(capy, subDt, onBounce);
    }
  }

  step(capy, dt, onBounce) {
    // 1. Aerodynamic drag
    const speedSq = capy.vx * capy.vx + capy.vy * capy.vy;
    const speed = Math.sqrt(speedSq);

    if (speed > 1) {
      const dragForce = 0.5 * this.airDrag * speedSq;
      const dragVx = (capy.vx / speed) * dragForce;
      const dragVy = (capy.vy / speed) * dragForce;

      capy.vx -= dragVx * dt;
      capy.vy -= dragVy * dt;
    }

    // 2. Gravity and Jetpack Thrust
    if (capy.isThrusting) {
      // Calculate ground-relative altitude
      const groundY = this.world.getGroundY(capy.x);
      const altitude = groundY - capy.y;
      const softAlt = this.jetpackMaxAltitude - this.jetpackSoftBuffer;

      let effectiveThrust = this.jetpackThrust;
      if (altitude > softAlt) {
        // Attenuate thrust progressively in the buffer zone [softAlt, jetpackMaxAltitude]
        const t = Math.max(0, Math.min(1.0, (altitude - softAlt) / this.jetpackSoftBuffer));
        // Scale thrust from full jetpackThrust (1600) down to 400 px/s^2 at the top
        // (below gravity so upward acceleration naturally softens and reverses)
        const minThrustAtTop = 400;
        effectiveThrust = this.jetpackThrust - t * (this.jetpackThrust - minThrustAtTop);

        // Additional gentle atmospheric resistance on upward velocity
        if (capy.vy < 0) {
          capy.vy += t * 300 * dt;
        }
      }

      // Upward thrust opposes downward gravity
      capy.vy += (this.gravity - effectiveThrust) * dt;
    } else if (capy.isParachuting) {
      // Gentle parachute descent: reduced gravity, terminal fall capped at 130 px/s
      const chuteGravity = 220;
      capy.vy += chuteGravity * dt;
      if (capy.vy > 130) {
        capy.vy = 130;
      }
      // Maintain forward gliding momentum
      if (capy.vx < 260) {
        capy.vx += 200 * dt;
      }
    } else {
      capy.vy += this.gravity * dt;
    }

    // 3. Integrate position
    capy.x += capy.vx * dt;
    capy.y += capy.vy * dt;

    // Upper flight envelope absolute safety clamp (when equipped with jetpack)
    if (capy.hasJetpack) {
      const currentGroundY = this.world.getGroundY(capy.x);
      const currentAlt = currentGroundY - capy.y;
      if (currentAlt > this.jetpackMaxAltitude) {
        capy.y = currentGroundY - this.jetpackMaxAltitude;
        if (capy.vy < 0) {
          capy.vy = 0;
        }
      }
    }

    // 4. Ground Collision
    const groundY = this.world.getGroundY(capy.x);
    const penetration = (capy.y + capy.radius) - groundY;

    if (penetration >= 0) {
      // Reposition above ground
      capy.y = groundY - capy.radius;

      // Pack parachute upon touchdown
      if (capy.isParachuting) {
        capy.isParachuting = false;
      }

      // Ground normal & tangent from slope
      const slope = this.world.getGroundSlope(capy.x);
      const nx = -Math.sin(slope);
      const ny = -Math.cos(slope);
      const tx = -ny; // Math.cos(slope)
      const ty = nx;  // -Math.sin(slope)

      // Velocity decomposed into normal and tangent components
      const vDotN = capy.vx * nx + capy.vy * ny;
      const vDotT = capy.vx * tx + capy.vy * ty;

      if (vDotN < 0) {
        // Bounce restitution
        const restitution = capy.glideBoostTimer > 0 ? 0.65 : this.groundRestitution;
        let newVn = -vDotN * restitution;

        // Tangent friction on impact
        const friction = capy.glideBoostTimer > 0 ? 0.98 : this.groundFriction;
        let newVt = vDotT * friction;

        // Micro-bounce threshold: if vertical bounce is too small, stick to ground
        if (Math.abs(newVn) < 48) {
          newVn = 0;
          capy.isGrounded = true;
          capy.isSliding = true;
        }

        // Recombine velocity
        capy.vx = tx * newVt + nx * newVn;
        capy.vy = ty * newVt + ny * newVn;

        // Tumble angular velocity
        capy.angularVelocity = (newVt / capy.radius) * 1.5;

        // Impact callback (particles, sound)
        const impactSpeed = Math.abs(vDotN);
        if (impactSpeed > 45) {
          capy.triggerSquash(Math.max(0.45, 1.0 - impactSpeed / 900));
          if (onBounce) {
            onBounce(capy.x, groundY, impactSpeed / 600);
          }
        }
      }

      // If grounded or sliding, apply continuous rolling/Coulomb friction
      if (capy.isGrounded || capy.isSliding || Math.abs(capy.vy) < 50) {
        capy.isGrounded = true;

        if (capy.isLethallyHit) {
          // Only stopped by lethal hazards (e.g. fatal cactus or mud sink)
          capy.vx = 0;
          capy.vy = 0;
          capy.angularVelocity = 0;
          capy.inFlight = false;
          capy.isSliding = false;
          capy.setExpression('dizzy', 999);
        } else {
          // HYBRID GAMEPLAY: Hitting the ground alone NEVER ends the run!
          // Transitions smoothly into Ground Running mode.
          capy.inFlight = true;
          capy.isRunning = true;
          capy.crawlTimer = 0;

          // Align angle with terrain slope
          capy.angle = slope;
          capy.angularVelocity = 0;

          // Maintain base ground running cruise speed
          const minRunSpeed = 340;
          if (capy.vx < minRunSpeed) {
            capy.vx = Math.min(minRunSpeed, capy.vx + 600 * dt);
          } else {
            // Natural ground roll deceleration down toward running cruise speed
            const rollFrictionDecel = (capy.glideBoostTimer > 0 ? 80 : 240) * dt;
            capy.vx = Math.max(minRunSpeed, capy.vx - rollFrictionDecel);
          }

          // Gentle slope speed influence
          const slopeGravity = Math.sin(slope) * 180 * dt;
          capy.vx = Math.max(minRunSpeed, capy.vx + slopeGravity);
        }
      }
    } else {
      capy.isGrounded = false;
      capy.isSliding = false;
    }
  }
}
