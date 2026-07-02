import { Set } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';
import {
  type RichKey,
  richKeyArb,
  assertSame,
  show,
} from './utils/model-check-common';

// Native Set is a valid oracle: SameValueZero membership (NaN≡NaN, no -0
// generated) matches Immutable's is() for primitives, and CollidingKey
// uses identity equality.
type Model = { set: globalThis.Set<RichKey> };
type Real = {
  set: Set<RichKey>;
  prev?: { set: Set<RichKey>; items: RichKey[] };
};

const dbl = (v: RichKey): RichKey => (typeof v === 'number' ? v * 2 : v);
const isEven = (v: RichKey): boolean =>
  typeof v === 'number' && v % 2 === 0;

function assertEquiv(m: Model, r: Real) {
  expect(r.set.size).toBe(m.set.size);
  for (const v of m.set) {
    expect(r.set.has(v)).toBe(true);
  }
  // Exercise the iterator protocol, not just has()
  const realItems = [...r.set.values()];
  expect(realItems.length).toBe(m.set.size);
  for (const v of realItems) {
    expect(m.set.has(v)).toBe(true);
  }
  expect(r.set.toArray()).toEqual(realItems);
  // Persistence: the previous version must be unchanged.
  if (r.prev) {
    expect(r.prev.set.toArray()).toEqual(r.prev.items);
  }
  r.prev = { set: r.set, items: r.set.toArray() };
}

class AddCommand implements Command<Model, Real> {
  constructor(readonly value: RichKey) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.set.add(this.value);
    r.set = r.set.add(this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `add(${show(this.value)})`;
  }
}

class DeleteCommand implements Command<Model, Real> {
  constructor(readonly value: RichKey) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const missing = !m.set.has(this.value);
    const before = r.set;
    m.set.delete(this.value);
    r.set = r.set.delete(this.value);
    if (missing) {
      // Deleting an absent member returns the same instance.
      assertSame(r.set, before);
    }
    assertEquiv(m, r);
  }
  toString() {
    return `delete(${show(this.value)})`;
  }
}

class ClearCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.set.clear();
    r.set = r.set.clear();
    assertEquiv(m, r);
  }
  toString() {
    return 'clear()';
  }
}

class UnionCommand implements Command<Model, Real> {
  constructor(readonly values: RichKey[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    for (const v of this.values) {
      m.set.add(v);
    }
    r.set = r.set.union(this.values);
    assertEquiv(m, r);
  }
  toString() {
    return `union(${show(this.values)})`;
  }
}

class IntersectCommand implements Command<Model, Real> {
  constructor(readonly values: RichKey[]) {}
  check(m: Readonly<Model>) {
    return m.set.size > 0;
  }
  run(m: Model, r: Real) {
    const other = new globalThis.Set(this.values);
    for (const v of m.set) {
      if (!other.has(v)) {
        m.set.delete(v);
      }
    }
    r.set = r.set.intersect(this.values);
    assertEquiv(m, r);
  }
  toString() {
    return `intersect(${show(this.values)})`;
  }
}

class SubtractCommand implements Command<Model, Real> {
  constructor(readonly values: RichKey[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    for (const v of this.values) {
      m.set.delete(v);
    }
    r.set = r.set.subtract(this.values);
    assertEquiv(m, r);
  }
  toString() {
    return `subtract(${show(this.values)})`;
  }
}

class MapCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const newModel = new globalThis.Set<RichKey>();
    for (const v of m.set) {
      newModel.add(dbl(v));
    }
    m.set = newModel;
    r.set = r.set.map(dbl);
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
    const newModel = new globalThis.Set<RichKey>();
    for (const v of m.set) {
      if (isEven(v)) {
        newModel.add(v);
      }
    }
    m.set = newModel;
    r.set = r.set.filter(isEven);
    assertEquiv(m, r);
  }
  toString() {
    return 'filter(isEven)';
  }
}

class WithMutationsCommand implements Command<Model, Real> {
  constructor(readonly values: RichKey[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    for (const v of this.values) {
      m.set.add(v);
    }
    if (this.values.length > 0) {
      m.set.delete(this.values[0]!);
    }
    r.set = r.set.withMutations((mut) => {
      for (const v of this.values) {
        mut.add(v);
      }
      if (this.values.length > 0) {
        mut.delete(this.values[0]!);
      }
    });
    assertEquiv(m, r);
  }
  toString() {
    return `withMutations(add ${show(this.values)}, delete first)`;
  }
}

const smallArray = fc.array(richKeyArb, { maxLength: 10 });

const allCommands = [
  richKeyArb.map((v) => new AddCommand(v)),
  richKeyArb.map((v) => new DeleteCommand(v)),
  fc.constant(new ClearCommand()),
  smallArray.map((v) => new UnionCommand(v)),
  smallArray.map((v) => new IntersectCommand(v)),
  smallArray.map((v) => new SubtractCommand(v)),
  fc.constant(new MapCommand()),
  fc.constant(new FilterCommand()),
  smallArray.map((v) => new WithMutationsCommand(v)),
];

describe('Set model check', () => {
  it('random operation sequences match native Set behavior', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { set: new globalThis.Set<RichKey>() },
            real: { set: Set<RichKey>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
