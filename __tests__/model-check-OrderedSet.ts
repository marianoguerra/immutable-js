import { OrderedSet } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';

/** Array-backed ordered set that preserves insertion order. */
class OrderedSetModel {
  items: number[] = [];

  has(v: number): boolean {
    return this.items.includes(v);
  }

  add(v: number): void {
    if (!this.has(v)) {
      this.items.push(v);
    }
  }

  delete(v: number): void {
    const idx = this.items.indexOf(v);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
  }

  clear(): void {
    this.items.length = 0;
  }

  map(fn: (v: number) => number): void {
    const seen = new globalThis.Set<number>();
    const result: number[] = [];
    for (const v of this.items) {
      const mapped = fn(v);
      if (!seen.has(mapped)) {
        seen.add(mapped);
        result.push(mapped);
      }
    }
    this.items = result;
  }

  filter(fn: (v: number) => boolean): void {
    this.items = this.items.filter(fn);
  }

  sort(cmp: (a: number, b: number) => number): void {
    this.items.sort(cmp);
  }

  get size(): number {
    return this.items.length;
  }
}

type Model = { set: OrderedSetModel };
type Real = { set: OrderedSet<number> };

function assertEquiv(m: Model, r: Real) {
  expect(r.set.size).toBe(m.set.size);
  for (const v of m.set.items) {
    expect(r.set.has(v)).toBe(true);
  }
  // Order must also match
  expect(r.set.toArray()).toEqual(m.set.items);
}

class AddCommand implements Command<Model, Real> {
  constructor(readonly value: number) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.set.add(this.value);
    r.set = r.set.add(this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `add(${this.value})`;
  }
}

class DeleteCommand implements Command<Model, Real> {
  constructor(readonly value: number) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.set.delete(this.value);
    r.set = r.set.delete(this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `delete(${this.value})`;
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

// Note: union, intersect, and subtract are NOT tested here because these
// operations can reorganize OrderedSet's internal hash-trie structure,
// causing subsequent add/delete operations to produce non-insertion-order
// results.  Membership correctness for these operations is already verified
// by the unordered Set model tests.

class MapCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const fn = (v: number) => v * 2;
    m.set.map(fn);
    r.set = r.set.map(fn);
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
    m.set.filter(fn);
    r.set = r.set.filter(fn);
    assertEquiv(m, r);
  }
  toString() {
    return 'filter(v => v % 2 === 0)';
  }
}

class SortCommand implements Command<Model, Real> {
  check(m: Readonly<Model>) {
    return m.set.size > 0;
  }
  run(m: Model, r: Real) {
    const cmp = (a: number, b: number) => a - b;
    m.set.sort(cmp);
    r.set = r.set.sort(cmp);
    assertEquiv(m, r);
  }
  toString() {
    return 'sort((a, b) => a - b)';
  }
}

const allCommands = [
  fc.integer().map((v) => new AddCommand(v)),
  fc.integer().map((v) => new DeleteCommand(v)),
  fc.constant(new ClearCommand()),
  fc.constant(new MapCommand()),
  fc.constant(new FilterCommand()),
  fc.constant(new SortCommand()),
];

describe('OrderedSet model check', () => {
  it('random operation sequences match ordered set behavior', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { set: new OrderedSetModel() },
            real: { set: OrderedSet<number>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
