import { OrderedMap } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';
import {
  type RichKey,
  type RichValue,
  richKeyArb,
  richValueArb,
  isSortableNumber,
  assertSame,
  show,
} from './utils/model-check-common';

// Native Map preserves insertion order and keeps original position on
// update, same as OrderedMap; SameValueZero key equality matches is()
// for the generated key domain.
type Model = { map: globalThis.Map<RichKey, RichValue> };
type Real = {
  map: OrderedMap<RichKey, RichValue>;
  prev?: {
    map: OrderedMap<RichKey, RichValue>;
    entries: [RichKey, RichValue][];
  };
};

const inc = (v: RichValue): RichValue => (typeof v === 'number' ? v + 1 : 1);
const dbl = (v: RichValue): RichValue => (typeof v === 'number' ? v * 2 : v);
const isEven = (v: RichValue): boolean =>
  typeof v === 'number' && v % 2 === 0;

function assertEquiv(m: Model, r: Real) {
  expect(r.map.size).toBe(m.map.size);
  for (const [k, v] of m.map) {
    expect(r.map.get(k)).toBe(v);
  }
  // Full ordered equality, through every iterator flavor
  const modelEntries = [...m.map.entries()];
  expect([...r.map.entries()]).toEqual(modelEntries);
  expect([...r.map.keys()]).toEqual(modelEntries.map((e) => e[0]));
  expect([...r.map.values()]).toEqual(modelEntries.map((e) => e[1]));
  expect([...r.map.reverse().entries()]).toEqual(
    [...modelEntries].reverse()
  );
  // Persistence: the previous version must be unchanged.
  if (r.prev) {
    expect([...r.prev.map.entries()]).toEqual(r.prev.entries);
  }
  r.prev = { map: r.map, entries: [...r.map.entries()] };
}

class SetCommand implements Command<Model, Real> {
  constructor(
    readonly key: RichKey,
    readonly value: RichValue
  ) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.map.set(this.key, this.value);
    r.map = r.map.set(this.key, this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `set(${show(this.key)}, ${show(this.value)})`;
  }
}

class DeleteCommand implements Command<Model, Real> {
  constructor(readonly key: RichKey) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const missing = !m.map.has(this.key);
    const before = r.map;
    m.map.delete(this.key);
    r.map = r.map.delete(this.key);
    if (missing) {
      assertSame(r.map, before);
    }
    assertEquiv(m, r);
  }
  toString() {
    return `delete(${show(this.key)})`;
  }
}

class ClearCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.map.clear();
    r.map = r.map.clear();
    assertEquiv(m, r);
  }
  toString() {
    return 'clear()';
  }
}

class MergeCommand implements Command<Model, Real> {
  constructor(readonly entries: [RichKey, RichValue][]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    for (const [k, v] of this.entries) {
      m.map.set(k, v);
    }
    r.map = r.map.merge(this.entries);
    assertEquiv(m, r);
  }
  toString() {
    return `merge(${show(this.entries)})`;
  }
}

class MergeWithCommand implements Command<Model, Real> {
  constructor(readonly entries: [RichKey, RichValue][]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const merger = (oldVal: RichValue, newVal: RichValue): RichValue =>
      typeof oldVal === 'number' && typeof newVal === 'number'
        ? oldVal + newVal
        : newVal;
    // Deduplicate entries (last value wins) to match Immutable's behavior
    // of converting the argument to a collection first.
    const deduped = new globalThis.Map(this.entries);
    for (const [k, v] of deduped) {
      m.map.set(k, m.map.has(k) ? merger(m.map.get(k), v) : v);
    }
    r.map = r.map.mergeWith(merger, this.entries);
    assertEquiv(m, r);
  }
  toString() {
    return `mergeWith(add, ${show(this.entries)})`;
  }
}

