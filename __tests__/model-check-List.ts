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

class ConcatCommand implements Command<Model, Real> {
  constructor(readonly values: number[]) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.arr.push(...this.values);
    r.list = r.list.concat(List(this.values));
    assertEquiv(m, r);
  }
  toString() {
    return `concat([${this.values}])`;
  }
}

class SpliceCommand implements Command<Model, Real> {
  constructor(
    readonly index: number,
    readonly removeNum: number,
    readonly values: number[]
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
    return `splice(${this.index}, ${this.removeNum}, [${this.values}])`;
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
        m.arr.push(undefined as unknown as number);
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
    const fn = (v: number | undefined) => (v ?? 0) + 1;
    m.arr[idx] = fn(m.arr[idx]);
    r.list = r.list.update(idx, fn);
    assertEquiv(m, r);
  }
  toString() {
    return `update(${this.index}, v => v + 1)`;
  }
}

class SortCommand implements Command<Model, Real> {
  check(m: Readonly<Model>) {
    // Avoid sorting when undefined values exist (from setSize) because
    // Array.sort moves empty slots to the end regardless of comparator,
    // while List.sort passes undefined through the comparator.
    return m.arr.length > 0 && m.arr.every((v) => v !== undefined);
  }
  run(m: Model, r: Real) {
    const cmp = (a: number, b: number) => a - b;
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
    const fn = (v: number) => (v ?? 0) * 2;
    m.arr = m.arr.map(fn);
    r.list = r.list.map(fn);
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
    const fn = (v: number) => (v ?? 0) % 2 === 0;
    m.arr = m.arr.filter(fn);
    r.list = r.list.filter(fn);
    assertEquiv(m, r);
  }
  toString() {
    return 'filter(v => v % 2 === 0)';
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
  fc.array(fc.integer(), { maxLength: 10 }).map((v) => new ConcatCommand(v)),
  fc
    .integer()
    .chain((idx) =>
      fc
        .nat({ max: 5 })
        .chain((rem) =>
          fc
            .array(fc.integer(), { maxLength: 5 })
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
