`Collection<K, V>` is the abstract base interface for every immutable iterable in immutable-js. You never construct a `Collection` directly — you construct one of the concrete types (`List`, `Map`, `Set`, `Stack`, `Seq`, `Record`) and use the methods documented here, all of which they inherit. Three sub-interfaces tailor the iteration shape: `Collection.Keyed<K, V>` yields `[K, V]` tuples, `Collection.Indexed<T>` yields values in numeric-index order, and `Collection.Set<T>` yields values (value-unique on concrete `Set`/`OrderedSet`). The `Collection(...)` factory is also a conversion function: returns an existing `Collection` unchanged, wraps an array-like as `Collection.Indexed`, wraps a plain object as `Collection.Keyed<string, V>`.

## Class hierarchy summary

```
Collection
├─ Collection.Keyed   → Map, OrderedMap, Record  (and Seq.Keyed)
├─ Collection.Indexed → List, Stack              (and Seq.Indexed)
└─ Collection.Set     → Set, OrderedSet          (and Seq.Set)
```

`OrderedCollection<T>` is a marker interface (no own behaviour) mixed into every type with stable iteration order: `List`, `Stack`, `OrderedMap`, `OrderedSet`, every `Collection.Indexed`/`Seq.Indexed`, and any `Seq.Keyed` built from an ordered source. Detect at runtime with `isOrdered()`. There is no `OrderedCollection` value to construct.

## Reading

### size

```ts
readonly size: number | undefined;
```

Element count. Always defined on concrete types; may be `undefined` on a lazy `Seq` whose source has not been evaluated. Use `count()` for a guaranteed number.

### get

```ts
get(key: K): V | undefined;
get<NSV>(key: K, notSetValue: NSV): V | NSV;
```

Returns the value for `key`, or `notSetValue` (or `undefined`) if absent. On `Collection.Indexed`, `key` is a numeric index and negative values count from the end (`get(-1)` is last). Because a stored value may itself be `undefined`, prefer the two-arg form to disambiguate "missing" from "set to undefined".

### has / includes / contains

```ts
has(key: K): boolean;
includes(value: V): boolean;
contains(value: V): boolean; // alias of includes
```

`has` checks key membership; `includes`/`contains` check value membership. Both use `Immutable.is` (deep value equality).

### first / last

```ts
first(): V | undefined;
first<NSV>(notSetValue: NSV): V | NSV;
last():  V | undefined;
last<NSV>(notSetValue: NSV):  V | NSV;
```

First/last value in iteration order, or the optional default if empty.

### getIn / hasIn

```ts
getIn(searchKeyPath: Iterable<unknown>, notSetValue?: unknown): unknown;
hasIn(searchKeyPath: Iterable<unknown>): boolean;
```

Walk a path of keys/indices through nested Immutable collections (and plain JS objects/arrays). See `nested-updates.md`.

## Sequence algorithms (return same kind of collection)

Most return a Collection of the same variant (`this`-typed where possible). For `Map`/`Set`, sorting/reversing returns the ordered counterpart (`OrderedMap`/`OrderedSet`).

### map / flatMap

```ts
map<M>(mapper: (value: V, key: K, iter: this) => M, context?: unknown): Collection<K, M>;
flatMap<M>(mapper: (value: V, key: K, iter: this) => Iterable<M>, context?: unknown): Collection<K, M>;
flatMap<KM, VM>(mapper: (value: V, key: K, iter: this) => Iterable<[KM, VM]>, context?: unknown): Collection<KM, VM>;
```

Always returns a new instance. `flatMap` is `map(...).flatten(true)`. On `Collection.Set` callbacks, `key === value`.

### filter / filterNot

```ts
filter(predicate: (value: V, key: K, iter: this) => unknown, context?: unknown): this;
filter<F extends V>(predicate: (value: V, key: K, iter: this) => value is F, context?: unknown): Collection<K, F>;
filterNot(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): this;
```

`filter` keeps truthy entries; `filterNot` keeps falsy ones. Type guards narrow the result.

