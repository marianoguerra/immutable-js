import { OrderedSet } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';
import {
  type RichValue,
  richValueArb,
  isSortableNumber,
  show,
} from './utils/model-check-common';

const dbl = (v: RichValue): RichValue => (typeof v === 'number' ? v * 2 : v);
const isEven = (v: RichValue): boolean =>
  typeof v === 'number' && v % 2 === 0;

/** Array-backed ordered set that preserves insertion order.
 * `includes`/`indexOf` use SameValueZero-ish semantics via a helper so
 * NaN membership behaves like Immutable's is(). */
class OrderedSetModel {
  items: RichValue[] = [];

  private indexOf(v: RichValue): number {
    return this.items.findIndex((x) =>
      typeof x === 'number' && typeof v === 'number'
        ? x === v || (Number.isNaN(x) && Number.isNaN(v))
        : x === v
    );
  }

  has(v: RichValue): boolean {
    return this.indexOf(v) !== -1;
  }

  add(v: RichValue): void {
    if (!this.has(v)) {
      this.items.push(v);
    }
  }

  delete(v: RichValue): void {
    const idx = this.indexOf(v);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
  }

  clear(): void {
    this.items.length = 0;
  }

  /** Receiver order preserved; unseen values appended in argument order. */
  union(values: RichValue[]): void {
    for (const v of values) {
      this.add(v);
    }
  }

  /** Receiver order preserved. */
  intersect(values: RichValue[]): void {
    const other = new OrderedSetModel();
    other.union(values);
    this.items = this.items.filter((v) => other.has(v));
  }

  /** Receiver order preserved. */
  subtract(values: RichValue[]): void {
    const other = new OrderedSetModel();
    other.union(values);
    this.items = this.items.filter((v) => !other.has(v));
  }

  map(fn: (v: RichValue) => RichValue): void {
    const result = new OrderedSetModel();
    for (const v of this.items) {
      result.add(fn(v));
    }
    this.items = result.items;
  }

  filter(fn: (v: RichValue) => boolean): void {
    this.items = this.items.filter(fn);
  }

  sort(cmp: (a: RichValue, b: RichValue) => number): void {
    this.items.sort(cmp);
  }

  get size(): number {
    return this.items.length;
  }
}

type Model = { set: OrderedSetModel };
type Real = {
  set: OrderedSet<RichValue>;
  prev?: { set: OrderedSet<RichValue>; items: RichValue[] };
};

function assertEquiv(m: Model, r: Real) {
  expect(r.set.size).toBe(m.set.size);
  for (const v of m.set.items) {
    expect(r.set.has(v)).toBe(true);
  }
  // Order must also match, through every iterator flavor
  expect(r.set.toArray()).toEqual(m.set.items);
  expect([...r.set.values()]).toEqual(m.set.items);
  expect(r.set.reverse().toArray()).toEqual([...m.set.items].reverse());
  // Persistence: the previous version must be unchanged.
  if (r.prev) {
    expect(r.prev.set.toArray()).toEqual(r.prev.items);
  }
  r.prev = { set: r.set, items: r.set.toArray() };
}

class AddCommand implements Command<Model, Real> {
  constructor(readonly value: RichValue) {}
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
  constructor(readonly value: RichValue) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.set.delete(this.value);
    r.set = r.set.delete(this.value);
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

// Original semantics (verified against immutable v5): union preserves
// receiver order and appends unseen values in argument order; intersect
// and subtract preserve receiver order.
class UnionCommand implements Command<Model, Real> {
  constructor(readonly values: RichValue[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.set.union(this.values);
    r.set = r.set.union(this.values);
    assertEquiv(m, r);
  }
  toString() {
    return `union(${show(this.values)})`;
  }
}

class IntersectCommand implements Command<Model, Real> {
  constructor(readonly values: RichValue[]) {}
  check(m: Readonly<Model>) {
    return m.set.size > 0;
  }
  run(m: Model, r: Real) {
    m.set.intersect(this.values);
    r.set = r.set.intersect(this.values);
    assertEquiv(m, r);
  }
  toString() {
    return `intersect(${show(this.values)})`;
  }
}

class SubtractCommand implements Command<Model, Real> {
  constructor(readonly values: RichValue[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.set.subtract(this.values);
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
    m.set.map(dbl);
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
    m.set.filter(isEven);
    r.set = r.set.filter(isEven);
    assertEquiv(m, r);
  }
  toString() {
    return 'filter(isEven)';
  }
}

class SortCommand implements Command<Model, Real> {
  check(m: Readonly<Model>) {
    return m.set.size > 0 && m.set.items.every(isSortableNumber);
  }
  run(m: Model, r: Real) {
    const cmp = (a: RichValue, b: RichValue) =>
      (a as number) - (b as number);
    m.set.sort(cmp);
    r.set = r.set.sort(cmp);
    assertEquiv(m, r);
  }
  toString() {
    return 'sort((a, b) => a - b)';
  }
}

class WithMutationsCommand implements Command<Model, Real> {
  constructor(readonly values: RichValue[]) {}
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

const smallArray = fc.array(richValueArb, { maxLength: 10 });

const allCommands = [
  richValueArb.map((v) => new AddCommand(v)),
  richValueArb.map((v) => new DeleteCommand(v)),
  fc.constant(new ClearCommand()),
  smallArray.map((v) => new UnionCommand(v)),
  smallArray.map((v) => new IntersectCommand(v)),
  smallArray.map((v) => new SubtractCommand(v)),
  fc.constant(new MapCommand()),
  fc.constant(new FilterCommand()),
  fc.constant(new SortCommand()),
  smallArray.map((v) => new WithMutationsCommand(v)),
];

describe('OrderedSet model check', () => {
  it('random operation sequences match ordered set behavior', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { set: new OrderedSetModel() },
            real: { set: OrderedSet<RichValue>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
