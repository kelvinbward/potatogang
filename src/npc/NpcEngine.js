import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsWorld } from '../physics/PhysicsWorld';

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
    this.idleTimeOffset = Math.random() * 100;

    // Main 3D visual container
    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    // Physics body reference
    this.body = null;
  }

  takeDamage(amount, hitPoint, hitDirection) {
    if (this.state === NPC_STATES.DEAD) return;

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
    }
  }

  die() {
    this.state = NPC_STATES.DEAD;
    this.spawnDeathExplosion();
    
    if (this.body) {
      this.physicsWorld.removeBody(this.body);
    }
    this.scene.remove(this.mesh);
  }

  update(deltaTime, playerPos, onNpcShoot) {
    if (this.state === NPC_STATES.DEAD || !this.body) return;

    // Sync mesh position with body (physics class handles standard sync, but we double-check)
    this.mesh.position.copy(this.body.position);

    const distanceToPlayer = this.mesh.position.distanceTo(playerPos);
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
    
    // Turn towards player (yaw only)
    const yaw = Math.atan2(toPlayer.x, toPlayer.z);
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
        this.updateChase(deltaTime, toPlayer);
        if (distanceToPlayer > this.chaseRange + 4) {
          this.state = NPC_STATES.IDLE;
        } else if (distanceToPlayer < this.attackRange) {
          this.state = NPC_STATES.ATTACK;
        }
        break;

      case NPC_STATES.ATTACK:
        this.updateAttack(deltaTime, toPlayer, onNpcShoot);
        if (distanceToPlayer > this.attackRange + 2) {
          this.state = NPC_STATES.CHASE;
        }
        break;
    }
  }

  updateIdle(deltaTime) {
    // Float gently using math
    const time = (performance.now() * 0.002) + this.idleTimeOffset;
    const floatForce = Math.sin(time) * 1.5;
    
    // Add anti-gravity compensation
    this.body.applyForce(new CANNON.Vec3(0, 12 + floatForce, 0), this.body.position);
    
    // Drag towards spawn point
    const toSpawn = new CANNON.Vec3().copy(this.spawnPoint).vsub(this.body.position);
    if (toSpawn.length() > 1.5) {
      toSpawn.normalize();
      this.body.applyForce(toSpawn.scale(8), this.body.position);
    }
  }

  updateChase(deltaTime, toPlayer) {
    // Drift towards player
    const direction = toPlayer.clone().normalize();
    
    // Apply thruster force towards player
    const force = new CANNON.Vec3(
      direction.x * this.speed * 12,
      direction.y * this.speed * 12 + 12.5, // Counteract gravity and adjust height
      direction.z * this.speed * 12
    );
    this.body.applyForce(force, this.body.position);
  }

  updateAttack(deltaTime, toPlayer, onNpcShoot) {
    // Damp current speed to stop drifting completely
    const vel = this.body.velocity;
    this.body.velocity.set(vel.x * 0.88, vel.y * 0.88, vel.z * 0.88);

    // Levitating force
    this.body.applyForce(new CANNON.Vec3(0, 12, 0), this.body.position);

    // Shooting interval check
    const now = performance.now() / 1000;
    if (now - this.lastFiredTime > this.fireRate) {
      this.lastFiredTime = now;
      
      const fireDir = toPlayer.clone().normalize();
      // Add slight vertical tilt to counteract low-gravity drop on visual projectiles
      fireDir.y += 0.08;
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
    // Low-poly broccoli: Stalk + green clustered spheres
    const stalkGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.2, 5);
    const stalkMat = new THREE.MeshLambertMaterial({ color: 0x854d0e }); // Brownish
    const stalk = new THREE.Mesh(stalkGeo, stalkMat);
    stalk.position.y = -0.3;
    this.mesh.add(stalk);

    // Crown consisting of 3 green overlapping spheres
    const crownMat = new THREE.MeshLambertMaterial({ color: 0x166534 }); // Deep Green
    const crownGeo = new THREE.SphereGeometry(0.55, 6, 6);

    const sphere1 = new THREE.Mesh(crownGeo, crownMat);
    sphere1.position.set(0, 0.4, 0);
    this.mesh.add(sphere1);

    const sphere2 = new THREE.Mesh(crownGeo, crownMat);
    sphere2.position.set(-0.35, 0.25, 0.2);
    sphere2.scale.set(0.9, 0.9, 0.9);
    this.mesh.add(sphere2);

    const sphere3 = new THREE.Mesh(crownGeo, crownMat);
    sphere3.position.set(0.35, 0.25, -0.2);
    sphere3.scale.set(0.85, 0.85, 0.85);
    this.mesh.add(sphere3);

    // Angry eyes
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.25, 0.35, 0.45);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.25, 0.35, 0.45);
    
    this.mesh.add(leftEye);
    this.mesh.add(rightEye);

    // Position setup
    this.mesh.position.copy(this.spawnPoint);
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
    // Low-poly carrot: Elongated cone pointing downwards + green cylinders leaf crown
    const bodyGeo = new THREE.ConeGeometry(0.4, 1.8, 6);
    // Rotate cone so the sharp end points down
    bodyGeo.rotateX(Math.PI);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xea580c }); // Rich Orange
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0;
    this.mesh.add(body);

    // Green leafy tops at the flat top (Y is positive since cone tip is inverted down)
    const leafGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 4);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x15803d }); // Bright green
    
    const leaf1 = new THREE.Mesh(leafGeo, leafMat);
    leaf1.position.set(0, 1.1, 0);
    leaf1.rotation.z = 0.2;
    this.mesh.add(leaf1);

    const leaf2 = new THREE.Mesh(leafGeo, leafMat);
    leaf2.position.set(-0.15, 1.05, 0.1);
    leaf2.rotation.z = -0.35;
    leaf2.rotation.x = 0.25;
    this.mesh.add(leaf2);

    const leaf3 = new THREE.Mesh(leafGeo, leafMat);
    leaf3.position.set(0.15, 1.05, -0.1);
    leaf3.rotation.z = 0.35;
    leaf3.rotation.x = -0.25;
    this.mesh.add(leaf3);

    // Angry eyes
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.08);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.18, 0.4, 0.25);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.18, 0.4, 0.29);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.18, 0.4, 0.25);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.18, 0.4, 0.29);

    // Slanted brow for anger
    const browGeo = new THREE.BoxGeometry(0.5, 0.05, 0.05);
    const browMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const brow = new THREE.Mesh(browGeo, browMat);
    brow.position.set(0, 0.49, 0.27);
    brow.rotation.z = 0.05;

    this.mesh.add(leftEye);
    this.mesh.add(leftPupil);
    this.mesh.add(rightEye);
    this.mesh.add(rightPupil);
    this.mesh.add(brow);

    this.mesh.position.copy(this.spawnPoint);
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
        this.npcs.splice(i, 1);
        continue;
      }
      npc.update(deltaTime, playerPosition, onNpcShoot);
    }
  }

  clearAll() {
    this.npcs.forEach((npc) => {
      npc.die();
    });
    this.npcs = [];
  }
}
