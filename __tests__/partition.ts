import {
  Map as IMap,
  Set as ISet,
  List,
  Seq,
  isAssociative,
  isIndexed,
  isKeyed,
  isList,
  isMap,
  isSeq,
  isSet,
} from 'immutable';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import fc from 'fast-check';

describe('partition', () => {
  let isOdd: jest.Mock<(x: number) => number>;

  beforeEach(() => {
    isOdd = jest.fn((x) => x % 2);
  });

  it('partitions keyed sequence', () => {
    const parts = Seq({ a: 1, b: 2, c: 3, d: 4 }).partition(isOdd);
    expect(isKeyed(parts[0])).toBe(true);
    expect(isSeq(parts[0])).toBe(true);
    expect(parts.map((part) => part.toJS())).toEqual([
      { b: 2, d: 4 },
      { a: 1, c: 3 },
    ]);
    expect(isOdd.mock.calls.length).toBe(4);

    // Each group should be a keyed sequence, not an indexed sequence
    const trueGroup = parts[1];
    expect(trueGroup && trueGroup.toArray()).toEqual([
      ['a', 1],
      ['c', 3],
    ]);
  });

  it('partitions indexed sequence', () => {
    const parts = Seq([1, 2, 3, 4, 5, 6]).partition(isOdd);
    expect(isIndexed(parts[0])).toBe(true);
    expect(isSeq(parts[0])).toBe(true);
    expect(parts.map((part) => part.toJS())).toEqual([
      [2, 4, 6],
      [1, 3, 5],
    ]);
    expect(isOdd.mock.calls.length).toBe(6);
  });

  it('partitions set sequence', () => {
    const parts = Seq.Set([1, 2, 3, 4, 5, 6]).partition(isOdd);
    expect(isAssociative(parts[0])).toBe(false);
    expect(isSeq(parts[0])).toBe(true);
    expect(parts.map((part) => part.toJS())).toEqual([
      [2, 4, 6],
      [1, 3, 5],
    ]);
    expect(isOdd.mock.calls.length).toBe(6);
  });

  it('partitions keyed collection', () => {
    const parts = IMap({ a: 1, b: 2, c: 3, d: 4 }).partition(isOdd);
    expect(isMap(parts[0])).toBe(true);
    expect(isSeq(parts[0])).toBe(false);
    expect(parts.map((part) => part.toJS())).toEqual([
      { b: 2, d: 4 },
      { a: 1, c: 3 },
    ]);
    expect(isOdd.mock.calls.length).toBe(4);

    // Each group should be a keyed collection, not an indexed collection
    const trueGroup = parts[1];
    expect(trueGroup && trueGroup.toArray()).toEqual([
      ['a', 1],
      ['c', 3],
    ]);
  });

  it('partitions indexed collection', () => {
    const parts = List([1, 2, 3, 4, 5, 6]).partition(isOdd);
    expect(isList(parts[0])).toBe(true);
    expect(isSeq(parts[0])).toBe(false);
    expect(parts.map((part) => part.toJS())).toEqual([
      [2, 4, 6],
      [1, 3, 5],
    ]);
    expect(isOdd.mock.calls.length).toBe(6);
  });

  it('partitions set collection', () => {
    const parts = ISet([1, 2, 3, 4, 5, 6]).partition(isOdd);
    expect(isSet(parts[0])).toBe(true);
    expect(isSeq(parts[0])).toBe(false);
    expect(parts.map((part) => part.toJS().sort())).toEqual([
      [2, 4, 6],
      [1, 3, 5],
    ]);
    expect(isOdd.mock.calls.length).toBe(6);
  });

  describe('property-based tests', () => {
    it('completeness: all elements appear across both partitions', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 100 }), (arr) => {
          const list = List(arr);
          const [falsy, truthy] = list.partition((x) => x % 2 === 1);
          const recombined = (falsy as List<number>)
            .concat(truthy as List<number>)
            .sort()
            .toArray();
          expect(recombined).toEqual([...arr].sort((a, b) => a - b));
        })
      );
    });

    it('mutual exclusivity: truthy partition satisfies predicate, falsy does not', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 100 }), (arr) => {
          const list = List(arr);
          const pred = (x: number) => x % 2 === 1;
          const [falsy, truthy] = list.partition(pred);
          (truthy as List<number>).forEach((x) => {
            expect(pred(x)).toBe(true);
          });
          (falsy as List<number>).forEach((x) => {
            expect(pred(x)).toBe(false);
          });
        })
      );
    });

    it('size conservation: falsy.size + truthy.size === original.size', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 100 }), (arr) => {
          const list = List(arr);
          const [falsy, truthy] = list.partition((x) => x % 2 === 1);
          expect(falsy.size + truthy.size).toBe(list.size);
        })
      );
    });

    it('keyed partition completeness: all keys preserved for Map', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.string({ maxLength: 5 }), fc.integer()), {
            maxLength: 50,
          }),
          (entries) => {
            const map = IMap(entries);
            const [falsy, truthy] = map.partition((v) => v % 2 === 1);
            const allKeys = (falsy as IMap<string, number>)
              .keySeq()
              .concat((truthy as IMap<string, number>).keySeq())
              .toSet();
            expect(allKeys).toEqual(map.keySeq().toSet());
          }
        )
      );
    });

    it('partition[0] is filterNot, partition[1] is filter', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 100 }), (arr) => {
          const list = List(arr);
          const pred = (x: number) => x % 2 === 1;
          const [falsy, truthy] = list.partition(pred);
          expect((falsy as List<number>).toArray()).toEqual(
            list.filterNot(pred).toArray()
          );
          expect((truthy as List<number>).toArray()).toEqual(
            list.filter(pred).toArray()
          );
        })
      );
    });
  });
});
