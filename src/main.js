import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { NpcEngine } from './npc/NpcEngine.js';
import { CONFIG } from './config.js';
import { GUI } from 'lil-gui';

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
    this.ammo = CONFIG.weapon.maxAmmo;
    this.maxAmmo = CONFIG.weapon.maxAmmo;
    this.lastAmmoRegenTime = 0;
    this.isGameOver = false;

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

    // Timing
    this.clock = new THREE.Clock();

    // DOM References
    this.blocker = document.getElementById('blocker');
    this.instructions = document.getElementById('instructions');
    this.hud = document.getElementById('hud');
    this.gameOverScreen = document.getElementById('game-over');
    this.healthBar = document.getElementById('health-bar');
    this.healthText = document.getElementById('health-text');
    this.scoreText = document.getElementById('score');
    this.killsText = document.getElementById('kills');
    this.finalScoreText = document.getElementById('final-score');
    this.finalKillsText = document.getElementById('final-kills');
    this.restartBtn = document.getElementById('restart-btn');
    this.crosshairRing = document.querySelector('.crosshair-ring');

    // Register global instance for NPCs to hook into
    window.gameInstance = this;

    this.init();
  }

  init() {
    // 1. Setup Three.js Scene, Camera, and Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070a);
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.015);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    // 2. Setup Lighting
    const ambientLight = new THREE.AmbientLight(0x111b24, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff0dd, 0.8);
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

    // Cyberpunk Grid floor
    const gridHelper = new THREE.GridHelper(100, 50, 0x00e5ff, 0x112233);
    gridHelper.position.y = -5;
    this.scene.add(gridHelper);

    // 3. Setup Physics World
    this.physicsWorld = new PhysicsWorld();

    // 4. Create Player Physics Body
    // Positioned at (0, 2, 0)
    this.playerBody = this.physicsWorld.createPlayerBody({ x: 0, y: 2, z: 0 }, 0.85);

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

    // 8. Generate Floating Supermarket/Kitchen Obstacles
    this.generateEnvironment();

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

  generateEnvironment() {
    // Floor physics box to stop falling completely
    this.physicsWorld.createStaticBox({ x: 0, y: -5.5, z: 0 }, { x: 120, y: 1, z: 120 });

    // Generate floating counters and giant pantry shelves
    const shelfMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.2
    });

    const boxMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // orange/brown giant cereal box
      roughness: 0.8
    });

    const sodaMaterial = new THREE.MeshStandardMaterial({
      color: 0x0369a1, // blue soda can
      roughness: 0.3,
      metalness: 0.8
    });

    // Preset positions for floating objects
    const structures = [
      // Floor counter left
      { pos: { x: -12, y: -3.5, z: -10 }, size: { x: 10, y: 3, z: 20 } },
      // Floor counter right
      { pos: { x: 12, y: -3.5, z: 10 }, size: { x: 10, y: 3, z: 20 } },
      
      // Floating shelf center high
      { pos: { x: 0, y: 4, z: -18 }, size: { x: 22, y: 0.6, z: 6 } },
      // Floating shelf left medium
      { pos: { x: -18, y: 1, z: 4 }, size: { x: 6, y: 0.6, z: 22 } },
      // Floating shelf right medium
      { pos: { x: 18, y: 1, z: -4 }, size: { x: 6, y: 0.6, z: 22 } },

      // Giant floating cereal boxes
      { pos: { x: -8, y: 7, z: -16 }, size: { x: 2.2, y: 3.5, z: 1.2 }, type: 'cereal' },
      { pos: { x: 8, y: 8, z: -19 }, size: { x: 2.2, y: 3.5, z: 1.2 }, type: 'cereal' },
      
      // Giant floating Soda Cans (represented as boxes here for simpler collider, cylinders visually)
      { pos: { x: -18, y: 4, z: 6 }, size: { x: 1.8, y: 3.0, z: 1.8 }, type: 'soda' },
      { pos: { x: 18, y: 4, z: -6 }, size: { x: 1.8, y: 3.0, z: 1.8 }, type: 'soda' }
    ];

    structures.forEach(item => {
      // 1. Create Physics Body
      this.physicsWorld.createStaticBox(item.pos, item.size);

      // 2. Create Three.js Visual Mesh
      let mesh;
      if (item.type === 'cereal') {
        const geo = new THREE.BoxGeometry(item.size.x, item.size.y, item.size.z);
        mesh = new THREE.Mesh(geo, boxMaterial);
        
        // Add a yellow tag/label to the cereal box
        const labelGeo = new THREE.BoxGeometry(item.size.x + 0.02, 1.2, item.size.z + 0.02);
        const labelMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.y = 0.4;
        mesh.add(label);
      } else if (item.type === 'soda') {
        // Render cylinder for soda cans
        const geo = new THREE.CylinderGeometry(item.size.x / 2, item.size.x / 2, item.size.y, 10);
        mesh = new THREE.Mesh(geo, sodaMaterial);
      } else {
        // Standard grey metallic shelves/counters
        const geo = new THREE.BoxGeometry(item.size.x, item.size.y, item.size.z);
        mesh = new THREE.Mesh(geo, shelfMaterial);
      }

      mesh.position.copy(item.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });
  }

  spawnEnemies() {
    this.npcEngine.clearAll();
    if (!CONFIG.npc.spawnEnabled) return;

    // Spawn Broccoli Boys (Green Faction)
    const broccoliSpawns = [
      { x: -10, y: 3, z: -10 },
      { x: 10, y: 3, z: 10 },
      { x: -18, y: 6, z: 8 },
      { x: 18, y: 6, z: -8 }
    ];

    // Spawn Carrot Cartel (Orange Faction)
    const carrotSpawns = [
      { x: 0, y: 6, z: -18 },
      { x: -12, y: 1, z: 12 },
      { x: 12, y: 1, z: -12 }
    ];

    broccoliSpawns.forEach(pos => {
      this.npcEngine.spawnBroccoli(pos);
    });

    carrotSpawns.forEach(pos => {
      this.npcEngine.spawnCarrot(pos);
    });
  }

  setupControls() {
    // Click blocker to request pointer lock
    this.blocker.addEventListener('click', () => {
      this.blocker.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === this.blocker) {
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
          this.keys.space = true; break;
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
    playerFolder.add(CONFIG.player, 'thrustStrength', 100, 1500, 50).name('Horizontal Thrust');
    playerFolder.add(CONFIG.player, 'upThrustStrength', 100, 2000, 50).name('Upward Thrust');
    playerFolder.add(CONFIG.player, 'downThrustStrength', 100, 1500, 50).name('Downward Thrust');
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
  }

  fireProjectile() {
    if (this.ammo <= 0 && !CONFIG.player.infiniteAmmo) return;

    if (!CONFIG.player.infiniteAmmo) {
      this.ammo--;
      this.updateAmmoUI();
    }

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
          document.getElementById('hud-message').innerText = "GRAVITY SHIELD: 0.1G";
        }, 3000);
      }, 1500);
    }
  }

  updateHUD() {
    this.healthBar.style.width = `${this.health}%`;
    this.healthText.innerText = Math.round(this.health);
    this.scoreText.innerText = String(this.score).padStart(5, '0');
    this.killsText.innerText = this.kills;
  }

  updateAmmoUI() {
    const container = document.getElementById('ammo-dots');
    container.innerHTML = '';
    for (let i = 0; i < this.maxAmmo; i++) {
      const dot = document.createElement('div');
      dot.className = 'ammo-dot' + (i >= this.ammo ? ' spent' : '');
      container.appendChild(dot);
    }
    document.getElementById('ammo-text').innerText = `${this.ammo} / ${this.maxAmmo}`;
  }

  triggerGameOver() {
    this.isGameOver = true;
    document.exitPointerLock();

    this.finalScoreText.innerText = this.score;
    this.finalKillsText.innerText = this.kills;

    this.gameOverScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
  }

  resetGame() {
    this.health = 100;
    this.score = 0;
    this.kills = 0;
    this.ammo = 10;
    this.isGameOver = false;

    this.updateHUD();
    this.updateAmmoUI();

    // Reposition player physical body and clear velocity
    this.playerBody.position.set(0, 2, 0);
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

    // Respawn Enemies
    this.spawnEnemies();

    // Re-lock cursor
    this.gameOverScreen.classList.add('hidden');
    this.blocker.requestPointerLock();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Update loop
  animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    // 1. Process Ammo regeneration
    const now = performance.now() / 1000;
    if (this.ammo < this.maxAmmo && now - this.lastAmmoRegenTime > CONFIG.weapon.ammoRegenInterval) {
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

    // 9. Raycast check for target reticle color indicator
    if (this.isLocked && !this.isGameOver) {
      this.updateCrosshairReticle();
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  updatePlayerMovement(deltaTime) {
    // 1. Calculate direction vector of player camera look yaw
    const yawAngle = this.yawObject.rotation.y;
    
    // Forward direction in horizontal plane (XZ)
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle).normalize();

    const moveDirection = new THREE.Vector3();
    if (this.keys.w) moveDirection.add(forward);
    if (this.keys.s) moveDirection.sub(forward);
    if (this.keys.d) moveDirection.add(right);
    if (this.keys.a) moveDirection.sub(right);
    moveDirection.normalize();

    // Apply drift velocity push in low gravity
    const thrustStrength = CONFIG.player.thrustStrength;
    if (moveDirection.lengthSq() > 0) {
       const thrust = new CANNON.Vec3(
        moveDirection.x * thrustStrength,
        0,
        moveDirection.z * thrustStrength
      );
      this.playerBody.applyForce(thrust, this.playerBody.position);
    }

    // Vertical thrusters (Space = up, Shift = down)
    if (this.keys.space) {
      this.playerBody.applyForce(new CANNON.Vec3(0, CONFIG.player.upThrustStrength, 0), this.playerBody.position);
    }
    if (this.keys.shift) {
      this.playerBody.applyForce(new CANNON.Vec3(0, -CONFIG.player.downThrustStrength, 0), this.playerBody.position);
    }

    // Bound ceiling to prevent escaping the map
    if (this.playerBody.position.y > CONFIG.player.speedCeiling) {
      this.playerBody.position.y = CONFIG.player.speedCeiling;
      this.playerBody.velocity.y = 0;
    }
  }

  updateCrosshairReticle() {
    this.raycaster.setFromCamera(this.centerScreen, this.camera);
    
    // Retrieve all active enemy meshes
    const enemyVisuals = this.npcEngine.npcs
      .filter(npc => npc.state !== 'DEAD')
      .map(npc => npc.mesh);

    // Deep checks inside groups
    const intersects = this.raycaster.intersectObjects(enemyVisuals, true);

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
