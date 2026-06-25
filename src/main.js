import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { NpcEngine } from './npc/NpcEngine.js';
import { LevelManager } from './level/LevelManager.js';
import { PowerUpManager } from './level/PowerUpManager.js';
import { CONFIG, logDebug } from './config.js';
import { GUI } from 'lil-gui';
import { supabase } from './supabaseClient.js';

class Game {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.physicsWorld = null;
    this.npcEngine = null;

    // View objects
    this.yawObject = null;
    this.pitchObject = null;
    this.weaponGroup = null;

    // Input state
    this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
    this.isLocked = false;

    // Game stats
    this.health = CONFIG.player.maxHealth;
    this.maxHealth = CONFIG.player.maxHealth;
    this.score = 0;
    this.kills = 0;
    this.wave = 1;
    this.ammo = CONFIG.weapon.maxAmmo;
    this.maxAmmo = CONFIG.weapon.maxAmmo;
    this.lastAmmoRegenTime = 0;
    this.isGameOver = false;

    // Jetpack / Jump state
    this.jetpackFuel = CONFIG.player.jetpackFuelCapacity;
    this.maxJetpackFuel = CONFIG.player.jetpackFuelCapacity;
    this.isGrounded = true;
    this.canDoubleJump = false;
    this.hasDoubleJumped = false;

    // Stamina state
    this.stamina = CONFIG.player.staminaCapacity;
    this.maxStamina = CONFIG.player.staminaCapacity;

    // Pre-allocated vectors for performance in hot paths
    this._moveDirection = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._yAxis = new THREE.Vector3(0, 1, 0);

    // Projectile tracking lists
    this.projectiles = [];
    this.npcProjectiles = [];

    // Particle tracking lists
    this.particles = [];

    // Recoil state
    this.recoilOffset = 0;
    this.recoilRotation = 0;

    // Raycast target detection
    this.raycaster = new THREE.Raycaster();
    this.centerScreen = new THREE.Vector2(0, 0);
    this.activeEnemyMeshes = [];

    // Timing
    this.timer = new THREE.Timer();

    // DOM References
    this.blocker = document.getElementById('blocker');
    this.instructions = document.getElementById('instructions');
    this.hud = document.getElementById('hud');
    this.gameOverScreen = document.getElementById('game-over');
    this.healthBar = document.getElementById('health-bar');
    this.healthText = document.getElementById('health-text');
    this.scoreText = document.getElementById('score');
    this.killsText = document.getElementById('kills');
    this.remainingText = document.getElementById('remaining');
    this.finalScoreText = document.getElementById('final-score');
    this.finalKillsText = document.getElementById('final-kills');
    this.restartBtn = document.getElementById('restart-btn');
    this.crosshairRing = document.querySelector('.crosshair-ring');

    this.scoreSubmission = document.getElementById('score-submission');
    this.playerNameInput = document.getElementById('player-name');
    this.submitScoreBtn = document.getElementById('submit-score-btn');
    this.leaderboardList = document.getElementById('leaderboard-list');

    if (this.submitScoreBtn) {
      this.submitScoreBtn.addEventListener('click', () => this.submitHighScore());
    }

    this.jetpackBar = document.getElementById('jetpack-bar');
    this.jetpackText = document.getElementById('jetpack-text');
    this.staminaBar = document.getElementById('stamina-bar');
    this.staminaText = document.getElementById('stamina-text');

    // Register global instance for NPCs to hook into
    window.gameInstance = this;

