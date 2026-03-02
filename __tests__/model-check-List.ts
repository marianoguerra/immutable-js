import { List } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';

type Model = { arr: number[] };
type Real = { list: List<number> };

function assertEquiv(m: Model, r: Real) {
  expect(r.list.toArray()).toEqual(m.arr);
}

class PushCommand implements Command<Model, Real> {
  constructor(readonly value: number) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.push(this.value);
    r.list = r.list.push(this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `push(${this.value})`;
  }
}

class PopCommand implements Command<Model, Real> {
  check(m: Readonly<Model>) {
    return m.arr.length > 0;
  }
  run(m: Model, r: Real) {
    m.arr.pop();
    r.list = r.list.pop();
    assertEquiv(m, r);
  }
  toString() {
    return 'pop()';
  }
}

class UnshiftCommand implements Command<Model, Real> {
  constructor(readonly value: number) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.unshift(this.value);
    r.list = r.list.unshift(this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `unshift(${this.value})`;
  }
}

class ShiftCommand implements Command<Model, Real> {
  check(m: Readonly<Model>) {
    return m.arr.length > 0;
  }
  run(m: Model, r: Real) {
    m.arr.shift();
    r.list = r.list.shift();
    assertEquiv(m, r);
  }
  toString() {
    return 'shift()';
  }
}

class SetCommand implements Command<Model, Real> {
  constructor(
    readonly index: number,
    readonly value: number
  ) {}
  check(m: Readonly<Model>) {
    return m.arr.length > 0;
  }
  run(m: Model, r: Real) {
    const idx = ((this.index % m.arr.length) + m.arr.length) % m.arr.length;
    m.arr[idx] = this.value;
    r.list = r.list.set(idx, this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `set(${this.index}, ${this.value})`;
  }
}

class DeleteCommand implements Command<Model, Real> {
  constructor(readonly index: number) {}
  check(m: Readonly<Model>) {
    return m.arr.length > 0;
  }
  run(m: Model, r: Real) {
    const idx = ((this.index % m.arr.length) + m.arr.length) % m.arr.length;
    m.arr.splice(idx, 1);
    r.list = r.list.delete(idx);
    assertEquiv(m, r);
  }
  toString() {
    return `delete(${this.index})`;
  }
}

class InsertCommand implements Command<Model, Real> {
  constructor(
    readonly index: number,
    readonly value: number
  ) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const len = m.arr.length;
    // Clamp index to [0, len]
    const idx =
      len === 0 ? 0 : ((this.index % (len + 1)) + (len + 1)) % (len + 1);
    m.arr.splice(idx, 0, this.value);
    r.list = r.list.insert(idx, this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `insert(${this.index}, ${this.value})`;
  }
}

class ClearCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.length = 0;
    r.list = r.list.clear();
    assertEquiv(m, r);
  }
  toString() {
    return 'clear()';
  }
}

const allCommands = [
  fc.integer().map((v) => new PushCommand(v)),
  fc.constant(new PopCommand()),
  fc.integer().map((v) => new UnshiftCommand(v)),
  fc.constant(new ShiftCommand()),
  fc.integer().chain((idx) => fc.integer().map((v) => new SetCommand(idx, v))),
  fc.integer().map((idx) => new DeleteCommand(idx)),
  fc
    .integer()
    .chain((idx) => fc.integer().map((v) => new InsertCommand(idx, v))),
  fc.constant(new ClearCommand()),
];

describe('List model check', () => {
  it('random operation sequences match Array behavior', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { arr: [] as number[] },
            real: { list: List<number>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
