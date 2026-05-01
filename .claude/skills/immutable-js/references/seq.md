`Seq` is a lazy, immutable sequence. Operations such as `map`, `filter`, `take`, and `flatMap` build up a description of computation that is not executed until values are pulled out of the sequence. Use `Seq` for chaining transforms without allocating intermediate concrete collections, for representing infinite or potentially-infinite sequences, and for cheap lazy views over existing collections (arrays, objects, other `Collection`s). Once a `Seq` is consumed via a strict (terminating) operation, the chain may cache its result internally if `cacheResult()` was called; otherwise re-iteration re-runs the upstream chain.

`Seq` is a conversion function, not a class — never use `new`. The `Seq` constructor inspects its argument and returns `Seq.Keyed`, `Seq.Indexed`, or (when given a `Collection.Set`) `Seq.Set`.

## Laziness — what to expect

- `seq.map(...).filter(...).take(10)` performs zero work until something pulls values
- Terminating ops that materialize / iterate: `toArray`, `toJS`, `toJSON`, `toList`, `toMap`, `toOrderedMap`, `toSet`, `toOrderedSet`, `toStack`, `toObject`, `forEach`, `reduce`, `reduceRight`, `every`, `some`, `find`, `findEntry`, `findLast`, `count`, `countBy`, `join`, `get`, `first`, `last`, and `for..of` iteration
- `toSeq()` is a no-op on a `Seq` and stays lazy
- Infinite sequences (e.g., from `Range(1, Infinity)`, `Repeat('x')`) are fine as long as a downstream operation bounds them via `take`, `slice`, `takeWhile`, `takeUntil`, or a short-circuiting op like `find`/`some`
- Side effects placed inside `map`/`filter` callbacks do NOT run at chain-build time — they run when (and as many times as) values are pulled. Each terminating call re-runs the chain unless `cacheResult()` was inserted
- Short-circuit consumers (`find`, `some`, `every`, `get(i)`) only iterate as far as needed: `Seq([1,2,3,4]).filter(odd).map(square).get(1)` calls the filter three times and the map exactly once

## The three Seq variants

- `Seq.Keyed<K, V>` — key/value pairs; iteration yields `[K, V]` entries. Adds `flip`, `mapKeys`, `mapEntries`. Constructed from objects, `[K, V]` iterables, or other keyed collections.
- `Seq.Indexed<T>` — ordered values with numeric indices; iteration yields `T`. Adds `interpose`, `interleave`, `splice`, `zip`, `zipAll`, `zipWith`. Constructed from arrays, array-likes, or non-keyed iterables.
- `Seq.Set<T>` — values where keys equal values; iteration yields `T`. Inherits `Collection.Set` ops (`union`, `intersect`, `subtract`, `isSubset`, `isSuperset`). Because `Seq` is lazy, `Seq.Set` does NOT enforce uniqueness eagerly — duplicates may flow through until a strict `Set`/`OrderedSet` materialization deduplicates.

## Construction

```ts
import { Seq, Range, Repeat } from 'immutable';

Seq();                                     // empty, untyped
Seq(iterable);                             // dispatched: Indexed/Keyed/Set
Seq.Keyed<K, V>(entries?: Iterable<[K,V]>);
Seq.Keyed<V>(obj: { [k: string]: V });
Seq.Indexed<T>(collection?: Iterable<T> | ArrayLike<T>);
Seq.Indexed.of<T>(...values: T[]);
Seq.Set<T>(collection?: Iterable<T> | ArrayLike<T>);
Seq.Set.of<T>(...values: T[]);
```

`Range(start?, end?, step?)` and `Repeat(value, times?)` produce `Seq.Indexed` instances and are the canonical way to create infinite indexed sequences (see range-repeat.md).

## Construction examples

```ts
import { Seq, Range, Map } from 'immutable';

// Array → Seq.Indexed
Seq([1, 2, 3]);                            // Seq.Indexed [ 1, 2, 3 ]

// Object → Seq.Keyed
Seq({ a: 1, b: 2 });                       // Seq.Keyed { "a": 1, "b": 2 }

// Wrapping an existing concrete collection preserves variant
Seq(Map({ a: 1, b: 2 }));                  // Seq.Keyed
Seq.Indexed.of(1, 2, 3);                   // Seq.Indexed [ 1, 2, 3 ]
Seq.Set.of('a', 'b', 'a');                 // Seq.Set (duplicates not yet collapsed)

// Lazy chain — map/filter run only on toArray()
Seq([1, 2, 3, 4])
  .map(x => x * x)
  .filter(x => x > 4)
  .toArray();                              // [ 9, 16 ]

// Infinite sequence, bounded by take
Range(1, Infinity)                         // 1, 2, 3, ...
  .map(x => x * x)
  .take(5)
  .toList();                               // List [ 1, 4, 9, 16, 25 ]

// Short-circuit: only iterates until first match
Range(1, Infinity).find(n => n * n > 100); // 11
```

