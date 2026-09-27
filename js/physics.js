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

    // 2. Gravity
    capy.vy += this.gravity * dt;

    // 3. Integrate position
    capy.x += capy.vx * dt;
    capy.y += capy.vy * dt;

    // 4. Ground Collision
    const groundY = this.world.getGroundY(capy.x);
    const penetration = (capy.y + capy.radius) - groundY;

    if (penetration >= 0) {
      // Reposition above ground
      capy.y = groundY - capy.radius;

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

        // Coulomb rolling deceleration (px/s^2)
        const rollFrictionDecel = (capy.glideBoostTimer > 0 ? 120 : 420) * dt;
        if (Math.abs(capy.vx) <= rollFrictionDecel) {
          capy.vx = 0;
        } else {
          capy.vx -= Math.sign(capy.vx) * rollFrictionDecel;
        }

        // Slope effect with static friction threshold
        const slopeGravity = Math.sin(slope) * this.gravity;
        const staticFriction = 240; // slope gravity must exceed this to cause rolling from rest
        if (Math.abs(slopeGravity) > staticFriction) {
          capy.vx += (slopeGravity - Math.sign(slopeGravity) * staticFriction) * 0.4 * dt;
        }

        // Angular velocity rolls with linear velocity
        capy.angularVelocity = (capy.vx / capy.radius) * 1.2;

        // Track prolonged low-speed roll
        if (Math.abs(capy.vx) < 55) {
          capy.crawlTimer = (capy.crawlTimer || 0) + dt;
        } else {
          capy.crawlTimer = 0;
        }

        // Definitive STOP threshold or crawl timer expiry
        if ((Math.abs(capy.vx) < 22 && Math.abs(capy.vy) < 35) || (capy.crawlTimer > 0.5)) {
          capy.vx = 0;
          capy.vy = 0;
          capy.angularVelocity = 0;
          capy.inFlight = false;
          capy.isSliding = false;
          capy.isGrounded = true;
          capy.setExpression('dizzy', 999);
        }
      }
    } else {
      capy.isGrounded = false;
      capy.isSliding = false;
    }
  }
}
