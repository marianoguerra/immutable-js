/**
 * Differential oracle: applies identical random operation sequences to
 * this codebase and to the published immutable v5 (npm alias
 * `immutable-v5`), asserting observable behavior matches step by step.
 * Runtime collection semantics are meant to be identical to v5 — the
 * 7.x/6.x breaking changes are packaging- and typing-level only.
 *
 * Keys/values are primitives (including NaN and undefined, excluding -0):
 * object keys would hit each library's own hash cache and identity
 * semantics, which the model-check suites already cover.
 */
import {
  List,
  Map,
  OrderedMap,
  Set,
  OrderedSet,
  Stack,
  Record,
} from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import * as V5 from 'immutable-v5';

type Prim = number | string | boolean | null | undefined;

const primArb: fc.Arbitrary<Prim> = fc.oneof(
  { weight: 4, arbitrary: fc.integer() as fc.Arbitrary<Prim> },
  { weight: 2, arbitrary: fc.string({ maxLength: 5 }) },
  {
    weight: 1,
    arbitrary: fc.constantFrom<Prim>(NaN, undefined, null, true, false),
  }
);
const smallArr = fc.array(primArb, { maxLength: 8 });
const entriesArb = fc.array(fc.tuple(primArb, primArb), { maxLength: 5 });

// Deterministic total helpers shared by both libraries
const inc = (v: Prim): Prim => (typeof v === 'number' ? v + 1 : 1);
const dbl = (v: Prim): Prim => (typeof v === 'number' ? v * 2 : v);
const isEven = (v: Prim): boolean => typeof v === 'number' && v % 2 === 0;
const canon = (v: unknown): string =>
  `${typeof v}:${typeof v === 'string' ? JSON.stringify(v) : String(v)}`;
const cmpCanon = (a: Prim, b: Prim): number =>
  canon(a) < canon(b) ? -1 : canon(a) > canon(b) ? 1 : 0;
const merger = (a: Prim, b: Prim): Prim =>
  typeof a === 'number' && typeof b === 'number' ? a + b : b;