## Methods unique-or-emphasized for Seq

Most behavior is inherited from `Collection`, `Collection.Keyed`, `Collection.Indexed`, and `Collection.Set` (see collection.md). The methods below are either unique to `Seq` or behave differently because of laziness.

### cacheResult

```ts
cacheResult(): this
```

Forces the current chain to evaluate once, caches results in memory, and returns a new `Seq` whose downstream ops iterate the cache. After `cacheResult()` the `Seq` always has a defined `size`. Use when a `Seq` will be iterated multiple times and the upstream chain is expensive — without it, each terminating op re-runs the whole chain.

```ts
const squares = Seq([1, 2, 3]).map(x => x * x).cacheResult();
squares.join() + squares.join();           // map runs 3 times total, not 6
```

### toSeq

```ts
toSeq(): this
```

Returns the same `Seq` (no-op). Each variant declares this so that chains stay typed at the same variant.

### map / filter / flatMap / partition / concat

Lazy on `Seq` — these do not allocate any concrete collection. The variant-typed overloads (`Seq.Keyed`, `Seq.Indexed`, `Seq.Set`) preserve the variant in the return type. Behavior matches the inherited `Collection` versions; see collection.md for full signatures.

### size

```ts
readonly size: number | undefined;
```

May be `undefined` when the size cannot be determined without iterating. Operations that change cardinality unpredictably — notably `filter` — yield a `Seq` with `size === undefined`. `Seq`s built from arrays, objects, `Range`, `Repeat`, and `cacheResult()` always have a numeric `size` (which is `Infinity` for unbounded ranges/repeats).

### Materialization helpers

`toList`, `toMap`, `toOrderedMap`, `toSet`, `toOrderedSet`, `toStack`, `toArray`, `toObject`, `toJS`, `toJSON` all force evaluation. On infinite sequences they will hang — bound the sequence with `take`/`slice` first. The variant of the resulting concrete collection follows the destination, not the source: a `Seq.Indexed` consumed via `toMap()` becomes a `Map<number, T>` keyed by index.

### Seq.isSeq

```ts
Seq.isSeq(maybeSeq: unknown): maybeSeq is Seq.Indexed<unknown> | Seq.Keyed<unknown, unknown> | Seq.Set<unknown>
```

True only for actual `Seq` instances (not for backing concrete collections like `List`/`Map`/`Set`). Prefer the broader `isIndexed`, `isKeyed`, `isAssociative` predicates from predicates.md when the only thing you care about is shape.

## Variant-specific highlights

Each variant inherits everything from the matching `Collection.X` (see collection.md). Below are the methods you will reach for on a `Seq` that are specific to that shape.

### Seq.Keyed

```ts
flip(): Seq.Keyed<V, K>
mapKeys<M>(mapper: (key: K, value: V, iter: this) => M, context?: unknown): Seq.Keyed<M, V>
mapEntries<KM, VM>(
  mapper: (entry: [K, V], index: number, iter: this) => [KM, VM] | undefined,
  context?: unknown
): Seq.Keyed<KM, VM>
concat<KC, VC>(...colls: Array<Iterable<[KC, VC]>>): Seq.Keyed<K | KC, V | VC>
toArray(): Array<[K, V]>
toJS(): { [key in PropertyKey]: DeepCopy<V> }
```

`flip` swaps keys and values lazily. `mapKeys` rewrites only the keys. `mapEntries` rewrites both as a tuple, and returning `undefined` from the mapper drops the entry (a lazy filter+map combined).

### Seq.Indexed

```ts
zip<U>(other: Collection<unknown, U>): Seq.Indexed<[T, U]>
zipAll<U>(other: Collection<unknown, U>): Seq.Indexed<[T, U]>     // pads with undefined
zipWith<U, Z>(zipper: (a: T, b: U) => Z, other: Collection<unknown, U>): Seq.Indexed<Z>
concat<C>(...valuesOrCollections: Array<Iterable<C> | C>): Seq.Indexed<T | C>
toArray(): Array<T>
toJS(): Array<DeepCopy<T>>
```

Inherits `interpose`, `interleave`, `splice`, `flatten`, `findIndex`, `indexOf`, etc. from `Collection.Indexed` (see collection.md). All remain lazy.

```ts
Seq([1, 2, 3]).zip(Seq(['a', 'b', 'c']));  // Seq [ [1,'a'], [2,'b'], [3,'c'] ]
Seq([1, 2, 3]).interpose(0).toArray();     // [ 1, 0, 2, 0, 3 ]
```

### Seq.Set

