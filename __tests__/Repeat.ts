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

  it('equals on two infinite Repeats with the same value should not hang', () => {
    // Repeat(value) with no count creates an infinite sequence.
    // The equals() fast path should detect both are Repeat instances and
    // compare values with is() in O(1). Bug: line 89 of Repeat.js uses
    // `other instanceof Repeat` but Repeat is the factory function (arrow
    // function with no prototype), not the RepeatImpl class, so the
    // instanceof check always returns false. This causes equals() to fall
    // through to deepEqual(), which tries to iterate the infinite sequence
    // and never terminates.
    const a = Repeat('x');
    const b = Repeat('x');
    expect(a.equals(b)).toBe(true);
  });

  it('equals on two finite Repeats takes the fast path via instanceof', () => {
    // Even for finite Repeats, the fast path should be used. We can verify
    // this indirectly: two Repeats with the same value but different sizes
    // should not be equal. With the bug, deepEqual still handles this
    // correctly, but this test documents the expected behavior alongside
    // the infinite case above.
    const a = Repeat('x', 3);
    const b = Repeat('x', 3);
    const c = Repeat('x', 5);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
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
