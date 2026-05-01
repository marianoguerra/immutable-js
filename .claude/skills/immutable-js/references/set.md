`Set` is an unordered collection of unique values with `O(log32 N)` `add` and `has`. Uniqueness is determined by `Immutable.is` value-equality, not reference identity, so `Set([Map({a: 1}), Map({a: 1})]).size` is `1` (a native `Set` would yield `2`). Iteration order is undefined but stable across iterations of the same instance. `OrderedSet` is a variant that preserves insertion order at the cost of more memory and slower (amortized, non-stable) `add`. Both are factory functions — call them without `new`.

```js
import { Set, OrderedSet } from 'immutable';
```

## Construction

### Set

```ts
Set<T>(collection?: Iterable<T> | ArrayLike<T>): Set<T>
```

Empty when called with no argument; otherwise dedupes the input.

### Set.of

```ts
Set.of<T>(...values: Array<T>): Set<T>
```

Variadic equivalent of `Set([...])`.

### Set.fromKeys

```ts
Set.fromKeys<T>(iter: Collection.Keyed<T, unknown>): Set<T>
Set.fromKeys<T>(iter: Collection<T, unknown>): Set<T>
Set.fromKeys(obj: { [key: string]: unknown }): Set<string>
```

Builds a Set from the keys of a Keyed collection or plain object.

```js
Set.fromKeys({ a: 1, b: 2 }); // => Set { "a", "b" }
```

### Set.intersect / Set.union (static)

```ts
Set.intersect<T>(sets: Iterable<Iterable<T>>): Set<T>
Set.union<T>(sets: Iterable<Iterable<T>>): Set<T>
```

Static set-algebra over an iterable of iterables (note: a single argument, unlike the instance methods).

## Reading

### has / includes

```ts
has(value: T): boolean
includes(value: T): boolean   // alias: contains
```

Membership test using `Immutable.is`.

### size

```ts
readonly size: number
```

### first / last

```ts
first<NSV>(notSetValue: NSV): T | NSV
first(): T | undefined
last<NSV>(notSetValue: NSV): T | NSV
last(): T | undefined
```

For a plain `Set`, "first"/"last" follow the stable but undefined iteration order; for `OrderedSet`, they follow insertion order.

### find

```ts
find(predicate: (value: T, key: T, iter: this) => boolean, context?: unknown, notSetValue?: T): T | undefined
```

First value for which `predicate` returns truthy. Companions: `findLast`, `findEntry`, `findKey`, `keyOf` (note: in a Set, key === value).

## Persistent changes

### add

```ts
add(value: T): this
```

Returns a Set including `value`. No-op (returns same instance) if already present. Safe in `withMutations`.

### delete / remove

```ts
delete(value: T): this
remove(value: T): this   // alias of delete
```

Returns a Set without `value`. Safe in `withMutations`. Prefer `remove` if targeting IE8.

### clear

```ts
clear(): this
```

Returns an empty Set of the same type.

### union / merge / concat

```ts
union<C>(...collections: Array<Iterable<C>>): Set<T | C>
```

Adds every value from each provided iterable. Variadic — accepts multiple iterables in one call. `merge` and `concat` are aliases.

### intersect

```ts
intersect(...collections: Array<Iterable<T>>): this
```

Keeps only values present in this Set AND every provided iterable. Variadic.

### subtract

```ts
subtract(...collections: Array<Iterable<T>>): this
```

Removes every value contained in any of the provided iterables. Variadic.

```js
Set([1, 2, 3]).subtract([1, 3]); // => Set { 2 }
```

All four set-algebra instance methods are safe in `withMutations`.

## Sequence algorithms

### map

```ts
map<M>(mapper: (value: T, key: T, iter: this) => M, context?: unknown): Set<M>
```

In a Set, `key === value` for every callback.

### flatMap

```ts
flatMap<M>(mapper: (value: T, key: T, iter: this) => Iterable<M>, context?: unknown): Set<M>
```

### filter / filterNot

