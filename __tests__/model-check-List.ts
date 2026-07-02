import { List } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';
import {
  type RichValue,
  richValueArb,
  isSortableNumber,
  assertSame,
  show,
} from './utils/model-check-common';

type Model = { arr: RichValue[] };
type Real = {
  list: List<RichValue>;
  prev?: { list: List<RichValue>; arr: RichValue[] };
};

// Deterministic total functions shared by model and real collection.
const inc = (v: RichValue): RichValue => (typeof v === 'number' ? v + 1 : 1);
const dbl = (v: RichValue): RichValue => (typeof v === 'number' ? v * 2 : v);
const isEven = (v: RichValue): boolean =>
  typeof v === 'number' && v % 2 === 0;

function assertEquiv(m: Model, r: Real) {
  const arr = m.arr;
  expect(r.list.size).toBe(arr.length);
  expect(r.list.toArray()).toEqual(arr);
  // Exercise the iterator protocol, not just toArray
  expect([...r.list.values()]).toEqual(arr);
  expect([...r.list.keys()]).toEqual(arr.map((_, i) => i));
  expect([...r.list.entries()]).toEqual(arr.map((v, i) => [i, v]));
  expect(r.list.reverse().toArray()).toEqual([...arr].reverse());
  // Persistence: the version snapshotted before this command ran must be
  // unchanged by the operation that just produced r.list.
  if (r.prev) {
    expect(r.prev.list.toArray()).toEqual(r.prev.arr);
  }
  r.prev = { list: r.list, arr: r.list.toArray() };
}

class PushCommand implements Command<Model, Real> {
  constructor(readonly value: RichValue) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.push(this.value);
    r.list = r.list.push(this.value);
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
    m.arr.pop();
    r.list = r.list.pop();
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
    m.arr.unshift(this.value);
    r.list = r.list.unshift(this.value);
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
    m.arr.shift();
    r.list = r.list.shift();
    assertEquiv(m, r);
  }
  toString() {
    return 'shift()';
  }
}

// Raw set() with any integer (or NaN) index, encoding List's real
// semantics: NaN is a no-op, negative indices count from the end,
// indices past either end auto-extend the list with undefined fill.
class SetRawCommand implements Command<Model, Real> {
  constructor(
    readonly index: number,
    readonly value: RichValue
  ) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    if (!Number.isNaN(this.index)) {
      const len = m.arr.length;
      const i = this.index < 0 ? len + this.index : this.index;
      if (i < 0) {
        // extends at the front: new size = len - i
        m.arr = [
          this.value,
          ...new Array<RichValue>(-i - 1).fill(undefined),
          ...m.arr,
        ];
      } else {
        while (m.arr.length < i) {
          m.arr.push(undefined);
        }
        m.arr[i] = this.value;
      }
    }
    r.list = r.list.set(this.index, this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `set(${this.index}, ${show(this.value)})`;
  }
}

// Raw remove() with any integer index: negative counts from the end,
// out-of-range is a no-op returning the same instance.
class RemoveRawCommand implements Command<Model, Real> {
  constructor(readonly index: number) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const len = m.arr.length;
    const i = this.index < 0 ? len + this.index : this.index;
    const before = r.list;
    if (i >= 0 && i < len) {
      m.arr.splice(i, 1);
    }
    r.list = r.list.remove(this.index);
    if (i < 0 || i >= len) {
      assertSame(r.list, before);
    }
    assertEquiv(m, r);
  }
  toString() {
    return `remove(${this.index})`;
  }
}

