import { describe, expect, it } from 'vitest';
import { inheritedAge } from './breakingAge';

// A 3 × 3 patch: the cell at its centre, its front face rising toward −z (the wave runs +z), so the parents lie at
// iz − 1: the one behind it and its two diagonals.
function patch(ages: Record<string, number>): { strength: Float64Array; age: Float64Array } {
  const strength = new Float64Array(9);
  const age = new Float64Array(9);
  for (const [key, value] of Object.entries(ages)) {
    const [ix, iz] = key.split(',').map(Number);
    strength[iz * 3 + ix] = 1;
    age[iz * 3 + ix] = value;
  }
  return { strength, age };
}

describe('the breaking age behind the face (rule A) and the diagonal join (canyon-wave-r2)', () => {
  it('takes the age from the cell behind the face and, by default, its two diagonals, never the cells beside it', () => {
    const { strength, age } = patch({ '1,0': 1, '0,0': 3, '2,1': 9 });
    expect(inheritedAge(4, 1, 1, 3, 3, 0, -0.1, strength, age)).toBe(3);
  });

  it('passes no age through the diagonals when they are shut (the Canyon, where its cell rises below diagonalJoin √(g h))', () => {
    const { strength, age } = patch({ '1,0': 1, '0,0': 3, '2,0': 5 });
    expect(inheritedAge(4, 1, 1, 3, 3, 0, -0.1, strength, age, false)).toBe(1);
    expect(inheritedAge(4, 1, 1, 3, 3, 0, -0.1, strength, age, true)).toBe(5);
    // Along x the same: the parents at ix − 1, its diagonals the rows either side.
    const along = patch({ '0,1': 2, '0,0': 4, '0,2': 6 });
    expect(inheritedAge(4, 1, 1, 3, 3, -0.1, 0, along.strength, along.age, false)).toBe(2);
    expect(inheritedAge(4, 1, 1, 3, 3, -0.1, 0, along.strength, along.age)).toBe(6);
  });
});
