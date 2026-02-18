import { Repeat } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

describe('Repeat', () => {
  it('constructor provides different instances', () => {
    expect(Repeat('wtf')).not.toBe(Repeat('wtf'));
    // Value equality is not computable for infinite Seq
    expect(Repeat('wtf', 2)).not.toBe(Repeat('wtf', 2));
    expect(Repeat('wtf', 2)).toEqual(Repeat('wtf', 2));
  });

  it('fixed repeat', () => {
    const v = Repeat('wtf', 3);
    expect(v.size).toBe(3);
    expect(v.first()).toBe('wtf');
    expect(v.rest().toArray()).toEqual(['wtf', 'wtf']);
    expect(v.last()).toBe('wtf');
    expect(v.butLast().toArray()).toEqual(['wtf', 'wtf']);
    expect(v.toArray()).toEqual(['wtf', 'wtf', 'wtf']);
    expect(v.join()).toEqual('wtf,wtf,wtf');
  });

  it('does not claim to be equal to undefined', () => {
    expect(Repeat(1).equals(undefined)).toEqual(false);
  });

  describe('property-based tests', () => {
    it('every index returns the value', () => {
      fc.assert(
        fc.property(
          fc.integer(),
          fc.integer({ min: 1, max: 100 }),
          (val, n) => {
            const r = Repeat(val, n);
            for (let i = 0; i < n; i++) {
              expect(r.get(i)).toBe(val);
            }
          }
        )
      );
    });

    it('size is correct', () => {
      fc.assert(
        fc.property(
          fc.integer(),
          fc.integer({ min: 0, max: 1000 }),
          (val, n) => {
            expect(Repeat(val, n).size).toBe(n);
          }
        )
      );
    });

    it('toArray length matches', () => {
      fc.assert(
        fc.property(
          fc.integer(),
          fc.integer({ min: 0, max: 200 }),
          (val, n) => {
            expect(Repeat(val, n).toArray().length).toBe(n);
          }
        )
      );
    });

    it('includes the repeated value', () => {
      fc.assert(
        fc.property(
          fc.integer(),
          fc.integer({ min: 1, max: 100 }),
          (val, n) => {
            expect(Repeat(val, n).includes(val)).toBe(true);
          }
        )
      );
    });

    it('slice works like array slice', () => {
      fc.assert(
        fc.property(
          fc.integer(),
          fc.integer({ min: 0, max: 50 }),
          fc.nat(50),
          (val, n, take) => {
            const arr = new Array(n).fill(val);
            expect(Repeat(val, n).slice(0, take).toArray()).toEqual(
              arr.slice(0, take)
            );
          }
        )
      );
    });
  });
});
