import {
  List,
  Map,
  OrderedMap,
  OrderedSet,
  Set,
  Seq,
  Stack,
  is,
  isImmutable,
  isKeyed,
  isOrdered,
  isValueObject,
} from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

describe('isImmutable', () => {
  it('behaves as advertised', () => {
    expect(isImmutable([])).toBe(false);
    expect(isImmutable({})).toBe(false);
    expect(isImmutable(Map())).toBe(true);
    expect(isImmutable(List())).toBe(true);
    expect(isImmutable(Set())).toBe(true);
    expect(isImmutable(Stack())).toBe(true);
    expect(isImmutable(Map().asMutable())).toBe(true);
  });
});

describe('isValueObject', () => {
  it('behaves as advertised', () => {
    expect(isValueObject(null)).toBe(false);
    expect(isValueObject(123)).toBe(false);
    expect(isValueObject('abc')).toBe(false);
    expect(isValueObject([])).toBe(false);
    expect(isValueObject({})).toBe(false);
    expect(isValueObject(Map())).toBe(true);
    expect(isValueObject(List())).toBe(true);
    expect(isValueObject(Set())).toBe(true);
    expect(isValueObject(Stack())).toBe(true);
    expect(isValueObject(Map().asMutable())).toBe(true);
  });

  it('works on custom types', () => {
    class MyValueType {
      v: number;

      constructor(val: number) {
        this.v = val;
      }

      equals(other: MyValueType) {
        return Boolean(other && this.v === other.v);
      }

      hashCode() {
        return this.v;
      }
    }

    expect(isValueObject(new MyValueType(123))).toBe(true);
    expect(is(new MyValueType(123), new MyValueType(123))).toBe(true);
    expect(Set().add(new MyValueType(123)).add(new MyValueType(123)).size).toBe(
      1
    );
  });
});

describe('property-based tests', () => {
  const genCollection = fc.oneof(
    fc.array(fc.integer(), { maxLength: 10 }).map((arr) => List(arr)),
    fc.array(fc.integer(), { maxLength: 10 }).map((arr) => Set(arr)),
    fc
      .array(fc.tuple(fc.string({ maxLength: 5 }), fc.integer()), {
        maxLength: 10,
      })
      .map((entries) => Map(entries)),
    fc.array(fc.integer(), { maxLength: 10 }).map((arr) => Stack(arr)),
    fc
      .array(fc.tuple(fc.string({ maxLength: 5 }), fc.integer()), {
        maxLength: 10,
      })
      .map((entries) => OrderedMap(entries)),
    fc.array(fc.integer(), { maxLength: 10 }).map((arr) => OrderedSet(arr))
  );

  it('isImmutable is true for all collection types', () => {
    fc.assert(
      fc.property(genCollection, (coll) => {
        expect(isImmutable(coll)).toBe(true);
      })
    );
  });

  it('isKeyed is true for Maps, not Lists', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 10 }),
        fc.array(fc.tuple(fc.string({ maxLength: 5 }), fc.integer()), {
          maxLength: 10,
        }),
        (arr, entries) => {
          expect(isKeyed(Map(entries))).toBe(true);
          expect(isKeyed(OrderedMap(entries))).toBe(true);
          expect(isKeyed(List(arr))).toBe(false);
          expect(isKeyed(Set(arr))).toBe(false);
          expect(isKeyed(Stack(arr))).toBe(false);
        }
      )
    );
  });

  it('isOrdered is true for ordered types', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 10 }),
        fc.array(fc.tuple(fc.string({ maxLength: 5 }), fc.integer()), {
          maxLength: 10,
        }),
        (arr, entries) => {
          expect(isOrdered(OrderedMap(entries))).toBe(true);
          expect(isOrdered(OrderedSet(arr))).toBe(true);
          expect(isOrdered(List(arr))).toBe(true);
          expect(isOrdered(Seq(arr))).toBe(true);
          expect(isOrdered(Map(entries))).toBe(false);
          expect(isOrdered(Set(arr))).toBe(false);
        }
      )
    );
  });
});