### reverse / sort / sortBy

```ts
reverse(): this;
sort(comparator?: Comparator<V>): this;
sortBy<C>(mapper: (value: V, key: K, iter: this) => C, comparator?: Comparator<C>): this;
```

`comparator(a, b)` returns negative/zero/positive (or a `PairSorting` enum value) and must be pure. Sort is stable. On unordered collections (`Map`, `Set`), the result is the ordered counterpart. Always eager.

### slice / rest / butLast

```ts
slice(begin?: number, end?: number): this;
rest():    this;   // all but first
butLast(): this;   // all but last
```

Negative slice indices count from the end. Returns the same instance if the slice is the whole collection.

### skip / skipLast / skipWhile / skipUntil / take / takeLast / takeWhile / takeUntil

```ts
skip(amount: number):     this;
skipLast(amount: number): this;
skipWhile(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): this;
skipUntil(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): this;
take(amount: number):     this;
takeLast(amount: number): this;
takeWhile(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): this;
takeUntil(predicate: (value: V, key: K, iter: this) => boolean, context?: unknown): this;
```

`*While` keeps taking/skipping while predicate is true; `*Until` until it becomes true.

### concat / flatten

```ts
concat(...valuesOrCollections: Array<unknown>): Collection<unknown, unknown>;
flatten(depth?: number):   Collection<unknown, unknown>;
flatten(shallow?: boolean): Collection<unknown, unknown>;
```

Concrete variants narrow `concat`'s return type — see the per-variant sections below. `flatten()` (no args) flattens deeply; `flatten(true)` flattens one level; `flatten(0)` flattens deeply. Only flattens nested Immutable Collections, not arrays/objects.

### groupBy / partition

```ts
groupBy<G>(grouper: (value: V, key: K, iter: this) => G, context?: unknown): Map<G, this>;
partition(predicate, context?): [this, this]; // [falsy, truthy]
partition<F extends V, C>(predicate: (...) => value is F, context?: C): [Collection<K, V>, Collection<K, F>];
```

`groupBy` is eager and returns a `Map` of group key → Collection of the same variant. `partition` returns `[notMatching, matching]` in one pass.

## Side effects and reductions

### forEach

```ts
forEach(sideEffect: (value: V, key: K, iter: this) => unknown, context?: unknown): number;
```

Returns the number of iterations executed. Unlike `Array#forEach`, returning `false` from `sideEffect` aborts iteration.

### reduce / reduceRight

```ts
reduce<R>(reducer: (acc: R, value: V, key: K, iter: this) => R, initialReduction: R, context?: unknown): R;
reduce<R>(reducer): R; // first item is the initial reduction
reduceRight<R>(reducer, initialReduction: R, context?: unknown): R;
reduceRight<R>(reducer): R;
```

`reduceRight` is `reverse().reduce(...)`.

### every / some / find* / keyOf*

```ts
every(predicate, context?: unknown): boolean;
some(predicate,  context?: unknown): boolean;

find(predicate, context?, notSetValue?: V):          V | undefined;
findLast(predicate, context?, notSetValue?: V):      V | undefined;
findEntry(predicate, context?, notSetValue?: V):     [K, V] | undefined;
findLastEntry(predicate, context?, notSetValue?: V): [K, V] | undefined;
findKey(predicate,    context?): K | undefined;
findLastKey(predicate, context?): K | undefined;

keyOf(searchValue: V):     K | undefined;
lastKeyOf(searchValue: V): K | undefined;
```

`*Last` variants iterate in reverse. `keyOf`/`lastKeyOf` look up by `Immutable.is` value equality; on `Collection.Indexed` prefer `indexOf`/`lastIndexOf` for clarity.

### max / maxBy / min / minBy

```ts
max(comparator?: Comparator<V>): V | undefined;
maxBy<C>(mapper: (value, key, iter) => C, comparator?: Comparator<C>): V | undefined;
min(comparator?: Comparator<V>): V | undefined;
minBy<C>(mapper: (value, key, iter) => C, comparator?: Comparator<C>): V | undefined;
```

