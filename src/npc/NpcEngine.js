import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CONFIG, logDebug } from '../config.js';
import { createBroccoliModel } from '../render/models/BroccoliModel.js';
import { createCarrotModel } from '../render/models/CarrotModel.js';

// NPC State Enum
export const NPC_STATES = {
  IDLE: 'IDLE',
  CHASE: 'CHASE',
  ATTACK: 'ATTACK',
  DEAD: 'DEAD'
};

// Base NPC Class
export class BaseNpc {
  constructor(scene, physicsWorld, position, faction) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.faction = faction;
    
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 5;
    this.chaseRange = 25;
    this.attackRange = 14;
    this.fireRate = 1.8; // Seconds between attacks
    this.lastFiredTime = 0;
    this.color = 0xffffff;

    this.state = NPC_STATES.IDLE;
    this.spawnPoint = new THREE.Vector3(position.x, position.y, position.z);
    this.targetHoverY = position.y; // Desired hover height (ground level)
    this.idleTimeOffset = Math.random() * 100;

    // this.mesh is assigned by each subclass's createVisuals() call,
    // which delegates to the appropriate model factory.
    this.mesh = null;

    // Physics body reference
    this.body = null;

    // Track previous state for damping transitions
    this._previousState = NPC_STATES.IDLE;

    // Pre-allocated vector to avoid GC pressure in update loop
    this._toPlayer = new THREE.Vector3();
    this._jumpImpulse = new CANNON.Vec3();
    this._boostForce = new CANNON.Vec3();
    this._chaseForce = new CANNON.Vec3();
    this._hoverForce = new CANNON.Vec3();
    this._toSpawn = new CANNON.Vec3();
    this._fireDir = new THREE.Vector3();

    // Timer to temporarily bypass hover spring when jumping
    this.hoverBypassTimer = 0;

