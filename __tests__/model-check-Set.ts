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

const allCommands = [
  fc.integer().map((v) => new AddCommand(v)),
  fc.integer().map((v) => new DeleteCommand(v)),
  fc.constant(new ClearCommand()),
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
