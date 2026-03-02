import { Stack } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';

// Model array: front = index 0 = top of stack
type Model = { arr: number[] };
type Real = { stack: Stack<number> };

function assertEquiv(m: Model, r: Real) {
  expect(r.stack.toArray()).toEqual(m.arr);
}

function assertPeek(m: Model, r: Real) {
  expect(r.stack.peek()).toBe(m.arr[0]);
}

class PushCommand implements Command<Model, Real> {
  constructor(readonly value: number) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.unshift(this.value);
    r.stack = r.stack.push(this.value);
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
    m.arr.shift();
    r.stack = r.stack.pop();
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
    // Stack.unshift is an alias for push (prepends to top)
    m.arr.unshift(this.value);
    r.stack = r.stack.unshift(this.value);
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
    // Stack.shift is an alias for pop (removes from top)
    m.arr.shift();
    r.stack = r.stack.shift();
    assertEquiv(m, r);
  }
  toString() {
    return 'shift()';
  }
}

class ClearCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.length = 0;
    r.stack = r.stack.clear();
    assertEquiv(m, r);
  }
  toString() {
    return 'clear()';
  }
}

class PeekCommand implements Command<Model, Real> {
  check(m: Readonly<Model>) {
    return m.arr.length > 0;
  }
  run(m: Model, r: Real) {
    assertPeek(m, r);
    assertEquiv(m, r);
  }
  toString() {
    return 'peek()';
  }
}

class PushAllCommand implements Command<Model, Real> {
  constructor(readonly values: number[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    // pushAll prepends all values; the first value in the iterable ends up on top
    for (let i = this.values.length - 1; i >= 0; i--) {
      m.arr.unshift(this.values[i]!);
    }
    r.stack = r.stack.pushAll(this.values);
    assertEquiv(m, r);
  }
  toString() {
    return `pushAll([${this.values}])`;
  }
}

const allCommands = [
  fc.integer().map((v) => new PushCommand(v)),
  fc.constant(new PopCommand()),
  fc.integer().map((v) => new UnshiftCommand(v)),
  fc.constant(new ShiftCommand()),
  fc.constant(new ClearCommand()),
  fc.constant(new PeekCommand()),
  fc.array(fc.integer(), { maxLength: 10 }).map((v) => new PushAllCommand(v)),
];

describe('Stack model check', () => {
  it('random operation sequences match Array-as-stack behavior', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { arr: [] as number[] },
            real: { stack: Stack<number>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
