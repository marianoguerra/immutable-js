import { Record } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc, { type Command } from 'fast-check';
import { assertSame } from './utils/model-check-common';

const defaults = { a: 0, b: 0, c: 0 };
const MyRecord = Record(defaults);
type MyRecordType = ReturnType<typeof MyRecord>;
const fields = ['a', 'b', 'c'] as const;
type Field = (typeof fields)[number];
type Fields = { a: number; b: number; c: number };

type Model = { obj: Fields };
type Real = {
  rec: MyRecordType;
  prev?: { rec: MyRecordType; obj: Fields };
};

function assertEquiv(m: Model, r: Real) {
  for (const f of fields) {
    expect(r.rec.get(f)).toBe(m.obj[f]);
  }
  // toObject drives the RecordSeq iteration path; keys must come back in
  // declaration order.
  expect(r.rec.toObject()).toEqual(m.obj);
  expect(Object.keys(r.rec.toObject())).toEqual([...fields]);
  expect(r.rec.toSeq().entrySeq().toArray()).toEqual(
    fields.map((f) => [f, m.obj[f]])
  );
  // Value equality and hashCode must agree with a freshly-built record,
  // regardless of which fields are stored vs defaulted internally.
  const fresh = MyRecord(m.obj);
  expect(r.rec.equals(fresh)).toBe(true);
  expect(fresh.equals(r.rec)).toBe(true);
  expect(r.rec.hashCode()).toBe(fresh.hashCode());
  // Persistence: the previous version must be unchanged.
  if (r.prev) {
    expect(r.prev.rec.toObject()).toEqual(r.prev.obj);
  }
  r.prev = { rec: r.rec, obj: r.rec.toObject() };
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

// Setting a field to its default value: stored internally as undefined,
// but must remain observably identical to a record that never set it.
class SetToDefaultCommand implements Command<Model, Real> {
  constructor(readonly field: Field) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    m.obj[this.field] = defaults[this.field];
    r.rec = r.rec.set(this.field, defaults[this.field]);
    assertEquiv(m, r);
  }
  toString() {
    return `set(${this.field}, <default>)`;
  }
}

// Setting or removing a key the Record does not define is silently
// ignored and returns the same instance.
class SetUnknownKeyCommand implements Command<Model, Real> {
  constructor(readonly value: number) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const before = r.rec;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.rec = (r.rec as any).set('unknownKey', this.value);
    assertSame(r.rec, before);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.rec = (r.rec as any).remove('unknownKey');
    assertSame(r.rec, before);
    assertEquiv(m, r);
  }
  toString() {
    return `set('unknownKey', ${this.value})`;
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
  constructor(readonly partial: Partial<Fields>) {}
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

class WithMutationsCommand implements Command<Model, Real> {
  constructor(readonly partial: Partial<Fields>) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    Object.assign(m.obj, this.partial);
    r.rec = r.rec.withMutations((mut) => {
      for (const [k, v] of Object.entries(this.partial)) {
        mut.set(k as Field, v);
      }
    });
    assertEquiv(m, r);
  }
  toString() {
    return `withMutations(set ${JSON.stringify(this.partial)})`;
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
  fieldArb.map((f) => new SetToDefaultCommand(f)),
  fc.integer().map((v) => new SetUnknownKeyCommand(v)),
  fieldArb.map((f) => new DeleteCommand(f)),
  fc.constant(new ClearCommand()),
  partialArb.map((p) => new MergeCommand(p)),
  fieldArb.map((f) => new UpdateCommand(f)),
  partialArb.map((p) => new WithMutationsCommand(p)),
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
