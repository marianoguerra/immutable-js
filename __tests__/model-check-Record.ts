import { Record } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';

const defaults = { a: 0, b: 0, c: 0 };
const MyRecord = Record(defaults);
type MyRecordType = ReturnType<typeof MyRecord>;
const fields = ['a', 'b', 'c'] as const;
type Field = (typeof fields)[number];

type Model = { obj: { a: number; b: number; c: number } };
type Real = { rec: MyRecordType };

function assertEquiv(m: Model, r: Real) {
  for (const f of fields) {
    expect(r.rec.get(f)).toBe(m.obj[f]);
  }
}

class SetCommand implements Command<Model, Real> {
  constructor(
    readonly field: Field,
    readonly value: number
  ) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.obj[this.field] = this.value;
    r.rec = r.rec.set(this.field, this.value);
    assertEquiv(m, r);
  }
  toString() {
    return `set(${this.field}, ${this.value})`;
  }
}

class DeleteCommand implements Command<Model, Real> {
  constructor(readonly field: Field) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.obj[this.field] = defaults[this.field];
    r.rec = r.rec.delete(this.field);
    assertEquiv(m, r);
  }
  toString() {
    return `delete(${this.field})`;
  }
}

class ClearCommand implements Command<Model, Real> {
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.obj = { ...defaults };
    r.rec = r.rec.clear();
    assertEquiv(m, r);
  }
  toString() {
    return 'clear()';
  }
}

class MergeCommand implements Command<Model, Real> {
  constructor(readonly partial: Partial<{ a: number; b: number; c: number }>) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    Object.assign(m.obj, this.partial);
    r.rec = r.rec.merge(this.partial);
    assertEquiv(m, r);
  }
  toString() {
    return `merge(${JSON.stringify(this.partial)})`;
  }
}

class UpdateCommand implements Command<Model, Real> {
  constructor(readonly field: Field) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const fn = (v: number) => v + 1;
    m.obj[this.field] = fn(m.obj[this.field]);
    r.rec = r.rec.update(this.field, fn);
    assertEquiv(m, r);
  }
  toString() {
    return `update(${this.field}, v => v + 1)`;
  }
}

const fieldArb = fc.constantFrom(...fields);
const partialArb = fc.record(
  {
    a: fc.integer(),
    b: fc.integer(),
    c: fc.integer(),
  },
  { requiredKeys: [] }
);

const allCommands = [
  fieldArb.chain((f) => fc.integer().map((v) => new SetCommand(f, v))),
  fieldArb.map((f) => new DeleteCommand(f)),
  fc.constant(new ClearCommand()),
  partialArb.map((p) => new MergeCommand(p)),
  fieldArb.map((f) => new UpdateCommand(f)),
];

describe('Record model check', () => {
  it('random operation sequences match plain object behavior', () => {
    expect(() =>
      fc.assert(
        fc.property(fc.commands(allCommands, { size: 'medium' }), (cmds) => {
          const setup = () => ({
            model: { obj: { ...defaults } },
            real: { rec: MyRecord() },
          });
          fc.modelRun(setup, cmds);
        }),
        { numRuns: 200 }
      )
    ).not.toThrow();
  });
});
