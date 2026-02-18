import { Map, OrderedMap, Range, Seq } from 'immutable';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

describe('OrderedMap', () => {
  it('converts from object', () => {
    const m = OrderedMap({ c: 'C', b: 'B', a: 'A' });
    expect(m.get('a')).toBe('A');
    expect(m.get('b')).toBe('B');
    expect(m.get('c')).toBe('C');
    expect(m.toArray()).toEqual([
      ['c', 'C'],
      ['b', 'B'],
      ['a', 'A'],
    ]);
  });

  it('constructor provides different instances', () => {
    expect(OrderedMap()).not.toBe(OrderedMap());
    expect(OrderedMap()).toEqual(OrderedMap());
    expect(OrderedMap({ a: 'A' })).not.toBe(OrderedMap({ a: 'A' }));
    expect(OrderedMap({ a: 'A' })).toEqual(OrderedMap({ a: 'A' }));
  });

  it('constructor provides initial values', () => {
    const m = OrderedMap({ a: 'A', b: 'B', c: 'C' });
    expect(m.get('a')).toBe('A');
    expect(m.get('b')).toBe('B');
    expect(m.get('c')).toBe('C');
    expect(m.size).toBe(3);
    expect(m.toArray()).toEqual([
      ['a', 'A'],
      ['b', 'B'],
      ['c', 'C'],
    ]);
  });

  it('provides initial values in a mixed order', () => {
    const m = OrderedMap({ c: 'C', b: 'B', a: 'A' });
    expect(m.get('a')).toBe('A');
    expect(m.get('b')).toBe('B');
    expect(m.get('c')).toBe('C');
    expect(m.size).toBe(3);
    expect(m.toArray()).toEqual([
      ['c', 'C'],
      ['b', 'B'],
      ['a', 'A'],
    ]);
  });

  it('constructor accepts sequences', () => {
    const s = Seq({ c: 'C', b: 'B', a: 'A' });
    const m = OrderedMap(s);
    expect(m.get('a')).toBe('A');
    expect(m.get('b')).toBe('B');
    expect(m.get('c')).toBe('C');
    expect(m.size).toBe(3);
    expect(m.toArray()).toEqual([
      ['c', 'C'],
      ['b', 'B'],
      ['a', 'A'],
    ]);
  });

  it('maintains order when new keys are set', () => {
    const m = OrderedMap()
      .set('A', 'aardvark')
      .set('Z', 'zebra')
      .set('A', 'antelope');
    expect(m.size).toBe(2);
    expect(m.toArray()).toEqual([
      ['A', 'antelope'],
      ['Z', 'zebra'],
    ]);
  });

  it('resets order when a keys is deleted', () => {
    const m = OrderedMap()
      .set('A', 'aardvark')
      .set('Z', 'zebra')
      .remove('A')
      .set('A', 'antelope');
    expect(m.size).toBe(2);
    expect(m.toArray()).toEqual([
      ['Z', 'zebra'],
      ['A', 'antelope'],
    ]);
  });

  it('removes correctly', () => {
    const m = OrderedMap({
      A: 'aardvark',
      Z: 'zebra',
    }).remove('A');
    expect(m.size).toBe(1);
    expect(m.get('A')).toBe(undefined);
    expect(m.get('Z')).toBe('zebra');
  });

  it('respects order for equality', () => {
    const m1 = OrderedMap().set('A', 'aardvark').set('Z', 'zebra');
    const m2 = OrderedMap().set('Z', 'zebra').set('A', 'aardvark');
    expect(m1.equals(m2)).toBe(false);
    expect(m1.equals(m2.reverse())).toBe(true);
  });

  it('respects order when merging', () => {
    const m1 = OrderedMap({ A: 'apple', B: 'banana', C: 'coconut' });
    const m2 = OrderedMap({ C: 'chocolate', B: 'butter', D: 'donut' });
    expect(m1.merge(m2).entrySeq().toArray()).toEqual([
      ['A', 'apple'],
      ['B', 'butter'],
      ['C', 'chocolate'],
      ['D', 'donut'],
    ]);
    expect(m2.merge(m1).entrySeq().toArray()).toEqual([
      ['C', 'coconut'],
      ['B', 'banana'],
      ['D', 'donut'],
      ['A', 'apple'],
    ]);
  });

  it('performs deleteAll correctly after resizing internal list', () => {
    // See condition for resizing internal list here:
    // https://github.com/immutable-js/immutable-js/blob/91c7c1e82ec616804768f968cc585565e855c8fd/src/OrderedMap.js#L138

    // Create OrderedMap greater than or equal to SIZE (currently 32)
    const SIZE = 32;
    let map = OrderedMap(Range(0, SIZE).map((key) => [key, 0]));

    // Delete half of the keys so that internal list is twice the size of internal map
    const keysToDelete = Range(0, SIZE / 2);
    map = map.deleteAll(keysToDelete);

    // Delete one more key to trigger resizing
    map = map.deleteAll([SIZE / 2]);

    expect(map.size).toBe(SIZE / 2 - 1);
  });

  it('hashCode should return the same value if the values are the same', () => {
    const m1 = OrderedMap({ b: 'b' });
    const m2 = OrderedMap({ a: 'a', b: 'b' }).remove('a');
    const m3 = OrderedMap({ b: 'b' }).remove('b').set('b', 'b');

    expect(m1.hashCode()).toEqual(m2.hashCode());
    expect(m1.hashCode()).toEqual(m3.hashCode());
  });

  describe('property-based tests', () => {
    it('preserves key insertion order', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ maxLength: 5 }), { maxLength: 50 }),
          (keys) => {
            const entries: Array<[string, number]> = keys.map((k, i) => [k, i]);
            const om = OrderedMap(entries);
            expect(om.keySeq().toArray()).toEqual(keys);
          }
        )
      );
    });

    it('set existing key preserves order', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ maxLength: 5 }), {
            minLength: 1,
            maxLength: 50,
          }),
          fc.integer(),
          (keys, newVal) => {
            if (keys.length === 0) return;
            const entries: Array<[string, number]> = keys.map((k, i) => [k, i]);
            const om = OrderedMap(entries);
            const idx = Math.abs(newVal) % keys.length;
            const updated = om.set(keys[idx]!, 999);
            expect(updated.keySeq().toArray()).toEqual(keys);
          }
        )
      );
    });

    it('filter preserves relative order', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ maxLength: 5 }), { maxLength: 50 }),
          (keys) => {
            const entries: Array<[string, number]> = keys.map((k, i) => [k, i]);
            const om = OrderedMap(entries);
            const filtered = om.filter((v) => v % 2 === 0);
            const expected = keys.filter((_k, i) => i % 2 === 0);
            expect(filtered.keySeq().toArray()).toEqual(expected);
          }
        )
      );
    });

    it('consistency with Map values', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ maxLength: 5 }), { maxLength: 50 }),
          (keys) => {
            const entries: Array<[string, number]> = keys.map((k, i) => [k, i]);
            const om = OrderedMap(entries);
            const m = Map(entries);
            om.forEach((val, key) => {
              expect(m.get(key)).toBe(val);
            });
            expect(om.size).toBe(m.size);
          }
        )
      );
    });

    it('delete-then-set moves key to end', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ maxLength: 5 }), {
            minLength: 2,
            maxLength: 50,
          }),
          (keys) => {
            const entries: Array<[string, number]> = keys.map((k, i) => [k, i]);
            const om = OrderedMap(entries);
            const key = keys[0]!;
            const updated = om.delete(key).set(key, 999);
            expect(updated.keySeq().last()).toBe(key);
          }
        )
      );
    });

    it('merge preserves left order, appends right', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ maxLength: 5 }), { maxLength: 30 }),
          fc.uniqueArray(fc.string({ maxLength: 5 }), { maxLength: 30 }),
          (keysA, keysB) => {
            const entriesA: Array<[string, number]> = keysA.map((k, i) => [
              k,
              i,
            ]);
            const entriesB: Array<[string, number]> = keysB.map((k, i) => [
              k,
              i + 100,
            ]);
            const a = OrderedMap(entriesA);
            const b = OrderedMap(entriesB);
            const merged = a.merge(b);
            const expectedKeys = [...keysA, ...keysB.filter((k) => !a.has(k))];
            expect(merged.keySeq().toArray()).toEqual(expectedKeys);
          }
        )
      );
    });

    it('reverse is involution', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ maxLength: 5 }), { maxLength: 50 }),
          (keys) => {
            const entries: Array<[string, number]> = keys.map((k, i) => [k, i]);
            const om = OrderedMap(entries);
            expect(om.reverse().reverse().equals(om)).toBe(true);
          }
        )
      );
    });

    it('sort produces sorted values', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ maxLength: 5 }), {
            minLength: 1,
            maxLength: 50,
          }),
          (keys) => {
            const entries: Array<[string, number]> = keys.map((k, i) => [
              k,
              keys.length - i,
            ]);
            const om = OrderedMap(entries);
            const sorted = om.sort((a: number, b: number) => a - b);
            const values = sorted.valueSeq().toArray();
            for (let i = 0; i < values.length - 1; i++) {
              expect(values[i]! <= values[i + 1]!).toBe(true);
            }
          }
        )
      );
    });
  });
});