    this.init();
  }

  init() {
    // 1. Setup Three.js Scene, Camera, and Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);
    this.scene.fog = new THREE.FogExp2(0x0a0a12, 0.015);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    // 2. Setup Lighting
    const ambientLight = new THREE.AmbientLight(0x0c0f1d, 0.15);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff0dd, 0.4);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    const d = 30;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    // Setup power-ups manager (dynamic orbs & point lights)
    this.powerUpManager = new PowerUpManager(this.scene, this);

    // Setup drifting kitchen steam particles
    this.setupSteamParticles();

    // Cyberpunk Grid floor
    const gridHelper = new THREE.GridHelper(100, 50, 0x00e5ff, 0x112233);
    gridHelper.position.y = CONFIG.world.GROUND_Y + 0.02; // Slight offset to prevent z-fighting
    this.scene.add(gridHelper);

    // 3. Setup Physics World
    this.physicsWorld = new PhysicsWorld();

    // 4. Create Player Physics Body — spawn at ground level
    const playerSpawnY = CONFIG.world.GROUND_Y + CONFIG.player.collisionRadius;
    this.playerBody = this.physicsWorld.createPlayerBody({ x: 0, y: playerSpawnY, z: 0 }, CONFIG.player.collisionRadius);

    // 5. Setup Camera Yaw/Pitch Control Rig
    this.yawObject = new THREE.Group();
    this.pitchObject = new THREE.Group();
    this.scene.add(this.yawObject);
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(this.camera);

    // 6. Build the Spud Launcher Weapon model
    this.buildWeapon();

    // 7. Create NPC Engine
    this.npcEngine = new NpcEngine(this.scene, this.physicsWorld);

    // 8. Load Kitchen Level via the data-driven LevelManager pipeline
    this.levelManager = new LevelManager(this.scene, this.physicsWorld);
    this.levelManager.loadLevel();

    // 9. Spawn initial NPCs
    this.spawnEnemies();

    // 10. Bind Input & PointerLock Event Listeners
    this.setupControls();

    // 11. Setup lil-gui developer admin debug panel
    this.setupDebugPanel();

    // 12. Adjust screen size on resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Start UI
    this.updateAmmoUI();

    // Start main game loop
    this.animate();
  }

  buildWeapon() {
    this.weaponGroup = new THREE.Group();
    this.pitchObject.add(this.weaponGroup);

    // Barrel (Futuristic Tube)
    const barrelGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      metalness: 0.9,
      roughness: 0.15
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(0.24, -0.16, -0.42);
    this.weaponGroup.add(barrel);

    // Grip
    const gripGeo = new THREE.BoxGeometry(0.04, 0.12, 0.06);
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.9
    });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0.24, -0.24, -0.34);
    this.weaponGroup.add(grip);

    // Energy cart housing
    const coreGeo = new THREE.BoxGeometry(0.09, 0.09, 0.16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.7
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0.24, -0.16, -0.32);
    this.weaponGroup.add(core);

    // Green Neon battery tube
    const energyGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8);
    energyGeo.rotateX(Math.PI / 2);
    const energyMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
    const energy = new THREE.Mesh(energyGeo, energyMat);
    energy.position.set(0.24, -0.11, -0.32);
    this.weaponGroup.add(energy);

    // Weapon Muzzle Flash point
    this.muzzleFlash = new THREE.PointLight(0x39ff14, 0, 3);
    this.muzzleFlash.position.set(0.24, -0.16, -0.66);
    this.weaponGroup.add(this.muzzleFlash);
  }


  setupSteamParticles() {
    const particleCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 120;     // X: across the play counter
      positions[i + 1] = Math.random() * 25 - 5;       // Y: from -5 to 20m height
      positions[i + 2] = (Math.random() - 0.5) * 120;   // Z
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.15,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    this.steamParticles = new THREE.Points(geometry, material);
    this.scene.add(this.steamParticles);
  }

  spawnEnemies() {
    this.npcEngine.clearAll();
    if (!CONFIG.npc.spawnEnabled) return;

    // Derive NPC spawn heights from CONFIG.world.GROUND_Y
    const broccoliY = CONFIG.world.GROUND_Y + 0.85; // sphere radius
    const carrotY = CONFIG.world.GROUND_Y + 1.25;   // half cylinder height

    const broccoliSpawns = [
      { x: -10, y: broccoliY, z: 10 },
      { x: 10, y: broccoliY, z: -10 },
      { x: -18, y: broccoliY, z: 8 },
      { x: 18, y: broccoliY, z: -8 }
    ];

    const carrotSpawns = [
      { x: 0, y: carrotY, z: -18 },
      { x: -12, y: carrotY, z: 12 },
      { x: 12, y: carrotY, z: -12 }
    ];

    logDebug(`[Game] Spawning new wave: ${broccoliSpawns.length} Broccoli, ${carrotSpawns.length} Carrots`);

    broccoliSpawns.forEach(pos => {
      this.npcEngine.spawnBroccoli(pos);
      logDebug(`[Game] Spawned Broccoli at {x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)}}`);
    });

    carrotSpawns.forEach(pos => {
      this.npcEngine.spawnCarrot(pos);
      logDebug(`[Game] Spawned Carrot at {x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)}}`);
    });
  }

  // Returns a spawn position at ground level, offset in front of the player's current look direction.
  getSpawnInFrontOfPlayer(entityHalfHeight) {
    const yawAngle = this.yawObject.rotation.y;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle).normalize();
    const spawnDist = 6;
    return {
      x: this.yawObject.position.x + forward.x * spawnDist,
      y: CONFIG.world.GROUND_Y + entityHalfHeight,
      z: this.yawObject.position.z + forward.z * spawnDist
    };
  }

  setupControls() {
    // Click blocker to request pointer lock on document.body for cross-browser reliability
    this.blocker.addEventListener('click', () => {
      document.body.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === document.body) {
        this.isLocked = true;
        this.blocker.classList.add('hidden');
        this.hud.classList.remove('hidden');
      } else {
        this.isLocked = false;
        if (!this.isGameOver) {
          this.blocker.classList.remove('hidden');
          this.hud.classList.add('hidden');
        }
      }
    });

    // Keyboard bindings
    const onKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.w = true; break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.a = true; break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.s = true; break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.d = true; break;
        case 'Space':
          if (!this.keys.space) {
            if (this.isGrounded) {
              // Apply jump impulse
              this.playerBody.applyImpulse(new CANNON.Vec3(0, CONFIG.player.jumpImpulse, 0), this.playerBody.position);
              this.isGrounded = false;
              this.canDoubleJump = true;
              this.hasDoubleJumped = false;
            } else if (this.canDoubleJump) {
              // Double jump -> Activate Jetpack
              this.hasDoubleJumped = true;
              this.canDoubleJump = false;
              this.jumpStartHeight = this.playerBody.position.y;
            }
          }
          this.keys.space = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.shift = true; break;
      }
    };

    const onKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.w = false; break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.a = false; break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.s = false; break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.d = false; break;
        case 'Space':
          this.keys.space = false; break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.shift = false; break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse movement -> look direction
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      this.yawObject.rotation.y -= e.movementX * 0.002;
      this.pitchObject.rotation.x -= e.movementY * 0.002;

      // Clamp vertical look angle
      this.pitchObject.rotation.x = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.pitchObject.rotation.x));
    });

    // Fire on click
    document.addEventListener('mousedown', (e) => {
      if (!this.isLocked || this.isGameOver) return;
      if (e.button === 0) { // Left-click
        this.fireProjectile();
      }
    });

    // Restart game button
    this.restartBtn.addEventListener('click', () => {
      this.restartBtn.blur();
      this.resetGame();
    });
  }

  setupDebugPanel() {
    this.gui = new GUI({ title: 'Dev Admin Panel' });
    this.gui.close();

    // Toggle visibility with 'H' or 'F3' key
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' || e.code === 'F3') {
        if (this.gui.domElement.style.display === 'none') {
          this.gui.show();
          // Release pointer lock so user can interact with the menu
          document.exitPointerLock();
        } else {
          this.gui.hide();
        }
      }
    });

    // Start hidden, let KeyH or F3 toggle it
    this.gui.hide();

    // 1. Sandbox Folder
    const sandboxFolder = this.gui.addFolder('Sandbox');
    sandboxFolder.add(CONFIG.sandbox, 'debugLogging').name('Debug Logging');
    sandboxFolder.add(CONFIG.sandbox, 'spawnBroccoli').name('Spawn Broccoli (Front)');
    sandboxFolder.add(CONFIG.sandbox, 'spawnCarrot').name('Spawn Carrot (Front)');
    sandboxFolder.add(CONFIG.sandbox, 'clearAllNPCs').name('Clear All Enemies');

    // 2. Physics Folder
    const physicsFolder = this.gui.addFolder('Physics');
    physicsFolder.add(CONFIG.physics, 'gravity', 0, 9.8, 0.1).name('Gravity').onChange((value) => {
      if (this.physicsWorld) {
        this.physicsWorld.updateGravity(value);
      }
    });

    // 3. Player & Weapon Folder
    const playerFolder = this.gui.addFolder('Player & Weapon');
    playerFolder.add(CONFIG.player, 'godMode').name('God Mode');
    playerFolder.add(CONFIG.player, 'infiniteAmmo').name('Infinite Ammo');
    playerFolder.add(CONFIG.player, 'walkThrust', 100, 1500, 50).name('Walk Thrust');
    playerFolder.add(CONFIG.player, 'runThrust', 200, 2500, 50).name('Run Thrust');
    playerFolder.add(CONFIG.player, 'jetpackThrust', 200, 2000, 50).name('Jetpack Thrust');
    playerFolder.add(CONFIG.player, 'jumpImpulse', 50, 1000, 10).name('Jump Impulse');
    playerFolder.add(CONFIG.player, 'maxBoostHeight', 2, 30, 0.5).name('Max Boost Height');
    playerFolder.add(CONFIG.weapon, 'ammoRegenEnabled').name('Ammo Regen Enabled');
    playerFolder.add(CONFIG.weapon, 'ammoRegenInterval', 0.1, 3.0, 0.1).name('Ammo Regen Delay');
    playerFolder.add(CONFIG.weapon, 'projectileSpeed', 10, 100, 1).name('Spud Bullet Speed');
    playerFolder.add(CONFIG.weapon, 'projectileDamage', 5, 100, 5).name('Spud Damage');

    // 4. NPCs Folder
    const npcFolder = this.gui.addFolder('NPC / Enemies');
    npcFolder.add(CONFIG.npc, 'spawnEnabled').name('Wave Spawning').onChange((value) => {
      if (!value) {
        this.npcEngine.clearAll();
      } else {
        this.spawnEnemies();
      }
    });
    npcFolder.add(CONFIG.npc, 'aiFrozen').name('Freeze AI');
    npcFolder.add(CONFIG.npc, 'projectileSpeed', 5, 50, 0.5).name('Veggies Bullet Speed');
    npcFolder.add(CONFIG.npc, 'projectileDamage', 1, 100, 1).name('Veggies Damage');

    // 5. Environment Folder
    const envFolder = this.gui.addFolder('Environment');
    envFolder.add(CONFIG.environment, 'loadObstacles').name('Load Configured Obstacles').onChange((value) => {
      if (value) {
        this.levelManager.loadLevel();
      } else {
        this.levelManager.unloadLevel();
      }
    });

    // 6. Power-Ups Folder
    const powerupFolder = this.gui.addFolder('Power-Ups');
    powerupFolder.add(CONFIG.powerups, 'respawnEnabled').name('Respawn Enabled');
    powerupFolder.add(CONFIG.powerups, 'respawnTime', 1, 30, 0.5).name('Respawn Cooldown');
    powerupFolder.add(CONFIG.powerups, 'collectionRadius', 0.5, 5, 0.1).name('Pickup Radius');
    powerupFolder.add(CONFIG.powerups, 'healthAmount', 5, 100, 5).name('HP Heal Amount');
    powerupFolder.add(CONFIG.powerups, 'ammoAmount', 1, 10, 1).name('Ammo Reload Amount');
    powerupFolder.add(CONFIG.powerups, 'boostAmount', 10, 100, 5).name('Fuel Charge Amount');
    powerupFolder.add(CONFIG.powerups, 'floatSpeed', 0.5, 5.0, 0.1).name('Float Speed');
    powerupFolder.add(CONFIG.powerups, 'rotateSpeed', 0.5, 5.0, 0.1).name('Rotate Speed');
  }

  fireProjectile() {
    if (this.ammo <= 0 && !CONFIG.player.infiniteAmmo) return;

    if (!CONFIG.player.infiniteAmmo) {
      this.ammo--;
      this.updateAmmoUI();
    }
    logDebug(`[Game] Player fired projectile. Ammo remaining: ${this.ammo}`);

    // 1. Calculate camera launch vector
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.normalize();

    // Spawn slightly in front/right of the camera (resembling gun muzzle)
    const launchPos = new THREE.Vector3()
      .copy(this.yawObject.position)
      .addScaledVector(direction, 0.8);
    // Offset slightly right
    const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    launchPos.addScaledVector(right, -0.18);
    launchPos.y -= 0.12; // Adjust muzzle height

    // 2. Launch physics projectile
    const speed = CONFIG.weapon.projectileSpeed;
    const velocity = new CANNON.Vec3(
      direction.x * speed,
      direction.y * speed,
      direction.z * speed
    );

    const radius = 0.2;
    const body = this.physicsWorld.createProjectileBody(launchPos, velocity, radius, false);

    // 3. Create visual potato wedge shape (Sphere scaled in Z direction)
    const projGeo = new THREE.SphereGeometry(radius, 6, 6);
    projGeo.scale(1, 1, 2.5); // Wedge scale
    const projMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Golden potato color
      emissive: 0xca8a04,
      emissiveIntensity: 0.4,
      metalness: 0.1,
      roughness: 0.8
    });
    const mesh = new THREE.Mesh(projGeo, projMat);
    mesh.castShadow = true;
    this.scene.add(mesh);

    // Sync mesh with physics
    this.physicsWorld.registerSync(mesh, body);

    const projectile = { body, mesh, life: CONFIG.weapon.projectileLife };
    this.projectiles.push(projectile);

    // Collision listener on projectile
    body.addEventListener('collide', (event) => {
      const targetBody = event.body;
      
      // If hit NPC, deal damage
      if (targetBody.npcInstance) {
        const hitDirection = direction.clone();
        targetBody.npcInstance.takeDamage(CONFIG.weapon.projectileDamage, mesh.position, hitDirection);
      }

      // Small hit splat particles (golden energy/mashed potato crumbs)
      this.spawnImpactParticles(mesh.position, 0xfacc15);

      // Instantly schedule removal
      projectile.life = 0;
    });

    // 4. Trigger Spud Launcher recoil animation
    this.recoilOffset = CONFIG.weapon.recoilOffset;
    this.recoilRotation = CONFIG.weapon.recoilRotation;

    // Trigger visual muzzle flash
    this.muzzleFlash.intensity = 5;
    setTimeout(() => {
      this.muzzleFlash.intensity = 0;
    }, 70);
  }

  // Handle NPC firing back
  onNpcShoot(npc, direction) {
    if (this.isGameOver) return;

    const launchPos = new THREE.Vector3()
      .copy(npc.mesh.position)
      .addScaledVector(direction, 1.2);

    const speed = CONFIG.npc.projectileSpeed;
    const velocity = new CANNON.Vec3(
      direction.x * speed,
      direction.y * speed,
      direction.z * speed
    );

    const body = this.physicsWorld.createProjectileBody(launchPos, velocity, 0.18, true);

    // Visual red/orange energy ball representing vegetable juice/seeds
    const projGeo = new THREE.SphereGeometry(0.18, 5, 5);
    const color = npc.faction === 'Broccoli' ? 0xef4444 : 0xf97316; // Red tomato juice / orange carrot darts
    const projMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(projGeo, projMat);
    this.scene.add(mesh);

    this.physicsWorld.registerSync(mesh, body);

    const npcProjectile = { body, mesh, life: CONFIG.npc.projectileLife };
    this.npcProjectiles.push(npcProjectile);

    body.addEventListener('collide', (event) => {
      if (event.body === this.playerBody) {
        this.playerTakeDamage(CONFIG.npc.projectileDamage);
        this.spawnImpactParticles(mesh.position, color);
      }
      npcProjectile.life = 0; // Destroy on impact
    });
  }

  playerTakeDamage(amount) {
    if (this.isGameOver || CONFIG.player.godMode) return;

    logDebug(`[Game] Player took ${amount} damage.`);

    this.health = Math.max(0, this.health - amount);
    this.updateHUD();

    // Damage flash UI
    document.body.style.backgroundColor = '#991b1b';
    setTimeout(() => {
      document.body.style.backgroundColor = '#050608';
    }, 100);

    if (this.health <= 0) {
      this.triggerGameOver();
    }
  }

  spawnImpactParticles(position, color) {
    const particlesCount = 6;
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });

    const particles = [];
    for (let i = 0; i < particlesCount; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      );

      this.scene.add(mesh);
      particles.push({ mesh, velocity, life: 0.6 });
    }
    this.addParticles(particles);
  }

  addParticles(newParticles) {
    this.particles.push(...newParticles);
  }

  scorePoints(pts) {
    this.score += pts;
    this.updateHUD();
  }

  registerKill() {
    this.kills += 1;
    this.updateHUD();

    // If all vegetables are defeated, spawn another wave!
    if (CONFIG.npc.spawnEnabled && this.npcEngine.npcs.filter(npc => npc.state !== 'DEAD').length === 0) {
      setTimeout(() => {
        this.spawnEnemies();
        document.getElementById('hud-message').innerText = "WAVE COMPLETED! NEW THREATS INCOMING...";
        setTimeout(() => {
          this.wave++;
          document.getElementById('hud-message').innerText = `WAVE ${this.wave}`;
        }, 3000);
      }, 1500);
    }
  }

  spawnLootPowerUps(position) {
    if (this.powerUpManager) {
      this.powerUpManager.spawnLoot(position);
    }
  }

  updateHUD() {
    this.healthBar.style.width = `${this.health}%`;
    this.healthText.innerText = Math.round(this.health);

    if (this.jetpackBar && this.jetpackText) {
      this.jetpackBar.style.width = `${this.jetpackFuel}%`;
      this.jetpackText.innerText = Math.round(this.jetpackFuel);
    }
    if (this.staminaBar && this.staminaText) {
      this.staminaBar.style.width = `${this.stamina}%`;
      this.staminaText.innerText = Math.round(this.stamina);
    }

    this.scoreText.innerText = String(this.score).padStart(5, '0');
    this.killsText.innerText = this.kills;

    // Live remaining enemies count — drives the wave-completion trigger visibility
    if (this.remainingText && this.npcEngine) {
      const alive = this.npcEngine.npcs.filter(npc => npc.state !== 'DEAD').length;
      this.remainingText.innerText = alive;
    }
  }

  updateAmmoUI() {
    const container = document.getElementById('ammo-dots');
    if (!container) return;

    const dots = container.children;
    
    // Recreate only if maxAmmo changed or dots list is empty/mismatched
    if (dots.length !== this.maxAmmo) {
      container.replaceChildren();
      for (let i = 0; i < this.maxAmmo; i++) {
        const dot = document.createElement('div');
        container.appendChild(dot);
      }
    }

    // Simply update the class on existing DOM elements
    for (let i = 0; i < this.maxAmmo; i++) {
      const spent = i >= this.ammo;
      const dotClass = 'ammo-dot' + (spent ? ' spent' : '');
      if (dots[i].className !== dotClass) {
        dots[i].className = dotClass;
      }
    }

    const textEl = document.getElementById('ammo-text');
    if (textEl) {
      textEl.innerText = `${this.ammo} / ${this.maxAmmo}`;
    }
  }

  async submitHighScore() {
    if (!this.playerNameInput || !this.submitScoreBtn) return;

    const playerName = this.playerNameInput.value.trim();
    if (!playerName) return;

    // Prevent double clicking
    this.submitScoreBtn.disabled = true;
    this.submitScoreBtn.innerText = 'SUBMITTING...';

    const { error } = await supabase
      .from('high_scores')
      .insert([
        { player_name: playerName, score: this.score, kills: this.kills }
      ]);

    if (error) {
      console.error('Error submitting score:', error);
      this.submitScoreBtn.disabled = false;
      this.submitScoreBtn.innerText = 'SUBMIT';
    } else {
      this.scoreSubmission.style.display = 'none';
      this.fetchLeaderboard();
    }
  }

  async fetchLeaderboard() {
    if (!this.leaderboardList) return;

    this.leaderboardList.innerHTML = '<li>Loading...</li>';

    const { data, error } = await supabase
      .from('high_scores')
      .select('player_name, score')
      .order('score', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      this.leaderboardList.innerHTML = '<li style="color: red;">Error loading scores</li>';
      return;
    }

    this.leaderboardList.innerHTML = '';

    if (data && data.length > 0) {
      data.forEach((entry, index) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.padding = '4px 0';
        li.style.borderBottom = '1px solid rgba(57, 255, 20, 0.2)';

        const rankName = document.createElement('span');
        rankName.innerText = `${index + 1}. ${entry.player_name}`;

        const scoreSpan = document.createElement('span');
        scoreSpan.innerText = entry.score;
        scoreSpan.style.color = 'var(--neon-green)';

        li.appendChild(rankName);
        li.appendChild(scoreSpan);
        this.leaderboardList.appendChild(li);
      });
    } else {
      this.leaderboardList.innerHTML = '<li>No scores yet!</li>';
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    document.exitPointerLock();

    this.finalScoreText.innerText = this.score;
    this.finalKillsText.innerText = this.kills;

    // Reset submission form
    if (this.scoreSubmission && this.submitScoreBtn && this.playerNameInput) {
      this.scoreSubmission.style.display = 'flex';
      this.submitScoreBtn.disabled = false;
      this.submitScoreBtn.innerText = 'SUBMIT';
      this.playerNameInput.value = '';
    }

    this.gameOverScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');

    this.fetchLeaderboard();
  }

  resetGame() {
    this.health = CONFIG.player.maxHealth;
    this.score = 0;
    this.kills = 0;
    this.wave = 1;
    this.ammo = CONFIG.weapon.maxAmmo;
    this.isGameOver = false;

    this.jetpackFuel = CONFIG.player.jetpackFuelCapacity;
    this.stamina = CONFIG.player.staminaCapacity;
    this.isGrounded = true;
    this.canDoubleJump = false;
    this.hasDoubleJumped = false;

    document.getElementById('hud-message').innerText = `WAVE ${this.wave}`;

    this.updateHUD();
    this.updateAmmoUI();

    // Reposition player physical body and clear velocity (lifecycle transition — permitted)
    const resetY = CONFIG.world.GROUND_Y + CONFIG.player.collisionRadius;
    this.playerBody.position.set(0, resetY, 0);
    this.playerBody.velocity.set(0, 0, 0);

    // Clear active projectiles
    this.projectiles.forEach(p => {
      this.physicsWorld.removeBody(p.body);
      this.scene.remove(p.mesh);
    });
    this.projectiles = [];

    this.npcProjectiles.forEach(p => {
      this.physicsWorld.removeBody(p.body);
      this.scene.remove(p.mesh);
    });
    this.npcProjectiles = [];

    // Reset Power-Ups
    if (this.powerUpManager) {
      this.powerUpManager.reset();
    }

    // Respawn Enemies
    this.spawnEnemies();

    // Re-lock cursor
    this.gameOverScreen.classList.add('hidden');
    document.body.requestPointerLock();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Update loop
  animate() {
    requestAnimationFrame(() => this.animate());

    this.timer.update();
    const deltaTime = this.timer.getDelta();

    // 1. Process Ammo regeneration
    const now = performance.now() / 1000;
    if (CONFIG.weapon.ammoRegenEnabled && this.ammo < this.maxAmmo && now - this.lastAmmoRegenTime > CONFIG.weapon.ammoRegenInterval) {
      this.ammo++;
      this.lastAmmoRegenTime = now;
      this.updateAmmoUI();
    }

    // 2. Physics stepping
    if (!this.isGameOver && this.isLocked) {
      this.physicsWorld.step(deltaTime);
      this.updatePlayerMovement(deltaTime);
    }

    // 3. Sync player mesh rig with player physics body position
    this.yawObject.position.copy(this.playerBody.position);

    // 4. Update Weapon recoil animations
    this.recoilOffset = THREE.MathUtils.lerp(this.recoilOffset, 0, CONFIG.weapon.recoilDecay * deltaTime);
    this.recoilRotation = THREE.MathUtils.lerp(this.recoilRotation, 0, CONFIG.weapon.recoilDecay * deltaTime);
    
    // Animate weapon positioning offset
    this.weaponGroup.position.z = this.recoilOffset;
    this.weaponGroup.rotation.x = this.recoilRotation;

    // 5. Update NPC engines
    if (!this.isGameOver && this.isLocked) {
      this.npcEngine.update(
        deltaTime,
        this.yawObject.position,
        (npc, direction) => this.onNpcShoot(npc, direction)
      );
    }

    // 5b. Update Power-up manager
    if (!this.isGameOver && this.isLocked && this.powerUpManager) {
      this.powerUpManager.update(deltaTime, this.yawObject.position);
    }

    // 6. Update player projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.physicsWorld.removeBody(p.body);
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }

    // 7. Update NPC projectiles
    for (let i = this.npcProjectiles.length - 1; i >= 0; i--) {
      const p = this.npcProjectiles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.physicsWorld.removeBody(p.body);
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.npcProjectiles.splice(i, 1);
      }
    }

    // 8. Update floating particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      
      // Decay velocity slowly
      p.velocity.multiplyScalar(0.96);
      p.velocity.y -= 0.7 * deltaTime; // drift gravity drop

      p.life -= deltaTime;
      if (p.mesh.material) {
        p.mesh.material.opacity = Math.max(0, p.life / 0.6);
      }

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    // Update drifting kitchen steam particles
    if (this.steamParticles) {
      const positions = this.steamParticles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        // Drift upwards
        positions[i] += 1.5 * deltaTime;
        // Wrap around height boundary
        if (positions[i] > 20) {
          positions[i] = -5;
        }
      }
      this.steamParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 9. Raycast check for target reticle color indicator
    if (this.isLocked && !this.isGameOver) {
      this.updateCrosshairReticle();
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  updatePlayerMovement(deltaTime) {
    // 1. Grounded status check
    const grounded = this.physicsWorld.checkGrounded(this.playerBody);
    
    if (grounded) {
      this.isGrounded = true;
      this.hasDoubleJumped = false;
      this.canDoubleJump = false;
      // Recharge fuel when grounded
      this.jetpackFuel = Math.min(this.maxJetpackFuel, this.jetpackFuel + CONFIG.player.jetpackRechargeRate * deltaTime);
    } else {
      // Transition from grounded to airborne (e.g., falling)
      if (this.isGrounded) {
        this.isGrounded = false;
        this.canDoubleJump = true;
      }
    }

    // 2. Calculate direction vector of player camera look yaw
    const yawAngle = this.yawObject.rotation.y;
    
    // Forward direction in horizontal plane (XZ)
    this._forward.set(0, 0, -1).applyAxisAngle(this._yAxis, yawAngle).normalize();
    this._right.set(1, 0, 0).applyAxisAngle(this._yAxis, yawAngle).normalize();

    const moveDirection = this._moveDirection.set(0, 0, 0);
    if (this.keys.w) moveDirection.add(this._forward);
    if (this.keys.s) moveDirection.sub(this._forward);
    if (this.keys.d) moveDirection.add(this._right);
    if (this.keys.a) moveDirection.sub(this._right);
    moveDirection.normalize();

    const isMoving = moveDirection.lengthSq() > 0;

    // 3. Movement speed & stamina dynamics
    let thrustStrength = 0;
    if (this.isGrounded) {
      if (isMoving) {
        if (this.keys.shift && this.stamina > 0) {
          // Running
          thrustStrength = CONFIG.player.runThrust;
          this.stamina = Math.max(0, this.stamina - CONFIG.player.staminaDrainRate * deltaTime);
        } else {
          // Walking
          thrustStrength = CONFIG.player.walkThrust;
          this.stamina = Math.min(this.maxStamina, this.stamina + CONFIG.player.staminaRechargeRate * deltaTime);
        }
        this.playerBody.linearDamping = 0.7; // Responsive movement damping
      } else {
        // Standing still -> recharge stamina
        this.stamina = Math.min(this.maxStamina, this.stamina + CONFIG.player.staminaRechargeRate * deltaTime);
        this.playerBody.linearDamping = 0.98; // High damping to prevent low-gravity sliding
      }
    } else {
      // Airborne air control
      thrustStrength = CONFIG.player.walkThrust * 0.3; // Scaled air control thrust
      this.stamina = Math.min(this.maxStamina, this.stamina + CONFIG.player.staminaRechargeRate * deltaTime);
      this.playerBody.linearDamping = 0.1; // Low damping for nice low-gravity floatiness
    }

    // Apply horizontal movement forces
    if (isMoving) {
      const thrust = new CANNON.Vec3(
        moveDirection.x * thrustStrength,
        0,
        moveDirection.z * thrustStrength
      );
      this.playerBody.applyForce(thrust, this.playerBody.position);
    }

    // 4. Jetpack boost logic
    if (!this.isGrounded && this.hasDoubleJumped && this.keys.space) {
      const heightGained = this.playerBody.position.y - this.jumpStartHeight;
      if (this.jetpackFuel > 0 && heightGained < CONFIG.player.maxBoostHeight) {
        // Apply upward jetpack thrust
        this.playerBody.applyForce(new CANNON.Vec3(0, CONFIG.player.jetpackThrust, 0), this.playerBody.position);
        this.jetpackFuel = Math.max(0, this.jetpackFuel - CONFIG.player.jetpackConsumptionRate * deltaTime);
      }
    }

    // 5. Soft ceiling repulsion — physically realistic boundary
    this.physicsWorld.applyHeightCap(this.playerBody, CONFIG.player.speedCeiling, CONFIG.physics.heightCapForce);

    // 7. Update HUD elements in real time
    if (this.jetpackBar && this.jetpackText) {
      this.jetpackBar.style.width = `${this.jetpackFuel}%`;
      this.jetpackText.innerText = Math.round(this.jetpackFuel);
    }
    if (this.staminaBar && this.staminaText) {
      this.staminaBar.style.width = `${this.stamina}%`;
      this.staminaText.innerText = Math.round(this.stamina);
    }
  }

  updateCrosshairReticle() {
    this.raycaster.setFromCamera(this.centerScreen, this.camera);
    
    // Retrieve all active enemy meshes
    this.activeEnemyMeshes.length = 0;
    const npcs = this.npcEngine.npcs;
    for (let i = 0; i < npcs.length; i++) {
      if (npcs[i].state !== 'DEAD') {
        this.activeEnemyMeshes.push(npcs[i].mesh);
      }
    }

    // Deep checks inside groups
    const intersects = this.raycaster.intersectObjects(this.activeEnemyMeshes, true);

    if (intersects.length > 0) {
      // Enemy hovered, color red/orange
      this.crosshairRing.style.borderColor = 'var(--neon-orange)';
      this.crosshairRing.style.boxShadow = '0 0 8px var(--neon-orange)';
    } else {
      // Clear reticle
      this.crosshairRing.style.borderColor = 'rgba(255, 255, 255, 0.35)';
      this.crosshairRing.style.boxShadow = 'none';
    }
  }
}

// Instantiate the game when the page finishes loading
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
