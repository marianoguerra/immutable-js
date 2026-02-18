import { get, Map, List, Range } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import invariant from '../../src/utils/invariant';

describe('get', () => {
  it('for immutable structure', () => {
    expect(get(Range(0, 100), 20)).toBe(20);
    expect(get(List(['dog', 'frog', 'cat']), 1)).toBe('frog');
    expect(get(List(['dog', 'frog', 'cat']), 20)).toBeUndefined();
    expect(get(List(['dog', 'frog', 'cat']), 20, 'ifNotSet')).toBe('ifNotSet');

    expect(get(Map({ x: 123, y: 456 }), 'x')).toBe(123);
  });

  it('for Array', () => {
    expect(get(['dog', 'frog', 'cat'], 1)).toBe('frog');
    expect(get(['dog', 'frog', 'cat'], 20)).toBeUndefined();
    expect(get(['dog', 'frog', 'cat'], 20, 'ifNotSet')).toBe('ifNotSet');
  });

  it('for plain objects', () => {
    expect(get({ x: 123, y: 456 }, 'x')).toBe(123);
    expect(get({ x: 123, y: 456 }, 'z', 'ifNotSet')).toBe('ifNotSet');

    expect(
      get(
        {
          x: 'xx',
          y: 'yy',
          get: function (this, key: string) {
            invariant(typeof this[key] === 'string', 'this[key] is a string');

            return this[key].toUpperCase();
          },
        },
        'x'
      )
    ).toBe('XX');
  });

  describe('property-based tests', () => {
    it('functional get matches method get for List', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { maxLength: 50 }),
          fc.nat(60),
          (arr, idx) => {
            const list = List(arr);
            expect(get(list, idx)).toBe(list.get(idx));
          }
        )
      );
    });

    it('functional get on plain objects returns correct value', () => {
      fc.assert(
        fc.property(
          fc.dictionary(fc.string({ maxLength: 5 }), fc.integer()),
          (obj) => {
            for (const key of Object.keys(obj)) {
              expect(get(obj, key)).toBe(obj[key]);
            }
          }
        )
      );
    });
  });
});