    // Diagnostic logging — throttled to ~2 Hz so the console stays readable.
    // Tag each NPC instance with a short label for easy console filtering.
    this._diagTimer = 0;
    this._diagLabel = `[NPC:${faction.slice(0,3).toUpperCase()}@${position.x.toFixed(0)},${position.z.toFixed(0)}]`;
  }

  takeDamage(amount, hitPoint, hitDirection) {
    if (this.state === NPC_STATES.DEAD) return;

    logDebug(`[NpcEngine] ${this.faction} took ${amount} damage. Health: ${this.health - amount}`);

    this.health -= amount;
    this.flashRed();

    // Trigger juice splatter particles
    this.spawnSplatter(hitPoint || this.mesh.position, hitDirection);

    // Apply physical pushback
    if (this.body && hitDirection) {
      const impulse = hitDirection.clone().multiplyScalar(4.5);
      this.body.applyImpulse(
        new CANNON.Vec3(impulse.x, impulse.y, impulse.z),
        this.body.position
      );
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  flashRed() {
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const origColor = child.material.color.clone();
        child.material.color.setHex(0xff3333);
        setTimeout(() => {
          if (child.material) {
            child.material.color.copy(origColor);
          }
        }, 150);
      }
    });
  }

  spawnSplatter(position, direction) {
    const particleCount = 12;
    const geometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.95
    });

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(geometry, material.clone());
      particle.position.copy(position);
      
      // Random velocity vector, biased towards hit direction
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.2) * 5 + 2, // up bias
        (Math.random() - 0.5) * 4
      );
      if (direction) {
        velocity.addScaledVector(direction, 3);
      }

      this.scene.add(particle);
      particles.push({ mesh: particle, velocity, life: 1.0 });
    }

    // Pass up to a global manager or handle internally
    if (window.gameInstance) {
      window.gameInstance.addParticles(particles);
    }
  }

  spawnDeathExplosion() {
    const particleCount = 30;
    const geometry = new THREE.SphereGeometry(0.2, 4, 4);
    const material = new THREE.MeshLambertMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.3
    });

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(geometry, material.clone());
      particle.position.copy(this.mesh.position);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.4) * 8 + 3,
        (Math.random() - 0.5) * 10
      );

      this.scene.add(particle);
      particles.push({ mesh: particle, velocity, life: 1.5 });
    }

    if (window.gameInstance) {
      window.gameInstance.addParticles(particles);
      window.gameInstance.scorePoints(this.faction === 'Broccoli' ? 100 : 150);
      window.gameInstance.registerKill();
      window.gameInstance.spawnLootPowerUps(this.mesh.position);
    }
  }

  die(silent = false) {
    logDebug(`[NpcEngine] ${this.faction} died. Silent: ${silent}`);
    this.state = NPC_STATES.DEAD;
    if (!silent) {
      this.spawnDeathExplosion();
    }
    
    if (this.body) {
      this.physicsWorld.deferRemoveBody(this.body);
    }
    this.scene.remove(this.mesh);
  }

  // Diagnostic logger — call from update() once per frame to throttle output.
  _logDiag(deltaTime, distToPlayer) {
    this._diagTimer -= deltaTime;
    if (this._diagTimer > 0) return;
    this._diagTimer = 0.5; // log every 0.5 s

    const b = this.body;
    const vel   = b ? `vel(${b.velocity.x.toFixed(2)}, ${b.velocity.y.toFixed(2)}, ${b.velocity.z.toFixed(2)})` : 'NO BODY';
    const force = b ? `force(${b.force.x.toFixed(2)}, ${b.force.y.toFixed(2)}, ${b.force.z.toFixed(2)})` : '';
    const sleep = b ? `sleepState=${b.sleepState}` : ''; // 0=AWAKE 1=SLEEPY 2=SLEEPING
    const pos   = b ? `pos(${b.position.x.toFixed(2)}, ${b.position.y.toFixed(2)}, ${b.position.z.toFixed(2)})` : '';
    const toP   = `toPlayer(${this._toPlayer.x.toFixed(2)}, ${this._toPlayer.y.toFixed(2)}, ${this._toPlayer.z.toFixed(2)})`;
    const hb    = `hoverBypass=${this.hoverBypassTimer.toFixed(2)}`;
    logDebug(`${this._diagLabel} state=${this.state} dist=${distToPlayer.toFixed(2)}m | ${pos} | ${vel} | ${force} | ${sleep} | ${toP} | ${hb}`);
  }

  update(deltaTime, playerPos, onNpcShoot) {
    if (this.state === NPC_STATES.DEAD || !this.body) return;

    // Decrement FSM hover bypass timer
    this.hoverBypassTimer = Math.max(0, this.hoverBypassTimer - deltaTime);

    // Sync mesh position with body (physics class handles standard sync, but we double-check)
    this.mesh.position.copy(this.body.position);

    // Handle linearDamping transitions between states
    if (this.state !== this._previousState) {
      logDebug(`[NpcEngine] ${this.faction} state transitioned from ${this._previousState} to ${this.state}`);
      if (this.state === NPC_STATES.ATTACK) {
        this.body.linearDamping = 0.92; // High damping to stop drifting in attack stance
      } else {
        this.body.linearDamping = 0.6;  // Normal NPC damping
      }
      this._previousState = this.state;
    }

    if (CONFIG.npc.aiFrozen) {
      // Keep NPCs floating in place but bypass state changes/movements
      this.updateIdle(deltaTime);
      return;
    }

    const distanceToPlayer = this.mesh.position.distanceTo(playerPos);
    this._toPlayer.subVectors(playerPos, this.mesh.position);

    // Throttled diagnostic log — reads body force, velocity, sleep state, and toPlayer vector.
    this._logDiag(deltaTime, distanceToPlayer);

    // Turn towards player (yaw only)
    const yaw = Math.atan2(this._toPlayer.x, this._toPlayer.z);
    this.mesh.rotation.y = yaw;

    // Simple FSM transition logic
    switch (this.state) {
      case NPC_STATES.IDLE:
        this.updateIdle(deltaTime);
        if (distanceToPlayer < this.chaseRange) {
          this.state = NPC_STATES.CHASE;
        }
        break;

      case NPC_STATES.CHASE:
        this.updateChase(deltaTime, this._toPlayer);
        if (distanceToPlayer > this.chaseRange + 4) {
          this.state = NPC_STATES.IDLE;
        } else if (distanceToPlayer < this.attackRange) {
          this.state = NPC_STATES.ATTACK;
        }
        break;

      case NPC_STATES.ATTACK:
        this.updateAttack(deltaTime, this._toPlayer, onNpcShoot);
        if (distanceToPlayer > this.attackRange + 2) {
          this.state = NPC_STATES.CHASE;
        }
        break;
    }
  }

  updateIdle(deltaTime) {
    // Spring-force correction to maintain target hover height (ground level)
    this._applyHoverForce();
    
    // Drag towards spawn point horizontally
    const toSpawn = this._toSpawn.copy(this.spawnPoint).vsub(this.body.position);
    if (toSpawn.length() > 1.5) {
      toSpawn.normalize();
      this.body.applyForce(toSpawn.scale(8), this.body.position);
    }
  }

  // Applies a spring-like force to keep the NPC at its target hover height.
  // Counteracts gravity and corrects vertical drift proportionally.
  _applyHoverForce() {
    if (this.hoverBypassTimer > 0) return; // Skip hover correction if bypassed for jump/boost
    
    const npcMass = this.body.mass;
    const gravityForce = CONFIG.physics.gravity * npcMass;
    const heightError = this.targetHoverY - this.body.position.y;
    
    // Spring constant: stronger correction for larger deviations
    const springK = 25;
    // Damping to prevent oscillation
    const dampingK = 8;
    const correctionForce = heightError * springK * npcMass - this.body.velocity.y * dampingK * npcMass;
    
    // Total upward force: gravity compensation + spring correction
    this._hoverForce.set(0, gravityForce + correctionForce, 0);
    this.body.applyForce(this._hoverForce, this.body.position);
  }

  updateChase(deltaTime, toPlayer) {
    const heightDiff = toPlayer.y; // Player Y minus NPC Y (since toPlayer is player - npc)

    // Jump & Boost logic
    if (this.hoverBypassTimer <= 0) {
      // If grounded (near target hover Y)
      if (Math.abs(this.body.position.y - this.targetHoverY) < 0.5) {
          // Jump only when the player is significantly above the NPC.
          if (heightDiff > 2.0) {
            this._jumpImpulse.set(0, this.body.mass * 8, 0); // Need enough force to break gravity
            this.body.applyImpulse(this._jumpImpulse, this.body.position);
            this.hoverBypassTimer = 0.5; // Disable hover for 0.5s to allow jump
          }
      }
    } else {
      // Airborne & need to reach player: Jetpack Boost
      if (heightDiff > 0.5 && this.body.position.y > this.targetHoverY + 0.5) {
        const boostThrust = CONFIG.player.jetpackThrust * 0.5;
        this._boostForce.set(0, boostThrust, 0);
        this.body.applyForce(this._boostForce, this.body.position);
        this.hoverBypassTimer = 0.2; // Keep hover disabled while boosting
      }
    }

    // Maintain hover height via spring force (will skip if bypassing for jump)
    this._applyHoverForce();

    // Drift towards player horizontally
    const direction = this._fireDir.copy(toPlayer).normalize();
    const force = this._chaseForce;
    force.set(
      direction.x * this.speed * 12,
      0, // Vertical handled by _applyHoverForce
      direction.z * this.speed * 12
    );
    this.body.applyForce(force, this.body.position);
  }

  updateAttack(deltaTime, toPlayer, onNpcShoot) {
    // Maintain hover height via spring force (linearDamping handles horizontal stopping)
    this._applyHoverForce();

    // Shooting interval check
    const now = performance.now() / 1000;
    if (now - this.lastFiredTime > this.fireRate) {
      this.lastFiredTime = now;
      
      const fireDir = this._fireDir.copy(toPlayer).normalize();
      // Add configurable vertical tilt to compensate for projectile gravity drop
      fireDir.y += CONFIG.npc.projectileYBias;
      fireDir.normalize();

      onNpcShoot(this, fireDir);
    }
  }
}

