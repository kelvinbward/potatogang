import * as THREE from 'three';
import { performance } from 'perf_hooks';

// --- Benchmark 1: GC Vector Optimizations ---
class MockGame {
  constructor() {
    this.keys = { w: true, a: false, s: false, d: true };
    this.yawObject = { rotation: { y: 1.5 } };

    this._moveDirection = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._yAxis = new THREE.Vector3(0, 1, 0);
  }

  originalUpdate() {
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

    return moveDirection;
  }

  optimizedUpdate() {
    const yawAngle = this.yawObject.rotation.y;

    this._forward.set(0, 0, -1).applyAxisAngle(this._yAxis, yawAngle).normalize();
    this._right.set(1, 0, 0).applyAxisAngle(this._yAxis, yawAngle).normalize();

    const moveDirection = this._moveDirection.set(0, 0, 0);
    if (this.keys.w) moveDirection.add(this._forward);
    if (this.keys.s) moveDirection.sub(this._forward);
    if (this.keys.d) moveDirection.add(this._right);
    if (this.keys.a) moveDirection.sub(this._right);
    moveDirection.normalize();

    return moveDirection;
  }
}

// --- Benchmark 2: Array Removal ---
const NPC_STATES = { DEAD: 0, ALIVE: 1 };
class MockNpc {
  constructor(state) {
    this.state = state;
  }
  update() {}
}

function runBenchmark(useSplice, numNpcs, numDead) {
  const npcs = [];
  for (let i = 0; i < numNpcs; i++) {
    npcs.push(new MockNpc(i < numDead ? NPC_STATES.DEAD : NPC_STATES.ALIVE));
  }

  // Scramble so dead are distributed
  for (let i = npcs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [npcs[i], npcs[j]] = [npcs[j], npcs[i]];
  }

  const start = performance.now();

  for (let i = npcs.length - 1; i >= 0; i--) {
    const npc = npcs[i];
    if (npc.state === NPC_STATES.DEAD) {
      if (useSplice) {
        npcs.splice(i, 1);
      } else {
        const last = npcs.pop();
        if (i < npcs.length) {
          npcs[i] = last;
        }
      }
      continue;
    }
    npc.update();
  }

  const end = performance.now();
  return end - start;
}

// --- Run Benchmarks ---
console.log('--- Benchmarking GC Vector Optimization ---');
const game = new MockGame();
const iterations = 1000000;

// Warmup
for (let i = 0; i < 1000; i++) {
  game.originalUpdate();
  game.optimizedUpdate();
}

let start = performance.now();
for (let i = 0; i < iterations; i++) {
  game.originalUpdate();
}
let end = performance.now();
console.log(`Original Vector Instantiation: ${(end - start).toFixed(2)} ms`);

start = performance.now();
for (let i = 0; i < iterations; i++) {
  game.optimizedUpdate();
}
end = performance.now();
console.log(`Optimized Vector Pre-Allocation: ${(end - start).toFixed(2)} ms`);

console.log('\n--- Benchmarking Array Removal ---');
const numTrials = 100;
let spliceTime = 0;
let swapTime = 0;

for (let i = 0; i < numTrials; i++) {
  spliceTime += runBenchmark(true, 50000, 10000);
  swapTime += runBenchmark(false, 50000, 10000);
}

console.log(`Splice method: ${spliceTime.toFixed(2)}ms`);
console.log(`Swap/Pop method: ${swapTime.toFixed(2)}ms`);
