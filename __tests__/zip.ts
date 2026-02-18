import { List, Range, Seq } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import { expectToBeDefined } from './ts-utils';

describe('zip', () => {
  it('zips lists into a list of tuples', () => {
    expect(
      Seq([1, 2, 3])
        .zip(Seq([4, 5, 6]))
        .toArray()
    ).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });

  it('zip results can be converted to JS', () => {
    const l1 = List([List([1]), List([2]), List([3])]);
    const l2 = List([List([4]), List([5]), List([6])]);
    const zipped = l1.zip(l2);
    expect(zipped).toEqual(
      List([
        [List([1]), List([4])],
        [List([2]), List([5])],
        [List([3]), List([6])],
      ])
    );
    expect(zipped.toJS()).toEqual([
      [[1], [4]],
      [[2], [5]],
      [[3], [6]],
    ]);
  });

  it('zips with infinite lists', () => {
    expect(
      Range(0, Infinity)
        .zip(Seq(['A', 'B', 'C']))
        .toArray()
    ).toEqual([
      [0, 'A'],
      [1, 'B'],
      [2, 'C'],
    ]);
  });

  it('has unknown size when zipped with unknown size', () => {
    const seq = Range(0, 10);
    const zipped = seq.zip(seq.filter((n) => n % 2 === 0));
    expect(zipped.size).toBe(undefined);
    expect(zipped.count()).toBe(5);
  });

  it('is always the size of the smaller sequence', () => {
    fc.assert(
      fc.property(fc.array(fc.nat(), { minLength: 1 }), (lengths) => {
        const ranges = lengths.map((l) => Range(0, l));
        const first = ranges.shift();
        expectToBeDefined(first);
        const zipped = first.zip.apply(first, ranges);
        const shortestLength = Math.min.apply(Math, lengths);
        expect(zipped.size).toBe(shortestLength);
      })
    );
  });

  describe('zipWith', () => {
    it('zips with a custom function', () => {
      expect(
        Seq([1, 2, 3])
          .zipWith<number, number>((a, b) => a + b, Seq([4, 5, 6]))
          .toArray()
      ).toEqual([5, 7, 9]);
    });

    it('can zip to create immutable collections', () => {
      expect(
        Seq([1, 2, 3])
          .zipWith(
            function () {
              // eslint-disable-next-line prefer-rest-params
              return List(arguments);
            },
            Seq([4, 5, 6]),
            Seq([7, 8, 9])
          )
          .toJS()
      ).toEqual([
        [1, 4, 7],
        [2, 5, 8],
        [3, 6, 9],
      ]);
    });
  });

  describe('zipAll', () => {
    it('fills in the empty zipped values with undefined', () => {
      expect(
        Seq([1, 2, 3])
          .zipAll(Seq([4]))
          .toArray()
      ).toEqual([
        [1, 4],
        [2, undefined],
        [3, undefined],
      ]);
    });

    it('is always the size of the longest sequence', () => {
      fc.assert(
        fc.property(fc.array(fc.nat(), { minLength: 1 }), (lengths) => {
          const ranges = lengths.map((l) => Range(0, l));
          const first = ranges.shift();
          expectToBeDefined(first);
          const zipped = first.zipAll.apply(first, ranges);
          const longestLength = Math.max.apply(Math, lengths);
          expect(zipped.size).toBe(longestLength);
        })
      );
    });
  });

  describe('interleave', () => {
    it('interleaves multiple collections', () => {
      expect(
        Seq([1, 2, 3])
          .interleave(Seq([4, 5, 6]), Seq([7, 8, 9]))
          .toArray()
      ).toEqual([1, 4, 7, 2, 5, 8, 3, 6, 9]);
    });

    it('stops at the shortest collection', () => {
      const i = Seq([1, 2, 3]).interleave(Seq([4, 5]), Seq([7, 8, 9]));
      expect(i.size).toBe(6);
      expect(i.toArray()).toEqual([1, 4, 7, 2, 5, 8]);
    });

    it('with infinite lists', () => {
      const r: Seq.Indexed<number | string> = Range(0, Infinity);
      const i = r.interleave(Seq(['A', 'B', 'C']));
      expect(i.size).toBe(6);
      expect(i.toArray()).toEqual([0, 'A', 1, 'B', 2, 'C']);
    });

    it('interleave has correct size', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 1, maxLength: 50 }),
          fc.array(fc.integer(), { minLength: 1, maxLength: 50 }),
          (arr1, arr2) => {
            const minLen = Math.min(arr1.length, arr2.length);
            const interleaved = Seq(arr1).interleave(Seq(arr2));
            expect(interleaved.size).toBe(minLen * 2);
          }
        )
      );
    });
  });

  describe('property-based tests', () => {
    it('zip entries match positionally', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { maxLength: 50 }),
          fc.array(fc.integer(), { maxLength: 50 }),
          (arr1, arr2) => {
            const zipped = Seq(arr1).zip(Seq(arr2)).toArray();
            const minLen = Math.min(arr1.length, arr2.length);
            expect(zipped.length).toBe(minLen);
            for (let i = 0; i < minLen; i++) {
              expect(zipped[i]).toEqual([arr1[i], arr2[i]]);
            }
          }
        )
      );
    });
  });
});
