import { Stack } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';
import {
  type RichValue,
  richValueArb,
  assertSame,
  show,
} from './utils/model-check-common';

// Model array: front = index 0 = top of stack
type Model = { arr: RichValue[] };
type Real = {
  stack: Stack<RichValue>;
  prev?: { stack: Stack<RichValue>; arr: RichValue[] };
};

function assertEquiv(m: Model, r: Real) {
  expect(r.stack.size).toBe(m.arr.length);
  expect(r.stack.toArray()).toEqual(m.arr);
  // Exercise the iterator protocol, forward and reverse (reverse
  // iteration is materialized through a different code path).
  expect([...r.stack.values()]).toEqual(m.arr);
  expect([...r.stack.entries()]).toEqual(m.arr.map((v, i) => [i, v]));
  expect(r.stack.reverse().toArray()).toEqual([...m.arr].reverse());
  // Persistence: the previous version must be unchanged.
  if (r.prev) {
    expect(r.prev.stack.toArray()).toEqual(r.prev.arr);
  }
  r.prev = { stack: r.stack, arr: r.stack.toArray() };
}

function assertPeek(m: Model, r: Real) {
  expect(r.stack.peek()).toBe(m.arr[0]);
}

class PushCommand implements Command<Model, Real> {
  constructor(readonly value: RichValue) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.unshift(this.value);
    r.stack = r.stack.push(this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `push(${show(this.value)})`;
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
  constructor(readonly value: RichValue) {}
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
    return `unshift(${show(this.value)})`;
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

// get(i) walks the linked list; negative indices count from the end,
// out-of-range returns undefined.
class GetCommand implements Command<Model, Real> {
  constructor(readonly index: number) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const len = m.arr.length;
    const i = this.index < 0 ? len + this.index : this.index;
    const expected = i >= 0 && i < len ? m.arr[i] : undefined;
    assertSame(r.stack.get(this.index), expected);
    assertEquiv(m, r);
  }
  toString() {
    return `get(${this.index})`;
  }
}

class PushAllCommand implements Command<Model, Real> {
  constructor(readonly values: RichValue[]) {}
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
    return `pushAll(${show(this.values)})`;
  }
}

// slice(begin) with begin >= 0 and end omitted stays an O(1) prefix drop;
// other slices convert through the generic IndexedCollection path. Both
// must match Array.slice.
class SliceCommand implements Command<Model, Real> {
  constructor(
    readonly begin: number,
    readonly end: number | undefined
  ) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr = m.arr.slice(this.begin, this.end);
    r.stack = r.stack.slice(this.begin, this.end);
    assertEquiv(m, r);
  }
  toString() {
    return `slice(${this.begin}, ${this.end})`;
  }
}

class WithMutationsCommand implements Command<Model, Real> {
  constructor(readonly values: RichValue[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    for (const v of this.values) {
      m.arr.unshift(v);
    }
    if (m.arr.length > 0) {
      m.arr.shift();
    }
    r.stack = r.stack.withMutations((mut) => {
      for (const v of this.values) {
        mut.push(v);
      }
      if (mut.size > 0) {
        mut.pop();
      }
    });
    assertEquiv(m, r);
  }
  toString() {
    return `withMutations(push ${show(this.values)}, pop)`;
  }
}

const allCommands = [
  richValueArb.map((v) => new PushCommand(v)),
  fc.constant(new PopCommand()),
  richValueArb.map((v) => new UnshiftCommand(v)),
  fc.constant(new ShiftCommand()),
  fc.constant(new ClearCommand()),
  fc.constant(new PeekCommand()),
  fc.integer({ min: -40, max: 40 }).map((i) => new GetCommand(i)),
  fc.array(richValueArb, { maxLength: 10 }).map((v) => new PushAllCommand(v)),
  fc
    .integer({ min: -20, max: 20 })
    .chain((begin) =>
      fc
        .option(fc.integer({ min: -20, max: 20 }), { nil: undefined })
        .map((end) => new SliceCommand(begin, end))
    ),
  fc
    .array(richValueArb, { maxLength: 8 })
    .map((v) => new WithMutationsCommand(v)),
];

describe('Stack model check', () => {
  it('random operation sequences match Array-as-stack behavior', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { arr: [] as RichValue[] },
            real: { stack: Stack<RichValue>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