/** An operation applied identically to both implementations. */
type Op = {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply: (c: any) => any;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyColl = any;

function sortedEntries(c: AnyColl): [string, unknown][] {
  return [...c.entries()]
    .map(([k, v]: [unknown, unknown]): [string, unknown] => [
      canon(k),
      v,
    ])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

function runDifferential(
  ops: Op[],
  makeOurs: () => AnyColl,
  makeV5: () => AnyColl,
  compare: (ours: AnyColl, v5: AnyColl) => void
) {
  let ours = makeOurs();
  let v5 = makeV5();
  const oursHist: AnyColl[] = [ours];
  const v5Hist: AnyColl[] = [v5];
  for (const op of ops) {
    ours = op.apply(ours);
    v5 = op.apply(v5);
    compare(ours, v5);
    oursHist.push(ours);
    v5Hist.push(v5);
  }
  // equals() must agree across the whole history: two states are
  // value-equal in 7.x exactly when they are value-equal in v5.
  for (let i = 0; i < oursHist.length; i++) {
    expect(oursHist[i].equals(ours)).toBe(v5Hist[i].equals(v5));
  }
}

function compareOrdered(ours: AnyColl, v5: AnyColl) {
  expect(ours.size).toBe(v5.size);
  expect(ours.toArray()).toEqual(v5.toArray());
  expect([...ours.values()]).toEqual([...v5.values()]);
  expect([...ours.entries()]).toEqual([...v5.entries()]);
  expect(ours.reverse().toArray()).toEqual(v5.reverse().toArray());
  expect(ours.first()).toEqual(v5.first());
  expect(ours.last()).toEqual(v5.last());
}

function compareUnordered(ours: AnyColl, v5: AnyColl) {
  expect(ours.size).toBe(v5.size);
  expect(sortedEntries(ours)).toEqual(sortedEntries(v5));
}

const rawIdx = fc.oneof(
  { weight: 9, arbitrary: fc.integer({ min: -40, max: 40 }) },
  { weight: 1, arbitrary: fc.constant(NaN) }
);

const listOps: fc.Arbitrary<Op>[] = [
  primArb.map((v) => ({ label: `push(${canon(v)})`, apply: (c) => c.push(v) })),
  fc.constant({ label: 'pop()', apply: (c: AnyColl) => c.pop() }),
  primArb.map((v) => ({
    label: `unshift(${canon(v)})`,
    apply: (c: AnyColl) => c.unshift(v),
  })),
  fc.constant({ label: 'shift()', apply: (c: AnyColl) => c.shift() }),
  rawIdx.chain((i) =>
    primArb.map((v) => ({
      label: `set(${i}, ${canon(v)})`,
      apply: (c: AnyColl) => c.set(i, v),
    }))
  ),
  fc.integer({ min: -40, max: 40 }).map((i) => ({
    label: `remove(${i})`,
    apply: (c: AnyColl) => c.remove(i),
  })),
  fc.integer({ min: -40, max: 40 }).chain((i) =>
    primArb.map((v) => ({
      label: `insert(${i}, ${canon(v)})`,
      apply: (c: AnyColl) => c.insert(i, v),
    }))
  ),
  fc.constant({ label: 'clear()', apply: (c: AnyColl) => c.clear() }),
  smallArr.map((vals) => ({
    label: `concat(${vals.length})`,
    apply: (c: AnyColl) => c.concat(vals),
  })),
  fc
    .tuple(
      fc.integer({ min: -20, max: 20 }),
      fc.nat({ max: 5 }),
      fc.array(primArb, { maxLength: 4 })
    )
    .map(([i, rem, vals]) => ({
      label: `splice(${i}, ${rem})`,
      apply: (c: AnyColl) => c.splice(i, rem, ...vals),
    })),
  fc.nat({ max: 60 }).map((n) => ({
    label: `setSize(${n})`,
    apply: (c: AnyColl) => c.setSize(n),
  })),
  fc.integer({ min: -40, max: 40 }).map((i) => ({
    label: `update(${i}, inc)`,
    apply: (c: AnyColl) => c.update(i, inc),
  })),
  fc.constant({
    label: 'sort(canonical)',
    apply: (c: AnyColl) => c.sort(cmpCanon),
  }),
  fc.constant({ label: 'reverse()', apply: (c: AnyColl) => c.reverse() }),
  fc
    .tuple(fc.integer({ min: -30, max: 30 }), fc.integer({ min: -30, max: 30 }))
    .map(([b, e]) => ({
      label: `slice(${b}, ${e})`,
      apply: (c: AnyColl) => c.slice(b, e),
    })),
  fc.constant({ label: 'map(dbl)', apply: (c: AnyColl) => c.map(dbl) }),
  fc.constant({
    label: 'filter(isEven)',
    apply: (c: AnyColl) => c.filter(isEven),
  }),
  smallArr.map((vals) => ({
    label: `withMutations(push x${vals.length}, pop)`,
    apply: (c: AnyColl) =>
      c.withMutations((mut: AnyColl) => {
        for (const v of vals) {
          mut.push(v);
        }
        if (mut.size > 0) {
          mut.pop();
        }
      }),
  })),
];

const keyedOps = (sortable: boolean): fc.Arbitrary<Op>[] => [
  fc.tuple(primArb, primArb).map(([k, v]) => ({
    label: `set(${canon(k)}, ${canon(v)})`,
    apply: (c: AnyColl) => c.set(k, v),
  })),
  primArb.map((k) => ({
    label: `delete(${canon(k)})`,
    apply: (c: AnyColl) => c.delete(k),
  })),
  fc.constant({ label: 'clear()', apply: (c: AnyColl) => c.clear() }),
  entriesArb.map((entries) => ({
    label: `merge(${entries.length})`,
    apply: (c: AnyColl) => c.merge(entries),
  })),
  entriesArb.map((entries) => ({
    label: `mergeWith(${entries.length})`,
    apply: (c: AnyColl) => c.mergeWith(merger, entries),
  })),
  fc.array(primArb, { maxLength: 5 }).map((keys) => ({
    label: `deleteAll(${keys.length})`,
    apply: (c: AnyColl) => c.deleteAll(keys),
  })),
  primArb.map((k) => ({
    label: `update(${canon(k)}, inc)`,
    apply: (c: AnyColl) => c.update(k, inc),
  })),
  fc.constant({ label: 'map(dbl)', apply: (c: AnyColl) => c.map(dbl) }),
  fc.constant({
    label: 'filter(isEven)',
    apply: (c: AnyColl) => c.filter(isEven),
  }),
  ...(sortable
    ? [
        fc.constant({
          label: 'sort(canonical values)',
          apply: (c: AnyColl) => c.sort(cmpCanon),
        }),
      ]
    : []),
  entriesArb.map((entries) => ({
    label: `withMutations(set x${entries.length})`,
    apply: (c: AnyColl) =>
      c.withMutations((mut: AnyColl) => {
        for (const [k, v] of entries) {
          mut.set(k, v);
        }
        if (entries.length > 0) {
          mut.delete(entries[0]![0]);
        }
      }),
  })),
];

const setOps = (sortable: boolean): fc.Arbitrary<Op>[] => [
  primArb.map((v) => ({
    label: `add(${canon(v)})`,
    apply: (c: AnyColl) => c.add(v),
  })),
  primArb.map((v) => ({
    label: `delete(${canon(v)})`,
    apply: (c: AnyColl) => c.delete(v),
  })),
  fc.constant({ label: 'clear()', apply: (c: AnyColl) => c.clear() }),
  smallArr.map((vals) => ({
    label: `union(${vals.length})`,
    apply: (c: AnyColl) => c.union(vals),
  })),
  smallArr.map((vals) => ({
    label: `intersect(${vals.length})`,
    apply: (c: AnyColl) => c.intersect(vals),
  })),
  smallArr.map((vals) => ({
    label: `subtract(${vals.length})`,
    apply: (c: AnyColl) => c.subtract(vals),
  })),
  fc.constant({ label: 'map(dbl)', apply: (c: AnyColl) => c.map(dbl) }),
  fc.constant({
    label: 'filter(isEven)',
    apply: (c: AnyColl) => c.filter(isEven),
  }),
  ...(sortable
    ? [
        fc.constant({
          label: 'sort(canonical)',
          apply: (c: AnyColl) => c.sort(cmpCanon),
        }),
      ]
    : []),
  smallArr.map((vals) => ({
    label: `withMutations(add x${vals.length})`,
    apply: (c: AnyColl) =>
      c.withMutations((mut: AnyColl) => {
        for (const v of vals) {
          mut.add(v);
        }
        if (vals.length > 0) {
          mut.delete(vals[0]);
        }
      }),
  })),
];

const stackOps: fc.Arbitrary<Op>[] = [
  primArb.map((v) => ({
    label: `push(${canon(v)})`,
    apply: (c: AnyColl) => c.push(v),
  })),
  fc.constant({ label: 'pop()', apply: (c: AnyColl) => c.pop() }),
  primArb.map((v) => ({
    label: `unshift(${canon(v)})`,
    apply: (c: AnyColl) => c.unshift(v),
  })),
  fc.constant({ label: 'shift()', apply: (c: AnyColl) => c.shift() }),
  fc.constant({ label: 'clear()', apply: (c: AnyColl) => c.clear() }),
  smallArr.map((vals) => ({
    label: `pushAll(${vals.length})`,
    apply: (c: AnyColl) => c.pushAll(vals),
  })),
  fc
    .tuple(
      fc.integer({ min: -15, max: 15 }),
      fc.option(fc.integer({ min: -15, max: 15 }), { nil: undefined })
    )
    .map(([b, e]) => ({
      label: `slice(${b}, ${e})`,
      apply: (c: AnyColl) => c.slice(b, e),
    })),
];

const opSeq = (opArbs: fc.Arbitrary<Op>[]) =>
  fc.array(fc.oneof(...opArbs), { minLength: 1, maxLength: 25 });

describe('differential vs published immutable v5', () => {
  it('List matches v5 step by step', () => {
    expect(() =>
      fc.assert(
        fc.property(opSeq(listOps), (ops) => {
          runDifferential(
            ops,
            () => List<Prim>(),
            () => V5.List<Prim>(),
            (ours, v5) => {
              compareOrdered(ours, v5);
              expect(ours.get(0)).toEqual(v5.get(0));
              expect(ours.get(-1)).toEqual(v5.get(-1));
            }
          );
        }),
        { numRuns: 150 }
      )
    ).not.toThrow();
  });

  it('Map matches v5 step by step', () => {
    expect(() =>
      fc.assert(
        fc.property(opSeq(keyedOps(false)), (ops) => {
          runDifferential(
            ops,
            () => Map<Prim, Prim>(),
            () => V5.Map<Prim, Prim>(),
            compareUnordered
          );
        }),
        { numRuns: 150 }
      )
    ).not.toThrow();
  });

  it('OrderedMap matches v5 step by step (including order)', () => {
    expect(() =>
      fc.assert(
        fc.property(opSeq(keyedOps(true)), (ops) => {
          runDifferential(
            ops,
            () => OrderedMap<Prim, Prim>(),
            () => V5.OrderedMap<Prim, Prim>(),
            (ours, v5) => {
              expect(ours.size).toBe(v5.size);
              expect([...ours.entries()]).toEqual([...v5.entries()]);
              expect([...ours.keys()]).toEqual([...v5.keys()]);
              expect([...ours.reverse().entries()]).toEqual([
                ...v5.reverse().entries(),
              ]);
            }
          );
        }),
        { numRuns: 150 }
      )
    ).not.toThrow();
  });

  it('Set matches v5 step by step', () => {
    expect(() =>
      fc.assert(
        fc.property(opSeq(setOps(false)), (ops) => {
          runDifferential(
            ops,
            () => Set<Prim>(),
            () => V5.Set<Prim>(),
            (ours, v5) => {
              expect(ours.size).toBe(v5.size);
              expect([...ours.values()].map(canon).sort()).toEqual(
                [...v5.values()].map(canon).sort()
              );
            }
          );
        }),
        { numRuns: 150 }
      )
    ).not.toThrow();
  });

  it('OrderedSet matches v5 step by step (including order)', () => {
    expect(() =>
      fc.assert(
        fc.property(opSeq(setOps(true)), (ops) => {
          runDifferential(
            ops,
            () => OrderedSet<Prim>(),
            () => V5.OrderedSet<Prim>(),
            compareOrdered
          );
        }),
        { numRuns: 150 }
      )
    ).not.toThrow();
  });

  it('Stack matches v5 step by step', () => {
    expect(() =>
      fc.assert(
        fc.property(opSeq(stackOps), (ops) => {
          runDifferential(
            ops,
            () => Stack<Prim>(),
            () => V5.Stack<Prim>(),
            (ours, v5) => {
              compareOrdered(ours, v5);
              expect(ours.peek()).toEqual(v5.peek());
            }
          );
        }),
        { numRuns: 150 }
      )
    ).not.toThrow();
  });

  it('Record matches v5 step by step', () => {
    const defaults = { a: 0 as Prim, b: 'x' as Prim, c: null as Prim };
    const Ours = Record(defaults);
    const Theirs = V5.Record(defaults);
    const fieldArb = fc.constantFrom('a', 'b', 'c');
    const recOps: fc.Arbitrary<Op>[] = [
      fc.tuple(fieldArb, primArb).map(([f, v]) => ({
        label: `set(${f}, ${canon(v)})`,
        apply: (c: AnyColl) => c.set(f, v),
      })),
      fieldArb.map((f) => ({
        label: `delete(${f})`,
        apply: (c: AnyColl) => c.delete(f),
      })),
      fc.constant({ label: 'clear()', apply: (c: AnyColl) => c.clear() }),
      fc
        .record(
          { a: primArb, b: primArb, c: primArb },
          { requiredKeys: [] }
        )
        .map((p) => ({
          label: `merge(${Object.keys(p).join(',')})`,
          apply: (c: AnyColl) => c.merge(p),
        })),
      fieldArb.map((f) => ({
        label: `update(${f}, inc)`,
        apply: (c: AnyColl) => c.update(f, inc),
      })),
    ];
    expect(() =>
      fc.assert(
        fc.property(opSeq(recOps), (ops) => {
          runDifferential(
            ops,
            () => Ours(),
            () => Theirs(),
            (ours, v5) => {
              expect(ours.toObject()).toEqual(v5.toObject());
              expect([...ours.toSeq().entrySeq()]).toEqual([
                ...v5.toSeq().entrySeq(),
              ]);
            }
          );
        }),
        { numRuns: 150 }
      )
    ).not.toThrow();
  });
});
