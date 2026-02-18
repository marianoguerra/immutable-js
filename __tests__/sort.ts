import { List, OrderedMap, Range, Seq } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

describe('sort', () => {
  it('sorts a sequence', () => {
    expect(Seq([4, 5, 6, 3, 2, 1]).sort().toArray()).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it('sorts a list', () => {
    expect(List([4, 5, 6, 3, 2, 1]).sort().toArray()).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it('sorts undefined values last', () => {
    expect(
      List([4, undefined, 5, 6, 3, undefined, 2, 1]).sort().toArray()
    ).toEqual([1, 2, 3, 4, 5, 6, undefined, undefined]);
  });

  it('sorts a keyed sequence', () => {
    expect(
      Seq({ z: 1, y: 2, x: 3, c: 3, b: 2, a: 1 }).sort().entrySeq().toArray()
    ).toEqual([
      ['z', 1],
      ['a', 1],
      ['y', 2],
      ['b', 2],
      ['x', 3],
      ['c', 3],
    ]);
  });

  it('sorts an OrderedMap', () => {
    expect(
      OrderedMap({ z: 1, y: 2, x: 3, c: 3, b: 2, a: 1 })
        .sort()
        .entrySeq()
        .toArray()
    ).toEqual([
      ['z', 1],
      ['a', 1],
      ['y', 2],
      ['b', 2],
      ['x', 3],
      ['c', 3],
    ]);
  });

  it('accepts a sort function', () => {
    expect(
      Seq([4, 5, 6, 3, 2, 1])
        .sort((a, b) => b - a)
        .toArray()
    ).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it('sorts by using a mapper', () => {
    expect(
      Range(1, 10)
        .sortBy((v) => v % 3)
        .toArray()
    ).toEqual([3, 6, 9, 1, 4, 7, 2, 5, 8]);
  });

  it('sorts by using a mapper and a sort function', () => {
    expect(
      Range(1, 10)
        .sortBy(
          (v) => v % 3,
          (a: number, b: number) => b - a
        )
        .toArray()
    ).toEqual([2, 5, 8, 1, 4, 7, 3, 6, 9]);
  });

  describe('property-based tests', () => {
    it('equivalence with Array.sort', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 200 }), (arr) => {
          const comparator = (a: number, b: number) => a - b;
          expect(List(arr).sort(comparator).toArray()).toEqual(
            [...arr].sort(comparator)
          );
        })
      );
    });

    it('idempotent: sorting twice equals sorting once', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 200 }), (arr) => {
          const comparator = (a: number, b: number) => a - b;
          const list = List(arr);
          expect(list.sort(comparator).sort(comparator).toArray()).toEqual(
            list.sort(comparator).toArray()
          );
        })
      );
    });

    it('size preservation', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 200 }), (arr) => {
          expect(List(arr).sort().size).toBe(arr.length);
        })
      );
    });

    it('sorted order: every adjacent pair satisfies a <= b', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 200 }), (arr) => {
          const sorted = List(arr)
            .sort((a: number, b: number) => a - b)
            .toArray();
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i]! <= sorted[i + 1]!).toBe(true);
          }
        })
      );
    });
  });
});
