import { Collection, List, Range, Seq, fromJS } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

describe('flatten', () => {
  it('flattens sequences one level deep', () => {
    const nested = fromJS([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
    const flat = nested.flatten();
    expect(flat.toJS()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('flattening a List returns a List', () => {
    const nested = fromJS([[1], 2, 3, [4, 5, 6]]);
    const flat = nested.flatten();
    expect(flat.toString()).toEqual('List [ 1, 2, 3, 4, 5, 6 ]');
  });

  it('gives the correct iteration count', () => {
    const nested = fromJS([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    const flat = nested.flatten();
    // @ts-expect-error -- `flatten` return type should be improved
    expect(flat.forEach((x: number) => x < 4)).toEqual(4);
  });

  type SeqType = number | Array<number> | Collection<number, number>;

  it('flattens only Sequences (not sequenceables)', () => {
    const nested = Seq<SeqType>([Range(1, 3), [3, 4], List([5, 6, 7]), 8]);
    const flat = nested.flatten();
    expect(flat.toJS()).toEqual([1, 2, [3, 4], 5, 6, 7, 8]);
  });

  it('can be reversed', () => {
    const nested = Seq<SeqType>([Range(1, 3), [3, 4], List([5, 6, 7]), 8]);
    const flat = nested.flatten();
    const reversed = flat.reverse();
    expect(reversed.toJS()).toEqual([8, 7, 6, 5, [3, 4], 2, 1]);
  });

  it('can flatten at various levels of depth', () => {
    const deeplyNested = fromJS([
      [
        [
          ['A', 'B'],
          ['A', 'B'],
        ],
        [
          ['A', 'B'],
          ['A', 'B'],
        ],
      ],
      [
        [
          ['A', 'B'],
          ['A', 'B'],
        ],
        [
          ['A', 'B'],
          ['A', 'B'],
        ],
      ],
    ]);

    // deeply flatten
    expect(deeplyNested.flatten().toJS()).toEqual([
      'A',
      'B',
      'A',
      'B',
      'A',
      'B',
      'A',
      'B',
      'A',
      'B',
      'A',
      'B',
      'A',
      'B',
      'A',
      'B',
    ]);

    // shallow flatten
    expect(deeplyNested.flatten(true).toJS()).toEqual([
      [
        ['A', 'B'],
        ['A', 'B'],
      ],
      [
        ['A', 'B'],
        ['A', 'B'],
      ],
      [
        ['A', 'B'],
        ['A', 'B'],
      ],
      [
        ['A', 'B'],
        ['A', 'B'],
      ],
    ]);

    // flatten two levels
    expect(deeplyNested.flatten(2).toJS()).toEqual([
      ['A', 'B'],
      ['A', 'B'],
      ['A', 'B'],
      ['A', 'B'],
      ['A', 'B'],
      ['A', 'B'],
      ['A', 'B'],
      ['A', 'B'],
    ]);
  });

  describe('flatMap', () => {
    it('first maps, then shallow flattens', () => {
      const numbers = Range(97, 100);
      const letters = numbers.flatMap((v) =>
        fromJS([String.fromCharCode(v), String.fromCharCode(v).toUpperCase()])
      );
      expect(letters.toJS()).toEqual(['a', 'A', 'b', 'B', 'c', 'C']);
    });

    it('maps to sequenceables, not only Sequences.', () => {
      const numbers = Range(97, 100);
      // the map function returns an Array, rather than a Collection.
      // Array is iterable, so this works just fine.
      const letters = numbers.flatMap((v) => [
        String.fromCharCode(v),
        String.fromCharCode(v).toUpperCase(),
      ]);
      expect(letters.toJS()).toEqual(['a', 'A', 'b', 'B', 'c', 'C']);
    });
  });

  describe('property-based tests', () => {
    it('flatMap equivalence: coll.flatMap(f) equals coll.map(f).flatten(true)', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { maxLength: 50 }), (arr) => {
          const list = List(arr);
          const f = (x: number) => List([x, x * 2]);
          expect(list.flatMap(f).toArray()).toEqual(
            list.map(f).flatten(true).toArray()
          );
        })
      );
    });

    it('flatten preserves total count', () => {
      fc.assert(
        fc.property(
          fc.array(fc.array(fc.integer(), { maxLength: 10 }), {
            maxLength: 10,
          }),
          (arrs) => {
            const nested = List(arrs.map((a) => List(a)));
            const totalInner = arrs.reduce((sum, a) => sum + a.length, 0);
            expect(nested.flatten(true).count()).toBe(totalInner);
          }
        )
      );
    });

    it('shallow flatten reduces one level', () => {
      fc.assert(
        fc.property(
          fc.array(fc.array(fc.integer(), { maxLength: 10 }), {
            maxLength: 10,
          }),
          (arrs) => {
            const nested = List(arrs.map((a) => List(a)));
            const flattened = nested.flatten(true).toArray();
            const expected = arrs.reduce<Array<number>>(
              (acc, a) => acc.concat(a),
              []
            );
            expect(flattened).toEqual(expected);
          }
        )
      );
    });
  });
});