```ts
filter<F extends T>(predicate: (value: T, key: T, iter: this) => value is F, context?: unknown): Set<F>
filter(predicate: (value: T, key: T, iter: this) => unknown, context?: unknown): this
filterNot(predicate: (value: T, key: T, iter: this) => boolean, context?: unknown): this
```

Always return a new instance. The type-guard overload of `filter` narrows the element type.

### sort / sortBy

```ts
sort(comparator?: Comparator<T>): this & OrderedSet<T>
sortBy<C>(comparatorValueMapper: (value: T, key: T, iter: this) => C, comparator?: (a: C, b: C) => number): this & OrderedSet<T>
```

Eager. Returns an `OrderedSet`. Default comparator uses `<`/`>`. The comparator may return a `PairSorting` enum value.

### groupBy

```ts
groupBy<G>(grouper: (value: T, key: T, iter: this) => G, context?: unknown): Map<G, Set<T>>
```

Eager. Buckets values into a `Map` of `Set`s.

### partition

```ts
partition(predicate: (value: T, key: T, iter: this) => boolean, context?: unknown): [this, this]
```

Returns `[falseValues, trueValues]`.

## Conversion

### toArray / toJS / toJSON

```ts
toArray(): Array<T>
toJS(): Array<DeepCopy<T>>
toJSON(): Array<T>
```

`toJS` recurses into nested Immutable collections; `toJSON`/`toArray` are shallow.

### toSeq / toIndexedSeq / toSetSeq / toKeyedSeq

```ts
toSeq(): Seq.Set<T>
toIndexedSeq(): Seq.Indexed<T>
toSetSeq(): Seq.Set<T>
toKeyedSeq(): Seq.Keyed<T, T>
```

### toMap / toOrderedMap / toOrderedSet / toList / toStack

Convert to other Immutable collections; in a Set, `toMap()` produces `Map<T, T>` of `[value, value]` pairs.

### asImmutable / asMutable

```ts
asMutable(): this
asImmutable(): this
```

See conversions.md for the full conversion matrix and `toJS` deep-conversion rules.

## Mutation batching

### withMutations

```ts
withMutations(mutator: (mutable: this) => unknown): this
```

Apply a batch of mutations to a transient mutable copy and get back an immutable result. Only `add`, `delete`/`remove`, `clear`, `union`, `intersect`, `subtract` are safe inside.

```js
Set([1, 2, 3]).withMutations(s => {
  s.add(4).add(5).delete(1);
}); // => Set { 2, 3, 4, 5 }
```

### wasAltered

```ts
wasAltered(): boolean
```

True only on a mutable copy (from `asMutable`) that has been modified.

## OrderedSet

Same factory shape and full API as `Set`, plus `OrderedSet.isOrderedSet`. Iteration follows insertion order, matching native ES6 `Set`.

```ts
OrderedSet<T>(collection?: Iterable<T> | ArrayLike<T>): OrderedSet<T>
OrderedSet.of<T>(...values: Array<T>): OrderedSet<T>
OrderedSet.fromKeys<T>(iter: Collection<T, unknown>): OrderedSet<T>
OrderedSet.isOrderedSet(maybeOrderedSet: unknown): boolean
```

Adding a value that is already present does NOT move it to the end — original position is retained. `OrderedSet#add` is amortized `O(log32 N)` but not stable, and uses more memory than `Set`. Use it only when iteration order matters; otherwise prefer `Set`.

`union`, `merge`, `concat` on an `OrderedSet` return `OrderedSet<T | C>` (preserving the ordered type).

## See also

- `collection.md` — `Collection.Set` shared interface (all the inherited iteration/search/reduce methods: `forEach`, `reduce`, `every`, `some`, `count`, `countBy`, `max`/`maxBy`, `min`/`minBy`, `isSubset`, `isSuperset`, `slice`, `take`/`skip` family).
- `equality.md` — `Immutable.is`, which defines Set uniqueness and `has`/`includes` behavior, plus `hashCode` semantics.
- `predicates.md` — `Set.isSet`, `OrderedSet.isOrderedSet`.
- `conversions.md` — `toJS` deep conversion and round-tripping with native types.