// Raw insert() with any integer index: clamped to [0, size].
class InsertRawCommand implements Command<Model, Real> {
  constructor(
    readonly index: number,
    readonly value: RichValue
  ) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const len = m.arr.length;
    const i =
      this.index < 0
        ? Math.max(len + this.index, 0)
        : Math.min(this.index, len);
    m.arr.splice(i, 0, this.value);
    r.list = r.list.insert(this.index, this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `insert(${this.index}, ${show(this.value)})`;
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

class ConcatCommand implements Command<Model, Real> {
  constructor(readonly values: RichValue[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.push(...this.values);
    r.list = r.list.concat(List(this.values));
    assertEquiv(m, r);
  }
  toString() {
    return `concat(${show(this.values)})`;
  }
}

class SpliceCommand implements Command<Model, Real> {
  constructor(
    readonly index: number,
    readonly removeNum: number,
    readonly values: RichValue[]
  ) {}
  check(m: Readonly<Model>) {
    return m.arr.length > 0;
  }
  run(m: Model, r: Real) {
    const len = m.arr.length;
    const idx = ((this.index % len) + len) % len;
    const rem = Math.min(this.removeNum < 0 ? 0 : this.removeNum, len - idx);
    m.arr.splice(idx, rem, ...this.values);
    r.list = r.list.splice(idx, rem, ...this.values);
    assertEquiv(m, r);
  }
  toString() {
    return `splice(${this.index}, ${this.removeNum}, ${show(this.values)})`;
  }
}

class SetSizeCommand implements Command<Model, Real> {
  constructor(readonly size: number) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    // Use explicit undefined fills to avoid sparse array holes.
    // Array.map/filter skip sparse holes, but List treats them as undefined.
    if (this.size > m.arr.length) {
      while (m.arr.length < this.size) {
        m.arr.push(undefined);
      }
    } else {
      m.arr.length = this.size;
    }
    r.list = r.list.setSize(this.size);
    assertEquiv(m, r);
  }
  toString() {
    return `setSize(${this.size})`;
  }
}

class UpdateCommand implements Command<Model, Real> {
  constructor(readonly index: number) {}
  check(m: Readonly<Model>) {
    return m.arr.length > 0;
  }
  run(m: Model, r: Real) {
    const idx = ((this.index % m.arr.length) + m.arr.length) % m.arr.length;
    m.arr[idx] = inc(m.arr[idx]);
    r.list = r.list.update(idx, inc);
    assertEquiv(m, r);
  }
  toString() {
    return `update(${this.index}, inc)`;
  }
}

class SortCommand implements Command<Model, Real> {
  check(m: Readonly<Model>) {
    // Only sort all-number contents: Array.sort moves empty slots/undefined
    // to the end regardless of comparator, while List.sort passes every
    // value through the comparator, and NaN comparators are unstable.
    return m.arr.length > 0 && m.arr.every(isSortableNumber);
  }
  run(m: Model, r: Real) {
    const cmp = (a: RichValue, b: RichValue) =>
      (a as number) - (b as number);
    m.arr.sort(cmp);
    r.list = r.list.sort(cmp);
    assertEquiv(m, r);
  }
  toString() {
    return 'sort()';
  }
}

class ReverseCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.reverse();
    r.list = r.list.reverse();
    assertEquiv(m, r);
  }
  toString() {
    return 'reverse()';
  }
}

class SliceCommand implements Command<Model, Real> {
  constructor(
    readonly begin: number,
    readonly end: number
  ) {}
  check(m: Readonly<Model>) {
    return m.arr.length > 0;
  }
  run(m: Model, r: Real) {
    m.arr = m.arr.slice(this.begin, this.end);
    r.list = r.list.slice(this.begin, this.end);
    assertEquiv(m, r);
  }
  toString() {
    return `slice(${this.begin}, ${this.end})`;
  }
}

class MapCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr = m.arr.map(dbl);
    r.list = r.list.map(dbl);
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
    m.arr = m.arr.filter(isEven);
    r.list = r.list.filter(isEven);
    assertEquiv(m, r);
  }
  toString() {
    return 'filter(isEven)';
  }
}

// A batch of transient mutations; the persistence check in assertEquiv
// verifies the pre-mutation version is untouched.
class WithMutationsCommand implements Command<Model, Real> {
  constructor(readonly values: RichValue[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.push(...this.values);
    if (m.arr.length > 0) {
      m.arr[0] = this.values[0] ?? null;
      m.arr.pop();
    }
    r.list = r.list.withMutations((mut) => {
      for (const v of this.values) {
        mut.push(v);
      }
      if (mut.size > 0) {
        mut.set(0, this.values[0] ?? null);
        mut.pop();
      }
    });
    assertEquiv(m, r);
  }
  toString() {
    return `withMutations(push ${show(this.values)}, set(0), pop)`;
  }
}

const rawIndexArb = fc.oneof(
  { weight: 9, arbitrary: fc.integer({ min: -60, max: 60 }) },
  { weight: 1, arbitrary: fc.constant(NaN) }
);

const allCommands = [
  richValueArb.map((v) => new PushCommand(v)),
  fc.constant(new PopCommand()),
  richValueArb.map((v) => new UnshiftCommand(v)),
  fc.constant(new ShiftCommand()),
  rawIndexArb.chain((idx) =>
    richValueArb.map((v) => new SetRawCommand(idx, v))
  ),
  fc.integer({ min: -60, max: 60 }).map((idx) => new RemoveRawCommand(idx)),
  fc
    .integer({ min: -60, max: 60 })
    .chain((idx) => richValueArb.map((v) => new InsertRawCommand(idx, v))),
  fc.constant(new ClearCommand()),
  fc.array(richValueArb, { maxLength: 10 }).map((v) => new ConcatCommand(v)),
  fc
    .integer()
    .chain((idx) =>
      fc
        .nat({ max: 5 })
        .chain((rem) =>
          fc
            .array(richValueArb, { maxLength: 5 })
            .map((vals) => new SpliceCommand(idx, rem, vals))
        )
    ),
  fc.nat({ max: 50 }).map((n) => new SetSizeCommand(n)),
  fc.integer().map((idx) => new UpdateCommand(idx)),
  fc.constant(new SortCommand()),
  fc.constant(new ReverseCommand()),
  fc
    .integer()
    .chain((begin) => fc.integer().map((end) => new SliceCommand(begin, end))),
  fc.constant(new MapCommand()),
  fc.constant(new FilterCommand()),
  fc
    .array(richValueArb, { maxLength: 8 })
    .map((v) => new WithMutationsCommand(v)),
];

describe('List model check', () => {
  it('random operation sequences match Array behavior', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { arr: [] as RichValue[] },
            real: { list: List<RichValue>() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
