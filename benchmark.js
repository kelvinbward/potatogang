import { performance } from 'perf_hooks';

// Mock NPC
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

const numTrials = 100;
let spliceTime = 0;
let swapTime = 0;

for (let i = 0; i < numTrials; i++) {
  spliceTime += runBenchmark(true, 50000, 10000);
  swapTime += runBenchmark(false, 50000, 10000);
}

console.log(`Splice method: ${spliceTime.toFixed(2)}ms`);
console.log(`Swap method: ${swapTime.toFixed(2)}ms`);
