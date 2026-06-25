import * as THREE from 'three';

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

const game = new MockGame();
const iterations = 1000000;

console.log('Running benchmark...');

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
console.log(`Original: ${(end - start).toFixed(2)} ms`);

start = performance.now();
for (let i = 0; i < iterations; i++) {
  game.optimizedUpdate();
}
end = performance.now();
console.log(`Optimized: ${(end - start).toFixed(2)} ms`);
