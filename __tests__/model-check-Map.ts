import { Map } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';

type Model = { map: globalThis.Map<string, number> };
type Real = { map: Map<string, number> };

function assertEquiv(m: Model, r: Real) {
  expect(r.map.size).toBe(m.map.size);
  for (const [k, v] of m.map) {
    expect(r.map.get(k)).toBe(v);
  }
  for (const [k, v] of r.map) {
    expect(m.map.get(k)).toBe(v);
  }
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

const keyArb = fc.string({ maxLength: 5 });

const allCommands = [
  keyArb.chain((k) => fc.integer().map((v) => new SetCommand(k, v))),
  keyArb.map((k) => new DeleteCommand(k)),
  fc.constant(new ClearCommand()),
];

describe('Map model check', () => {
  it('random operation sequences match native Map behavior', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { map: new globalThis.Map<string, number>() },
            real: { map: Map<string, number>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
