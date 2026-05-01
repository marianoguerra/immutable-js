`Map` is an unordered keyed collection of (key, value) pairs with O(log32 N) gets and persistent sets, implemented as a hash-array mapped trie. Unlike the native `Map`, key equality is determined by `Immutable.is` (value equality), so any value — including `NaN` and other Immutable collections — may be used as a key. JavaScript objects used as keys still rely on strict identity. Use `OrderedMap` when iteration order must follow insertion order; it shares Map's full API but is slower and uses more memory.

```ts
import { Map, OrderedMap, List } from 'immutable';
```

## Construction

### Map

```ts
Map<K, V>(collection?: Iterable<readonly [K, V]>): Map<K, V>
Map<V>(obj: { [key: string]: V }): Map<string, V>
Map<R extends { [key in PropertyKey]: unknown }>(obj: R): MapOf<R>
```

Factory function (no `new`). Accepts another keyed collection, an iterable of `[K, V]` tuples, or a plain object. When given an object literal, the inferred type is the precise `MapOf<R>` (per-key value types).

```ts
Map({ key: 'value' });
Map([['key', 'value']]);
```

JS object keys are always strings; Immutable Map keys are not coerced:

```ts
const m = Map({ 1: 'one' });
m.get('1'); // => "one"
m.get(1);   // => undefined
```

### Map.isMap

```ts
Map.isMap(maybeMap: unknown): maybeMap is Map<unknown, unknown>
```

### Keys are compared by value

Any Immutable collection may be used as a key; equality is structural.

```ts
Map().set(List([1, 2]), 'x').get(List([1, 2])); // => 'x'
```

## Reading

### get / has / includes

```ts
get(key: K): V | undefined
get<NSV>(key: K, notSetValue: NSV): V | NSV
has(key: K): boolean
includes(value: V): boolean // alias: contains
```

`includes` checks values using `Immutable.is`.

### first / last

```ts
first(): V | undefined
last(): V | undefined
```

### find / findKey / findEntry

```ts
find(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): V | undefined
findKey(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): K | undefined
findEntry(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): [K, V] | undefined
```

### keyOf / lastKeyOf

```ts
keyOf(searchValue: V): K | undefined
lastKeyOf(searchValue: V): K | undefined
```

### size

```ts
readonly size: number
```

## Persistent changes

### set

```ts
set(key: K, value: V): Map<K, V>
```

Replaces the value if the key already exists. Safe in `withMutations`.

### delete (alias `remove`)

```ts
delete(key: K): Map<K, V>
```

### deleteAll (alias `removeAll`)

```ts
deleteAll(keys: Iterable<K>): this
```

### clear

```ts
clear(): Map<K, V>
```

### update

```ts
update<R>(updater: (value: this) => R): R
update(key: K, updater: (value: V | undefined) => V | undefined): Map<K, V>
update(key: K, notSetValue: V, updater: (value: V) => V): Map<K, V>
```

Equivalent to `map.set(key, updater(map.get(key)))`. If the updater returns the same value, the original Map is returned. The no-key form chains a function over the whole Map.

```ts
Map({ key: 'value' }).update('key', v => v + v); // => Map { "key": "valuevalue" }
```

### merge (alias `concat`) / mergeWith / mergeDeep / mergeDeepWith

```ts
merge(...collections): Map<K, V>
mergeWith(merger: (oldVal, newVal, key) => unknown, ...collections): Map<K, V>
mergeDeep(...collections): Map<K, V>
mergeDeepWith(merger: (oldVal, newVal, key) => unknown, ...collections): Map<K, V>
```

Shallow merges (`merge`/`mergeWith`) overwrite per key; deep variants recurse into compatible collections (keyed-with-keyed, indexed-with-indexed, set-with-set). Indexed/set collections at matching keys are combined via `concat`/`union` rather than recursed. See `deep-updates.md` for examples and gotchas.

## Deep persistent changes

### setIn

```ts
setIn(keyPath: Iterable<unknown>, value: unknown): Map<K, V>
```

Creates intermediate Maps for missing keys. Throws if a path segment exists but cannot be updated (e.g. a primitive or non-collection object). Plain JS objects/arrays nested inside are updated immutably.

### deleteIn (alias `removeIn`)

```ts
deleteIn(keyPath: Iterable<unknown>): Map<K, V>
```

### updateIn

```ts
updateIn(keyPath: Iterable<unknown>, notSetValue: unknown, updater: (value) => unknown): Map<K, V>
updateIn(keyPath: Iterable<unknown>, updater: (value) => unknown): Map<K, V>
```