// Broccoli Boy Subclass
export class BroccoliBoy extends BaseNpc {
  constructor(scene, physicsWorld, position) {
    super(scene, physicsWorld, position, 'Broccoli');
    this.health = 40;
    this.maxHealth = 40;
    this.speed = 4.5;
    this.color = 0x22c55e; // Neon Green
    this.fireRate = 2.0;
    
    this.createVisuals();
    this.createPhysics(position);
  }

  createVisuals() {
    // Delegate all mesh construction to the BroccoliModel factory.
    // Shadow casting/receiving is applied automatically via factory traverse.
    this.mesh = createBroccoliModel();
    this.mesh.position.copy(this.spawnPoint);
    this.scene.add(this.mesh);
  }

  createPhysics(position) {
    // Sphere physics body
    this.body = this.physicsWorld.createNpcBody(position, { radius: 0.85 }, false);
    this.physicsWorld.registerSync(this.mesh, this.body);

    // Store reference inside body
    this.body.npcInstance = this;
  }
}

// Carrot Cartel Subclass
export class CarrotCartel extends BaseNpc {
  constructor(scene, physicsWorld, position) {
    super(scene, physicsWorld, position, 'Carrot');
    this.health = 50;
    this.maxHealth = 50;
    this.speed = 5.5;
    this.color = 0xf97316; // Neon Orange
    this.fireRate = 1.4; // Fasts shooters
    this.attackRange = 16; // Sniper distance
    
    this.createVisuals();
    this.createPhysics(position);
  }

  createVisuals() {
    // Delegate all mesh construction to the CarrotModel factory.
    // Shadow casting/receiving is applied automatically via factory traverse.
    this.mesh = createCarrotModel();
    this.mesh.position.copy(this.spawnPoint);
    this.scene.add(this.mesh);
  }

  createPhysics(position) {
    // Cylinder physics body (offset, size, isCarrot)
    this.body = this.physicsWorld.createNpcBody(position, { radius: 0.5 }, true);
    this.physicsWorld.registerSync(this.mesh, this.body);

    // Store reference inside body
    this.body.npcInstance = this;
  }
}

// Manager Engine
export class NpcEngine {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.npcs = [];
  }

  spawnBroccoli(position) {
    const broccoli = new BroccoliBoy(this.scene, this.physicsWorld, position);
    this.npcs.push(broccoli);
    return broccoli;
  }

  spawnCarrot(position) {
    const carrot = new CarrotCartel(this.scene, this.physicsWorld, position);
    this.npcs.push(carrot);
    return carrot;
  }

  update(deltaTime, playerPosition, onNpcShoot) {
    // Update all active NPCs
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i];
      if (npc.state === NPC_STATES.DEAD) {
        const last = this.npcs.pop();
        if (i < this.npcs.length) {
          this.npcs[i] = last;
        }
        continue;
      }
      npc.update(deltaTime, playerPosition, onNpcShoot);
    }
  }

  clearAll() {
    this.npcs.forEach((npc) => {
      npc.die(true); // Silent: no death explosion, no score/kills awarded
    });
    this.npcs = [];
  }
}