Default comparator is `>` / `<`. On ties, the first encountered wins.

### count / countBy / isEmpty / join

```ts
count(): number;
count(predicate, context?): number;
countBy<G>(grouper, context?): Map<G, number>;
isEmpty(): boolean;
join(separator?: string): string; // default ","
```

`count()` always returns the actual size, even for a lazy `Seq` (forcing evaluation). `isEmpty` may iterate at most once on a lazy `Seq`.

### isSubset / isSuperset

```ts
isSubset(iter:   Iterable<V>): boolean; // every value in this is in iter
isSuperset(iter: Iterable<V>): boolean; // every value in iter is in this
```

## Conversion

```ts
toArray():       Array<V> | Array<[K, V]>;
toObject():      { [key: string]: V };
toJS():          Array<DeepCopy<V>> | { [key: PropertyKey]: DeepCopy<V> };
toJSON():        Array<V> | { [key: PropertyKey]: V };

toList():        List<V>;
toMap():         Map<K, V>;
toOrderedMap():  OrderedMap<K, V>;
toSet():         Set<V>;
toOrderedSet():  OrderedSet<V>;
toStack():       Stack<V>;

toSeq():         Seq<K, V>;
toKeyedSeq():    Seq.Keyed<K, V>;
toIndexedSeq():  Seq.Indexed<V>;
toSetSeq():      Seq.Set<V>;
```

`toJS` is deep (recursively converts nested Immutable structures); `toJSON`/`toArray`/`toObject` are shallow. `Collection.Keyed#toArray` returns `Array<[K, V]>`; `Collection.Indexed`/`Collection.Set#toArray` return `Array<V>`. `to{List,Set,OrderedSet,Stack}` discard keys; `toMap`/`toOrderedMap` throw if keys are not hashable. See `conversions.md`.

## Comparison

```ts
equals(other: unknown): boolean;
hashCode(): number;
```

`equals` is `Immutable.is(this, other)` — deep value equality. `hashCode` is a stable Uint32; equal collections must produce equal hashes. See `equality.md`.

## Iteration

```ts
keys():    IterableIterator<K>;
values():  IterableIterator<V>;
entries(): IterableIterator<[K, V]>;
[Symbol.iterator](): IterableIterator<unknown>;

keySeq():   Seq.Indexed<K>;
valueSeq(): Seq.Indexed<V>;
entrySeq(): Seq.Indexed<[K, V]>;
```

Default iteration shape per variant: `Keyed` yields `[K, V]` tuples; `Indexed` yields `V` in index order; `Set` yields `V` (value-unique on concrete `Set`). The `keys()`/`values()`/`entries()` methods return ES iterators (no chainable Immutable methods); `keySeq()`/`valueSeq()`/`entrySeq()` return `Seq.Indexed`s that you can chain.

### update

```ts
update<R>(updater: (value: this) => R): R;
```

Pipe the collection through a function — useful for chaining (`coll.update(fn).map(...)`). RxJS calls this `let`, lodash calls it `thru`.

## Variant-specific methods

### Collection.Keyed

```ts
flip(): Collection.Keyed<V, K>;
mapKeys<M>(mapper: (key: K, value: V, iter: this) => M, context?: unknown): Collection.Keyed<M, V>;
mapEntries<KM, VM>(
  mapper: (entry: [K, V], index: number, iter: this) => [KM, VM] | undefined,
  context?: unknown,
): Collection.Keyed<KM, VM>;

concat<KC, VC>(...collections: Array<Iterable<[KC, VC]>>): Collection.Keyed<K | KC, V | VC>;
concat<C>(...collections: Array<{ [key: string]: C }>):    Collection.Keyed<K | string, V | C>;
```

`flip` swaps keys and values. `mapEntries` may return `undefined` to drop that entry. Inherited `keyOf` returns the key associated with a value (not an index). When iterated, yields `[K, V]`.

