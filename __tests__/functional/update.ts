import { get, set, update } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

describe('update', () => {
  it('for immutable structure', () => {
    const originalArray = ['dog', 'frog', 'cat'];
    expect(update(originalArray, 1, (val) => val?.toUpperCase())).toEqual([
      'dog',
      'FROG',
      'cat',
    ]);
    expect(originalArray).toEqual(['dog', 'frog', 'cat']);

    const originalObject = { x: 123, y: 456 };
    expect(update(originalObject, 'x', (val) => val * 6)).toEqual({
      x: 738,
      y: 456,
    });
    expect(originalObject).toEqual({ x: 123, y: 456 });
  });

  it('for Array', () => {
    const originalArray = ['dog', 'frog', 'cat'];
    expect(update(originalArray, 1, (val) => val?.toUpperCase())).toEqual([
      'dog',
      'FROG',
      'cat',
    ]);
    expect(originalArray).toEqual(['dog', 'frog', 'cat']);
  });

  it('for plain objects', () => {
    const originalObject = { x: 123, y: 456 };
    expect(update(originalObject, 'x', (val) => val * 6)).toEqual({
      x: 738,
      y: 456,
    });
    expect(originalObject).toEqual({ x: 123, y: 456 });
  });

  describe('property-based tests', () => {
    it('functional update equals set(obj, k, f(get(obj, k)))', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 1, maxLength: 50 }),
          (arr) => {
            const idx = Math.floor(Math.random() * arr.length);
            const f = (v: number | undefined) => (v ?? 0) + 1;
            const updated = update(arr, idx, f);
            const expected = set(arr, idx, f(get(arr, idx)));
            expect(updated).toEqual(expected);
          }
        )
      );
    });
  });
});