Returns the same Map if the updater returns the same value. Missing path segments are created as Maps.

### mergeIn / mergeDeepIn

```ts
mergeIn(keyPath: Iterable<unknown>, ...collections: Array<unknown>): Map<K, V>
mergeDeepIn(keyPath: Iterable<unknown>, ...collections: Array<unknown>): Map<K, V>
```

Equivalent to `updateIn(keyPath, x => x.merge(...))` and `updateIn(keyPath, x => x.mergeDeep(...))`. See `deep-updates.md`.

## Sequence algorithms

### map / mapKeys / mapEntries

```ts
map<M>(mapper: (value: V, key: K, iter: this) => M, context?: unknown): Map<K, M>
mapKeys<M>(mapper: (key: K, value: V, iter: this) => M, context?: unknown): Map<M, V>
mapEntries<KM, VM>(
  mapper: (entry: [K, V], index: number, iter: this) => [KM, VM] | undefined,
  context?: unknown
): Map<KM, VM>
```

If `mapEntries` returns `undefined` for an entry, the entry is filtered out; it always returns a new instance.

### flatMap

```ts
flatMap<KM, VM>(
  mapper: (value: V, key: K, iter: this) => Iterable<[KM, VM]>,
  context?: unknown
): Map<KM, VM>
```

### filter / filterNot

```ts
filter(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): Map<K, V>
filterNot(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): this
```

### flip / reverse

```ts
flip(): Map<V, K>
reverse(): this
```

### sort / sortBy

```ts
sort(comparator?: Comparator<V>): this & OrderedMap<K, V>
sortBy<C>(
  comparatorValueMapper: (value: V, key: K, iter: this) => C,
  comparator?: (a: C, b: C) => number
): OrderedMap<K, V>
```

Both produce an `OrderedMap` (sort imposes order). Eager.

### groupBy

```ts
groupBy<G>(grouper: (value: V, key: K, iter: this) => G, context?: unknown): Map<G, this>
```

### partition

```ts
partition(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): [Map<K, V>, Map<K, V>]
```

### concat

Alias for `merge` — see Persistent changes.

## Conversion

```ts
toArray(): Array<V> | Array<[K, V]>
toObject(): { [key: string]: V }                                    // shallow, string keys
toJS(): { [key in PropertyKey]: DeepCopy<V> } | Array<DeepCopy<V>>  // deep, string keys
toJSON(): { [key in PropertyKey]: V } | Array<V>                    // shallow, no child conversion
toSeq(): Seq<K, V>
toKeyedSeq(): Seq.Keyed<K, V>
asMutable(): this
asImmutable(): this
```

`asMutable` always returns `this`; do not use mutable copies for equality. See `conversions.md`.

## Mutation batching

### withMutations

```ts
withMutations(mutator: (mutable: this) => unknown): Map<K, V>
```

Applies a batch of mutations to a temporary mutable copy, producing a single new immutable Map. Only methods documented as safe in `withMutations` (most setters/updaters) may be used inside.

```ts
Map().withMutations(m => { m.set('a', 1).set('b', 2).set('c', 3); });
```

### wasAltered

```ts
wasAltered(): boolean
```

True if this is a mutable copy (`asMutable`) that has been mutated.

## OrderedMap

`OrderedMap` has the same API as `Map` but iterates in insertion order. Setting an existing key keeps its original position rather than moving it to the end. It is more expensive than `Map` (`set` is amortized O(log32 N) but not stable) and uses more memory.

```ts
OrderedMap<K, V>(collection?: Iterable<[K, V]>): OrderedMap<K, V>
OrderedMap<V>(obj: { [key: string]: V }): OrderedMap<string, V>

OrderedMap.isOrderedMap(maybeOrderedMap): maybeOrderedMap is OrderedMap<unknown, unknown>
```

```ts
Map({ a: 1, c: 3, b: 2 });        // iteration order undefined (often a, b, c)
OrderedMap({ a: 1, c: 3, b: 2 }); // iterates a, c, b
```

`sort` and `sortBy` on a `Map` always return an `OrderedMap`.

## See also

- `collection.md` — `Collection.Keyed` shared API (`reduce`, `every`, `some`, `count`, `slice`, etc.)
- `deep-updates.md` — patterns for `setIn`/`updateIn`/`mergeDeep`
- `conversions.md` — `toJS`/`toJSON`/`asMutable`/`asImmutable` semantics
- `predicates.md` — `isMap`, `isOrderedMap`, `isKeyed`