### Collection.Indexed

Indices are 0-based and dense ("unset" and `undefined` are indistinguishable; iteration visits every index `0..size`). Negative indices count from the end.

```ts
indexOf(searchValue: T):     number; // -1 if absent
lastIndexOf(searchValue: T): number;
findIndex(predicate, context?):     number;
findLastIndex(predicate, context?): number;

interpose(separator: T): this;                                     // T, sep, T, sep, T
interleave(...collections: Array<Collection<unknown, T>>): this;   // round-robin; stops at shortest
splice(index: number, removeNum: number, ...values: Array<T>): this;

zip<U>(other: Collection<unknown, U>):    Collection.Indexed<[T, U]>;
zip(...collections):                       Collection.Indexed<unknown>;
zipAll<U>(other: Collection<unknown, U>): Collection.Indexed<[T, U]>; // pads shorter with undefined
zipWith<U, Z>(zipper: (value: T, otherValue: U) => Z, other: Collection<unknown, U>): Collection.Indexed<Z>;

concat<C>(...valuesOrCollections: Array<Iterable<C> | C>): Collection.Indexed<T | C>;
fromEntrySeq(): Seq.Keyed<unknown, unknown>; // when T is [K, V], reinterpret as keyed
```

`splice`, `interleave`, and other reindexing operations are `O(N)` and cannot be used inside `withMutations`. All `Collection.Indexed` methods return re-indexed Collections — to preserve original indices as keys, call `toKeyedSeq()`.

### Collection.Set

Iterates values; on the concrete `Set`/`OrderedSet`, values are unique (`Immutable.is`). On lazy `Seq.Set`, duplicates may be present. In callbacks, `key === value`.

```ts
concat<U>(...collections: Array<Iterable<U>>):     Collection.Set<T | U>;
map<M>(mapper: (value: T, key: T, iter: this) => M, context?: unknown):     Collection.Set<M>;
flatMap<M>(mapper: (value: T, key: T, iter: this) => Iterable<M>, context?: unknown): Collection.Set<M>;
filter<F extends T>(predicate: (value: T, key: T, iter: this) => value is F, context?: unknown): Collection.Set<F>;
filter(predicate, context?): this;
partition(predicate, context?): [this, this];
```

`union`, `intersect`, and `subtract` are NOT on `Collection.Set` — they live on the concrete `Set`/`OrderedSet`. See `set.md`.

## OrderedCollection

`OrderedCollection<T>` is a marker interface — it adds nothing beyond `toArray()` and `[Symbol.iterator]()` that every collection already has. Its purpose is purely type-level: it identifies collections whose iteration order is deterministic and stable across operations.

Implementers: `List`, `Stack`, `OrderedMap`, `OrderedSet`, every `Collection.Indexed` (so every `Seq.Indexed`), and any `Seq.Keyed` constructed from an ordered source. `Map` and `Set` are NOT ordered. Detect at runtime:

```ts
function isOrdered<T>(maybeOrdered: Collection<unknown, T>): maybeOrdered is OrderedCollection<T>;
function isOrdered(maybeOrdered: unknown):                    maybeOrdered is OrderedCollection<unknown>;
```

`KeyPath<K>` (used by `getIn`/`setIn`/etc.) is typed as `OrderedCollection<K> | ArrayLike<K>` — so any ordered Collection is a valid key path.

## See also

- `list.md`, `stack.md`  — concrete `Collection.Indexed` types
- `map.md`, `record.md`  — concrete `Collection.Keyed` types
- `set.md`               — concrete `Collection.Set` types (`union`/`intersect`/`subtract` live here)
- `seq.md`               — lazy `Seq.Keyed`/`Seq.Indexed`/`Seq.Set`
- `equality.md`          — `equals`, `hashCode`, `Immutable.is`
- `conversions.md`       — `toJS`/`fromJS`, `toArray`, cross-type `to*`
- `predicates.md`        — `isCollection`, `isOrdered`, `isKeyed`, etc.
