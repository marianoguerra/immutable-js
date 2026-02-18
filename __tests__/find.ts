import { Seq } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

describe('find', () => {
  it('find returns notSetValue when match is not found', () => {
    expect(Seq([1, 2, 3, 4, 5, 6]).find(() => false, null, 9)).toEqual(9);
  });

  it('findEntry returns notSetValue when match is not found', () => {
    expect(
      Seq([1, 2, 3, 4, 5, 6]).findEntry(
        () => false,

        null,
        9
      )
    ).toEqual(9);
  });

  it('findLastEntry returns notSetValue when match is not found', () => {
    expect(Seq([1, 2, 3, 4, 5, 6]).findLastEntry(() => false, null, 9)).toEqual(
      9
    );
  });

  describe('property-based tests', () => {
    it('find matches Array.find', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 100 }), (arr) => {
          const pred = (x: number) => x > 0;
          expect(Seq(arr).find(pred)).toBe(arr.find(pred));
        })
      );
    });

    it('findLast matches reversed Array.find', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 100 }), (arr) => {
          const pred = (x: number) => x > 0;
          expect(Seq(arr).findLast(pred)).toBe([...arr].reverse().find(pred));
        })
      );
    });

    it('findIndex matches Array.findIndex', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 100 }), (arr) => {
          const pred = (x: number) => x > 0;
          expect(Seq(arr).findIndex(pred)).toBe(arr.findIndex(pred));
        })
      );
    });

    it('findKey returns correct index or undefined', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 100 }), (arr) => {
          const pred = (x: number) => x > 0;
          const result = Seq(arr).findKey(pred);
          const idx = arr.findIndex(pred);
          expect(result).toBe(idx === -1 ? undefined : idx);
        })
      );
    });
  });
});
