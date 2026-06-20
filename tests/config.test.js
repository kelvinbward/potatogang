import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';

describe('Config Invariants', () => {
  it('should have gravity invariant set to exactly 9.8', () => {
    expect(CONFIG.physics.gravity).toBe(9.8);
  });

  it('should contain all required player kinetics variables', () => {
    expect(CONFIG.player).toBeDefined();
    expect(CONFIG.player.walkThrust).toBe(550);
    expect(CONFIG.player.runThrust).toBe(1100);
    expect(CONFIG.player.jumpImpulse).toBe(250);
    expect(CONFIG.player.jetpackThrust).toBe(800);
    expect(CONFIG.player.jetpackFuelCapacity).toBe(100);
    expect(CONFIG.player.jetpackConsumptionRate).toBe(60);
    expect(CONFIG.player.jetpackRechargeRate).toBe(120);
    expect(CONFIG.player.staminaCapacity).toBe(100);
    expect(CONFIG.player.staminaDrainRate).toBe(35);
    expect(CONFIG.player.staminaRechargeRate).toBe(20);
    expect(CONFIG.player.maxBoostHeight).toBe(8);
  });

  it('should have a world.GROUND_Y constant', () => {
    expect(CONFIG.world).toBeDefined();
    expect(CONFIG.world.GROUND_Y).toBe(-5);
  });

  it('should have a player collision radius', () => {
    expect(CONFIG.player.collisionRadius).toBe(0.85);
  });

  it('should have a configurable NPC projectile Y bias', () => {
    expect(CONFIG.npc.projectileYBias).toBeDefined();
    expect(typeof CONFIG.npc.projectileYBias).toBe('number');
    expect(CONFIG.npc.projectileYBias).toBe(0.08);
  });

  it('should have a soft height cap force constant', () => {
    expect(CONFIG.physics.heightCapForce).toBeDefined();
    expect(CONFIG.physics.heightCapForce).toBeGreaterThan(0);
  });
});
