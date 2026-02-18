import { Range, Seq } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

describe('interpose', () => {
  it('separates with a value', () => {
    const range = Range(10, 15);
    const interposed = range.interpose(0);
    expect(interposed.toArray()).toEqual([10, 0, 11, 0, 12, 0, 13, 0, 14]);
  });

  it('can be iterated', () => {
    const range = Range(10, 15);
    const interposed = range.interpose(0);
    const values = interposed.values();
    expect(values.next()).toEqual({ value: 10, done: false });
    expect(values.next()).toEqual({ value: 0, done: false });
    expect(values.next()).toEqual({ value: 11, done: false });
    expect(values.next()).toEqual({ value: 0, done: false });
    expect(values.next()).toEqual({ value: 12, done: false });
    expect(values.next()).toEqual({ value: 0, done: false });
    expect(values.next()).toEqual({ value: 13, done: false });
    expect(values.next()).toEqual({ value: 0, done: false });
    expect(values.next()).toEqual({ value: 14, done: false });
    expect(values.next()).toEqual({ value: undefined, done: true });
  });

  describe('property-based tests', () => {
    it('interpose size is max(0, arr.length * 2 - 1)', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { maxLength: 100 }),
          fc.integer(),
          (arr, sep) => {
            const interposed = Seq(arr).interpose(sep);
            const expected = Math.max(0, arr.length * 2 - 1);
            expect(interposed.size).toBe(expected);
          }
        )
      );
    });

    it('interpose structure: even indices original, odd indices separator', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 1, maxLength: 50 }),
          fc.integer(),
          (arr, sep) => {
            const result = Seq(arr).interpose(sep).toArray();
            for (let i = 0; i < result.length; i++) {
              if (i % 2 === 0) {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(result[i]).toBe(arr[i / 2]);
              } else {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(result[i]).toBe(sep);
              }
            }
          }
        )
      );
    });
  });
});