```ts
concat<U>(...collections: Array<Iterable<U>>): Seq.Set<T | U>
toArray(): Array<T>
toJS(): Array<DeepCopy<T>>
```

Inherits `union`, `intersect`, `subtract`, `isSubset`, `isSuperset` from `Collection.Set` (see collection.md). Note: because evaluation is deferred, duplicate values produced by `union`/`concat` only get deduplicated when materialized into a real `Set` or `OrderedSet`.

```ts
Seq.Set.of(1, 2, 3)
  .union([3, 4, 5])
  .toSet();                                // Set { 1, 2, 3, 4, 5 } — dedup at toSet
```

## Gotchas

- Side effects in `map`/`filter`/`flatMap` callbacks fire on consumption, not at chain-build time, and re-fire on every iteration unless `cacheResult()` was called
- Re-iterating a `Seq` re-runs the entire upstream chain — use `cacheResult()` if you will iterate twice or more, but be aware it must fully evaluate (so do not call it on an infinite `Seq`)
- `.size` may be `undefined` after `filter` (and similar shape-changing ops) and `Infinity` for unbounded `Range`/`Repeat`; never assume `.size` returns a finite number
- Strict materializers (`toList`, `toArray`, `toJS`, `toMap`, `toSet`, `forEach`, `reduce`, `every`, `count`, `join`) will hang on an unbounded `Seq` — bound it with `take`/`slice`/`takeWhile` or use a short-circuiting op like `find`/`some`
- An iterator object (one without `Symbol.iterator` returning `this`) passed to `Seq()` is treated as a plain object and becomes a `Seq.Keyed` over its enumerable keys, which is rarely what you want — wrap it in an iterable first or use `Seq.Indexed(Array.from(iter))`
- `Seq.Set` does not enforce value uniqueness; only the eager `Set`/`OrderedSet` collections do
- `Seq.Keyed` allows duplicate keys to flow through the chain — they are only collapsed when converted to a `Map`/`OrderedMap` (last write wins)
- `Seq` is NOT `Collection` — `isCollection(seq)` is true, but `isList(seq)`/`isMap(seq)`/`isSet(seq)` are all false. Use `isSeq` plus `isIndexed`/`isKeyed` for runtime checks
- `Seq` does not have a single canonical "empty" instance — `Seq()` returns a fresh empty seq with `K`/`V` defaulted to `unknown`; provide type parameters when needed

## Common patterns

### Lazy view over a concrete collection

Calling `.toSeq()` on a `List`, `Map`, `Set`, etc. returns the matching `Seq` variant, letting you chain transforms without allocating an intermediate `List`/`Map`/`Set` per step:

```ts
import { List } from 'immutable';

const list = List([1, 2, 3, 4, 5]);
const result = list
  .toSeq()                                 // Seq.Indexed view
  .map(x => x * 2)
  .filter(x => x > 4)
  .reduce((sum, x) => sum + x, 0);         // 24
```

### Caching a chain used twice

```ts
const expensive = Seq(rows)
  .map(parseRow)
  .filter(isValid)
  .cacheResult();                          // run parseRow/isValid exactly once

const count = expensive.count();
const first = expensive.first();           // does NOT re-parse
```

### Bounded infinite sequence

```ts
import { Range } from 'immutable';

// First 10 primes — Range is infinite, take bounds it
Range(2, Infinity)
  .filter(isPrime)
  .take(10)
  .toArray();
```

### Object → keyed transform → object

```ts
Seq({ a: 1, b: 2, c: 3 })
  .filter(v => v > 1)
  .mapKeys(k => k.toUpperCase())
  .toObject();                             // { B: 2, C: 3 }
```

### Building from generators

A generator function returns an iterator. Wrap it in `Seq.Indexed` (don't pass the iterator directly to `Seq()`, which would treat it as a keyed object):

```ts
function* nats() { let n = 0; while (true) yield n++; }
Seq.Indexed(nats()).take(5).toArray();     // [ 0, 1, 2, 3, 4 ]
```

## See also

- collection.md — parent classes (`Collection`, `Collection.Keyed`, `Collection.Indexed`, `Collection.Set`) supply the bulk of the inherited API: `take`, `skip`, `slice`, `reverse`, `sort`, `sortBy`, `groupBy`, `count`, `find`, `every`, `some`, `reduce`, `flatten`, `interpose`, `interleave`, `splice`, `union`, `intersect`, `subtract`, etc.
- range-repeat.md — `Range()` and `Repeat()` produce `Seq.Indexed` and are the idiomatic way to build infinite indexed sequences
- list.md, map.md, set.md — eager equivalents; convert with `toList()`, `toMap()`, `toSet()` once a chain should be materialized
- predicates.md — `isSeq`, `isIndexed`, `isKeyed`, `isAssociative` for runtime type checks
