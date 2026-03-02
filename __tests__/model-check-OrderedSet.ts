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

const allCommands = [
  fc.integer().map((v) => new AddCommand(v)),
  fc.integer().map((v) => new DeleteCommand(v)),
  fc.constant(new ClearCommand()),
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
