import { Set } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';

type Model = { set: globalThis.Set<number> };
type Real = { set: Set<number> };

function assertEquiv(m: Model, r: Real) {
  expect(r.set.size).toBe(m.set.size);
  for (const v of m.set) {
    expect(r.set.has(v)).toBe(true);
  }
  for (const v of r.set) {
    expect(m.set.has(v)).toBe(true);
  }
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

class UnionCommand implements Command<Model, Real> {
  constructor(readonly values: number[]) {}
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
    return `union([${this.values}])`;
  }
}

class IntersectCommand implements Command<Model, Real> {
  constructor(readonly values: number[]) {}
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
    return `intersect([${this.values}])`;
  }
}

class SubtractCommand implements Command<Model, Real> {
  constructor(readonly values: number[]) {}
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
    return `subtract([${this.values}])`;
  }
}

class MapCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const fn = (v: number) => v * 2;
    const newModel = new globalThis.Set<number>();
    for (const v of m.set) {
      newModel.add(fn(v));
    }
    m.set = newModel;
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
    const newModel = new globalThis.Set<number>();
    for (const v of m.set) {
      if (fn(v)) {
        newModel.add(v);
      }
    }
    m.set = newModel;
    r.set = r.set.filter(fn);
    assertEquiv(m, r);
  }
  toString() {
    return 'filter(v => v % 2 === 0)';
  }
}

const smallArray = fc.array(fc.integer(), { maxLength: 10 });

const allCommands = [
  fc.integer().map((v) => new AddCommand(v)),
  fc.integer().map((v) => new DeleteCommand(v)),
  fc.constant(new ClearCommand()),
  smallArray.map((v) => new UnionCommand(v)),
  smallArray.map((v) => new IntersectCommand(v)),
  smallArray.map((v) => new SubtractCommand(v)),
  fc.constant(new MapCommand()),
  fc.constant(new FilterCommand()),
];

describe('Set model check', () => {
  it('random operation sequences match native Set behavior', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { set: new globalThis.Set<number>() },
            real: { set: Set<number>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
