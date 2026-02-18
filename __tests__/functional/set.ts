import { get, set } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

describe('set', () => {
  it('for immutable structure', () => {
    const originalArray = ['dog', 'frog', 'cat'];
    expect(set(originalArray, 1, 'cow')).toEqual(['dog', 'cow', 'cat']);
    expect(set(originalArray, 4, 'cow')).toEqual([
      'dog',
      'frog',
      'cat',
      undefined,
      'cow',
    ]);
    expect(originalArray).toEqual(['dog', 'frog', 'cat']);

    const originalObject = { x: 123, y: 456 };
    expect(set(originalObject, 'x', 789)).toEqual({ x: 789, y: 456 });
    expect(set(originalObject, 'z', 789)).toEqual({ x: 123, y: 456, z: 789 });
    expect(originalObject).toEqual({ x: 123, y: 456 });
  });

  it('for Array', () => {
    const originalArray = ['dog', 'frog', 'cat'];
    expect(set(originalArray, 1, 'cow')).toEqual(['dog', 'cow', 'cat']);
    expect(set(originalArray, 4, 'cow')).toEqual([
      'dog',
      'frog',
      'cat',
      undefined,
      'cow',
    ]);
    expect(originalArray).toEqual(['dog', 'frog', 'cat']);
  });

  it('for plain objects', () => {
    const originalObject = { x: 123, y: 456 };
    expect(set(originalObject, 'x', 789)).toEqual({ x: 789, y: 456 });
    expect(set(originalObject, 'z', 789)).toEqual({ x: 123, y: 456, z: 789 });
    expect(originalObject).toEqual({ x: 123, y: 456 });
  });

  describe('property-based tests', () => {
    it('functional set does not mutate original array', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 1, maxLength: 50 }),
          fc.integer(),
          (arr, val) => {
            const original = [...arr];
            const idx = Math.floor(Math.random() * arr.length);
            set(arr, idx, val);
            expect(arr).toEqual(original);
          }
        )
      );
    });

    it('functional set roundtrip with get', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 1, maxLength: 50 }),
          fc.integer(),
          (arr, val) => {
            const idx = Math.floor(Math.random() * arr.length);
            const updated = set(arr, idx, val);
            expect(get(updated, idx)).toBe(val);
          }
        )
      );
    });
  });
});
