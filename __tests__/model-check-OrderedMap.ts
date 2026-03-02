import { OrderedMap } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';

type Model = { map: globalThis.Map<string, number> };
type Real = { map: OrderedMap<string, number> };

function assertEquiv(m: Model, r: Real) {
  expect(r.map.size).toBe(m.map.size);
  // Key-value equality
  for (const [k, v] of m.map) {
    expect(r.map.get(k)).toBe(v);
  }
  // Order equality — JS Map preserves insertion order and keeps
  // original position on update, same as OrderedMap
  const modelEntries = [...m.map.entries()];
  const realEntries = [...r.map.entries()];
  expect(realEntries).toEqual(modelEntries);
}

class SetCommand implements Command<Model, Real> {
  constructor(
    readonly key: string,
    readonly value: number
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
    return `set(${JSON.stringify(this.key)}, ${this.value})`;
  }
}

class DeleteCommand implements Command<Model, Real> {
  constructor(readonly key: string) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.map.delete(this.key);
    r.map = r.map.delete(this.key);
    assertEquiv(m, r);
  }
  toString() {
    return `delete(${JSON.stringify(this.key)})`;
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
  constructor(readonly entries: [string, number][]) {}
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
    return `merge(${JSON.stringify(this.entries)})`;
  }
}

class MergeWithCommand implements Command<Model, Real> {
  constructor(readonly entries: [string, number][]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const merger = (oldVal: number, newVal: number) => oldVal + newVal;
    // Deduplicate entries (last value wins) to match Immutable's behavior
    // of converting the argument to a collection first.
    const deduped = new globalThis.Map(this.entries);
    for (const [k, v] of deduped) {
      const existing = m.map.get(k);
      m.map.set(k, existing !== undefined ? merger(existing, v) : v);
    }
    r.map = r.map.mergeWith(merger, this.entries);
    assertEquiv(m, r);
  }
  toString() {
    return `mergeWith((a,b) => a+b, ${JSON.stringify(this.entries)})`;
  }
}

class DeleteAllCommand implements Command<Model, Real> {
  constructor(readonly keys: string[]) {}
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
    return `deleteAll(${JSON.stringify(this.keys)})`;
  }
}

class UpdateCommand implements Command<Model, Real> {
  constructor(readonly key: string) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const fn = (v: number | undefined) => (v ?? 0) + 1;
    m.map.set(this.key, fn(m.map.get(this.key)));
    r.map = r.map.update(this.key, fn);
    assertEquiv(m, r);
  }
  toString() {
    return `update(${JSON.stringify(this.key)}, v => v + 1)`;
  }
}

class MapValuesCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const fn = (v: number) => v * 2;
    const newModel = new globalThis.Map<string, number>();
    for (const [k, v] of m.map) {
      newModel.set(k, fn(v));
    }
    m.map = newModel;
    r.map = r.map.map(fn);
    assertEquiv(m, r);
  }
  toString() {
    return 'map(v => v * 2)';
  }
}

class FilterCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const fn = (v: number) => v % 2 === 0;
    const newModel = new globalThis.Map<string, number>();
    for (const [k, v] of m.map) {
      if (fn(v)) {
        newModel.set(k, v);
      }
    }
    m.map = newModel;
    r.map = r.map.filter(fn);
    assertEquiv(m, r);
  }
  toString() {
    return 'filter(v => v % 2 === 0)';
  }
}

class SortCommand implements Command<Model, Real> {
  check(m: Readonly<Model>) {
    return m.map.size > 0;
  }
  run(m: Model, r: Real) {
    const cmp = (a: number, b: number) => a - b;
    const sorted = [...m.map.entries()].sort((a, b) => cmp(a[1], b[1]));
    m.map = new globalThis.Map(sorted);
    r.map = r.map.sort(cmp);
    assertEquiv(m, r);
  }
  toString() {
    return 'sort((a, b) => a - b)';
  }
}

const keyArb = fc.string({ maxLength: 5 });
const smallEntries = fc.array(fc.tuple(keyArb, fc.integer()), { maxLength: 5 });
// MergeWith needs unique keys to avoid complex dedup-vs-fold interactions
const uniqueKeyEntries = smallEntries.map((entries) => [
  ...new globalThis.Map(entries).entries(),
]);

const allCommands = [
  keyArb.chain((k) => fc.integer().map((v) => new SetCommand(k, v))),
  keyArb.map((k) => new DeleteCommand(k)),
  fc.constant(new ClearCommand()),
  smallEntries.map((entries) => new MergeCommand(entries)),
  uniqueKeyEntries.map((entries) => new MergeWithCommand(entries)),
  fc.array(keyArb, { maxLength: 5 }).map((keys) => new DeleteAllCommand(keys)),
  keyArb.map((k) => new UpdateCommand(k)),
  fc.constant(new MapValuesCommand()),
  fc.constant(new FilterCommand()),
  fc.constant(new SortCommand()),
];

describe('OrderedMap model check', () => {
  it('random operation sequences match native Map behavior (including order)', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { map: new globalThis.Map<string, number>() },
            real: { map: OrderedMap<string, number>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
