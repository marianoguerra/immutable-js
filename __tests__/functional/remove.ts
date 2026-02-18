import { List, Map, remove } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

describe('remove', () => {
  it('for immutable structure', () => {
    expect(remove(List(['dog', 'frog', 'cat']), 1)).toEqual(
      List(['dog', 'cat'])
    );
    expect(remove(Map({ x: 123, y: 456 }), 'x')).toEqual(Map({ y: 456 }));
  });

  it('for Array', () => {
    expect(remove(['dog', 'frog', 'cat'], 1)).toEqual(['dog', 'cat']);
  });

  it('for plain objects', () => {
    expect(remove({ x: 123, y: 456 }, 'x')).toEqual({ y: 456 });
  });

  describe('property-based tests', () => {
    it('functional remove on arrays matches splice', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 1, maxLength: 50 }),
          (arr) => {
            const idx = Math.floor(Math.random() * arr.length);
            const expected = [...arr];
            expected.splice(idx, 1);
            expect(remove(arr, idx)).toEqual(expected);
          }
        )
      );
    });
  });
});