class DeleteAllCommand implements Command<Model, Real> {
  constructor(readonly keys: RichKey[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    for (const k of this.keys) {
      m.map.delete(k);
    }
    r.map = r.map.deleteAll(this.keys);
    assertEquiv(m, r);
  }
  toString() {
    return `deleteAll(${show(this.keys)})`;
  }
}

class UpdateCommand implements Command<Model, Real> {
  constructor(readonly key: RichKey) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.map.set(this.key, inc(m.map.get(this.key)));
    r.map = r.map.update(this.key, inc);
    assertEquiv(m, r);
  }
  toString() {
    return `update(${show(this.key)}, inc)`;
  }
}

class MapValuesCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const newModel = new globalThis.Map<RichKey, RichValue>();
    for (const [k, v] of m.map) {
      newModel.set(k, dbl(v));
    }
    m.map = newModel;
    r.map = r.map.map(dbl);
    assertEquiv(m, r);
  }
  toString() {
    return 'map(dbl)';
  }
}

class FilterCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const newModel = new globalThis.Map<RichKey, RichValue>();
    for (const [k, v] of m.map) {
      if (isEven(v)) {
        newModel.set(k, v);
      }
    }
    m.map = newModel;
    r.map = r.map.filter(isEven);
    assertEquiv(m, r);
  }
  toString() {
    return 'filter(isEven)';
  }
}

class SortCommand implements Command<Model, Real> {
  check(m: Readonly<Model>) {
    return m.map.size > 0 && [...m.map.values()].every(isSortableNumber);
  }
  run(m: Model, r: Real) {
    const cmp = (a: RichValue, b: RichValue) =>
      (a as number) - (b as number);
    // Array.sort is stable, matching Immutable's index tie-breaking.
    const sorted = [...m.map.entries()].sort((a, b) => cmp(a[1], b[1]));
    m.map = new globalThis.Map(sorted);
    r.map = r.map.sort(cmp);
    assertEquiv(m, r);
  }
  toString() {
    return 'sort((a, b) => a - b)';
  }
}

class WithMutationsCommand implements Command<Model, Real> {
  constructor(readonly entries: [RichKey, RichValue][]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    for (const [k, v] of this.entries) {
      m.map.set(k, v);
    }
    if (this.entries.length > 0) {
      m.map.delete(this.entries[0]![0]);
    }
    r.map = r.map.withMutations((mut) => {
      for (const [k, v] of this.entries) {
        mut.set(k, v);
      }
      if (this.entries.length > 0) {
        mut.delete(this.entries[0]![0]);
      }
    });
    assertEquiv(m, r);
  }
  toString() {
    return `withMutations(set ${show(this.entries)}, delete first)`;
  }
}

const smallEntries = fc.array(fc.tuple(richKeyArb, richValueArb), {
  maxLength: 5,
});
// MergeWith needs unique keys to avoid complex dedup-vs-fold interactions
const uniqueKeyEntries = smallEntries.map((entries) => [
  ...new globalThis.Map(entries).entries(),
]);

const allCommands = [
  richKeyArb.chain((k) => richValueArb.map((v) => new SetCommand(k, v))),
  richKeyArb.map((k) => new DeleteCommand(k)),
  fc.constant(new ClearCommand()),
  smallEntries.map((entries) => new MergeCommand(entries)),
  uniqueKeyEntries.map((entries) => new MergeWithCommand(entries)),
  fc
    .array(richKeyArb, { maxLength: 5 })
    .map((keys) => new DeleteAllCommand(keys)),
  richKeyArb.map((k) => new UpdateCommand(k)),
  fc.constant(new MapValuesCommand()),
  fc.constant(new FilterCommand()),
  fc.constant(new SortCommand()),
  smallEntries.map((entries) => new WithMutationsCommand(entries)),
];

describe('OrderedMap model check', () => {
  it('random operation sequences match native Map behavior (including order)', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { map: new globalThis.Map<RichKey, RichValue>() },
            real: { map: OrderedMap<RichKey, RichValue>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
