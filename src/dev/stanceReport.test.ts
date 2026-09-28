import { describe, expect, it } from 'vitest';
import type { StanceAngles } from '../scene/rig/stanceGauge';
import type { MappedStance } from '../scene/rig/stanceMap';
import { compareStance, stanceSection, type StanceReading } from './stanceReport';

const stance: MappedStance = {
  id: 'test',
  name: 'Test stance',
  reach: 'A made-up stance for the report test.',
  sides: 'both',
  targets: {
    kneeFront: { min: 90, max: 110, sources: ['desousa2022'], confidence: 'medium' },
    weight: { min: 0.6, max: 0.75, sources: ['cornishwave'], confidence: 'medium' },
  },
  gaps: 'The arms.',
};

const angles = (kneeFront: number, weight: number) => ({ kneeFront, weight }) as StanceAngles;

describe('the stance report', () => {
  it('marks a measure whose mean falls outside its range, by how far, and one inside as met', () => {
    const readings: StanceReading[] = [
      { surfer: 'surfer1', stance: 'regular', reached: true, angles: angles(128, 0.62) },
      { surfer: 'surfer2', stance: 'regular', reached: true, angles: angles(132, 0.66) },
      { surfer: 'surfer1', stance: 'goofy', reached: true, angles: angles(130, 0.64) },
    ];
    const { rows } = compareStance(stance, readings);
    const knee = rows.find((row) => row.measure === 'kneeFront')!;
    expect(knee.status).toBe('out');
    expect(knee.miss).toBeCloseTo(20, 6);
    expect(knee.regular.mean).toBeCloseTo(130, 6);
    expect(rows.find((row) => row.measure === 'weight')!.status).toBe('in');
  });

  it('leaves a stance no surfer reached unmeasured, and says so', () => {
    const readings: StanceReading[] = [
      { surfer: 'surfer1', stance: 'regular', reached: false },
      { surfer: 'surfer1', stance: 'goofy', reached: false },
    ];
    const comparison = compareStance(stance, readings);
    expect(comparison.reached).toBe(0);
    expect(comparison.rows.every((row) => row.status === 'unmeasured')).toBe(true);
    expect(stanceSection(stance, comparison)).toMatch(/not reached/i);
  });

  it('writes each target with its sources, confidence and today’s value', () => {
    const section = stanceSection(stance, compareStance(stance, [{ surfer: 'surfer1', stance: 'regular', reached: true, angles: angles(100, 0.8) }]));
    expect(section).toContain('Test stance');
    expect(section).toContain('90–110°');
    expect(section).toContain('de Sousa 2022');
    expect(section).toContain('medium');
    expect(section).toContain('The arms.');
  });
});
