/**
 * Targeted property tests around internal structural thresholds that
 * random command walks rarely reach:
 *  - List: VNode tree transitions at 32 (SIZE) and 1024 (SIZE << SHIFT)
 *    elements, and non-zero _origin offsets created by shift/unshift.
 *  - Map: node transitions at 8 (ArrayMapNode -> BitmapIndexedNode) and
 *    16 (-> HashArrayMapNode), and pack-down on delete.
 *  - OrderedMap: tombstone compaction, which only triggers once the
 *    backing list reaches size >= 32 with >= 2x tombstone ratio.
 */
import { List, Map, OrderedMap } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

// A mixed batch of front/back operations applied identically to a plain
// array and a List, hitting origin/capacity adjustments in the tree.
type EndOp =
  | { op: 'push'; value: number }
  | { op: 'pop' }
  | { op: 'unshift'; value: number }
  | { op: 'shift' }
  | { op: 'set'; index: number; value: number };

const endOpArb: fc.Arbitrary<EndOp> = fc.oneof(
  fc.integer().map((value): EndOp => ({ op: 'push', value })),
  fc.constant<EndOp>({ op: 'pop' }),
  fc.integer().map((value): EndOp => ({ op: 'unshift', value })),
  fc.constant<EndOp>({ op: 'shift' }),
  fc
    .tuple(fc.nat({ max: 2000 }), fc.integer())
    .map(([index, value]): EndOp => ({ op: 'set', index, value }))
);

function applyEndOps(size: number, ops: EndOp[]) {
  const arr: (number | undefined)[] = [];
  for (let i = 0; i < size; i++) {
    arr.push(i);
  }
  let list = List(arr);
  for (const o of ops) {
    switch (o.op) {
      case 'push':
        arr.push(o.value);
        list = list.push(o.value);
        break;
      case 'pop':
        arr.pop();
        list = list.pop();
        break;
      case 'unshift':
        arr.unshift(o.value);
        list = list.unshift(o.value);
        break;
      case 'shift':
        arr.shift();
        list = list.shift();
        break;
      case 'set': {
        const idx = arr.length === 0 ? 0 : o.index % (arr.length + 40);
        while (arr.length < idx) {
          arr.push(undefined);
        }
        if (idx === arr.length) {
          arr.push(o.value);
        } else {
          arr[idx] = o.value;
        }
        list = list.set(idx, o.value);
        break;
      }
    }
  }
  return { arr, list };
}

function checkListAgainstArray(
  list: List<number | undefined>,
  arr: (number | undefined)[]
) {
  expect(list.size).toBe(arr.length);
  expect(list.toArray()).toEqual(arr);
  expect([...list.values()]).toEqual(arr);
  expect(list.reverse().toArray()).toEqual([...arr].reverse());
  // Early termination through the tree-walking iterate path
  const firstNegative = list.find((v) => typeof v === 'number' && v < 0);
  expect(firstNegative).toBe(arr.find((v) => typeof v === 'number' && v < 0));
  expect(list.takeWhile((v) => v !== undefined).toArray()).toEqual(
    (() => {
      const out: (number | undefined)[] = [];
      for (const v of arr) {
        if (v === undefined) break;
        out.push(v);
      }
      return out;
    })()
  );
}

describe('List structural boundaries', () => {
  it('mixed end operations around the 32-element tail boundary match Array', () => {
    expect(() =>
      fc.assert(
        fc.property(
          fc.integer({ min: 28, max: 40 }),
          fc.array(endOpArb, { minLength: 1, maxLength: 40 }),
          (size, ops) => {
            const { arr, list } = applyEndOps(size, ops);
            checkListAgainstArray(list, arr);
          }
        ),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });

  it('mixed end operations around the 1024-element level boundary match Array', () => {
    expect(() =>
      fc.assert(
        fc.property(
          fc.integer({ min: 1020, max: 1030 }),
          fc.array(endOpArb, { minLength: 1, maxLength: 20 }),
          (size, ops) => {
            const { arr, list } = applyEndOps(size, ops);
            checkListAgainstArray(list, arr);
          }
        ),
        { numRuns: 50 }
      )
    ).not.toThrow();
  });

  it('slices of a shifted list (non-zero origin) match Array', () => {
    expect(() =>
      fc.assert(
        fc.property(
          fc.integer({ min: 33, max: 100 }),
          fc.nat({ max: 40 }),
          fc.integer({ min: -50, max: 120 }),
          fc.integer({ min: -50, max: 120 }),
          (size, shifts, begin, end) => {
            let arr: number[] = [];
            for (let i = 0; i < size; i++) {
              arr.push(i);
            }
            let list = List(arr);
            for (let i = 0; i < shifts && arr.length > 0; i++) {
              arr.shift();
              list = list.shift();
            }
            arr = arr.slice(begin, end);
            list = list.slice(begin, end);
            expect(list.toArray()).toEqual(arr);
            expect(list.reverse().toArray()).toEqual([...arr].reverse());
          }
        ),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});

describe('Map node transitions', () => {
  it('grow past 8 and 16 entries then delete back down matches native Map', () => {
    expect(() =>
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 40 }),
          fc.array(fc.nat({ max: 45 }), { maxLength: 45 }),
          (n, deleteKeys) => {
            const model = new globalThis.Map<string, number>();
            let map = Map<string, number>();
            for (let i = 0; i < n; i++) {
              model.set(`k${i}`, i);
              map = map.set(`k${i}`, i);
            }
            for (const d of deleteKeys) {
              model.delete(`k${d}`);
              map = map.delete(`k${d}`);
            }
            expect(map.size).toBe(model.size);
            for (const [k, v] of model) {
              expect(map.get(k)).toBe(v);
            }
            let count = 0;
            for (const [k, v] of map) {
              expect(model.get(k)).toBe(v);
              count++;
            }
            expect(count).toBe(model.size);
          }
        ),
        { numRuns: 300 }
      )
    ).not.toThrow();
  });
});

describe('OrderedMap tombstone compaction', () => {
  it('delete-heavy sequences crossing the compaction threshold keep order', () => {
    expect(() =>
      fc.assert(
        fc.property(
          fc.integer({ min: 33, max: 80 }),
          fc.uniqueArray(fc.nat({ max: 85 }), { maxLength: 85 }),
          fc.array(fc.tuple(fc.nat({ max: 120 }), fc.integer()), {
            maxLength: 10,
          }),
          (n, deleteIdxs, laterSets) => {
            const model = new globalThis.Map<string, number>();
            let map = OrderedMap<string, number>();
            for (let i = 0; i < n; i++) {
              model.set(`k${i}`, i);
              map = map.set(`k${i}`, i);
            }
            // Delete a large subset to force the list.size >= 32 &&
            // list.size >= 2 * map.size rebuild.
            for (const d of deleteIdxs) {
              model.delete(`k${d}`);
              map = map.delete(`k${d}`);
            }
            expect([...map.entries()]).toEqual([...model.entries()]);
            // The rebuilt index must still behave correctly afterwards.
            for (const [k, v] of laterSets) {
              model.set(`k${k}`, v);
              map = map.set(`k${k}`, v);
            }
            expect([...map.entries()]).toEqual([...model.entries()]);
            expect([...map.reverse().entries()]).toEqual(
              [...model.entries()].reverse()
            );
          }
        ),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
