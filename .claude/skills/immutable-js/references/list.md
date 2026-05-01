`List` is an ordered, indexed, dense, immutable collection — the Immutable.js analogue of a JavaScript Array. It is fully persistent with `O(log32 N)` `get`/`set` and `O(1)` `push`/`pop`, and it implements Deque (efficient `unshift`/`shift` as well). Reach for `List` when you need an ordered sequence keyed by integer index; prefer `Map` for keyed data, `Set`/`OrderedSet` for uniqueness, and `Stack` when you only push/pop one end and want amortised `O(1)` random access via head. Unlike a JS Array, `List` does not distinguish "unset" from `undefined`: `forEach` visits every index from `0` to `size`.

## Construction

```ts
import { List } from 'immutable';
```

### List / List.of / List.isList

```ts
function List<T>(collection?: Iterable<T> | ArrayLike<T>): List<T>;
function List.of<T>(...values: Array<T>): List<T>;
function List.isList(maybeList: unknown): maybeList is List<unknown>;
```

Factory function (no `new`). `List.of` is variadic; values are not converted. See also `predicates.md`.

```js
List();                  // => List []
List([1, 2, 3, 4]);      // => List [ 1, 2, 3, 4 ]
List.of('a', 'b');       // => List [ "a", "b" ]
```

## Reading

### size / get / has / includes (alias `contains`) / first / last / indexOf / lastIndexOf

```ts
readonly size: number;
get(index: number): T | undefined;
get<NSV>(index: number, notSetValue: NSV): T | NSV;
has(index: number): boolean;
includes(value: T): boolean;
first<NSV = undefined>(notSetValue?: NSV): T | NSV;
last<NSV = undefined>(notSetValue?: NSV): T | NSV;
indexOf(value: T): number;
lastIndexOf(value: T): number;
```

Negative indices on `get` count from the end (`get(-1)` is the last item). `includes` uses `Immutable.is` for equality. `indexOf`/`lastIndexOf` return `-1` if not found.

### find / findLast / findIndex / findLastIndex / findEntry / findLastEntry / findKey / findLastKey

```ts
find(predicate, context?, notSetValue?): T | undefined;
findLast(predicate, context?, notSetValue?): T | undefined;
findIndex(predicate, context?): number;
findLastIndex(predicate, context?): number;
findEntry(predicate, context?): [number, T] | undefined;
findLastEntry(predicate, context?): [number, T] | undefined;
findKey(predicate, context?): number | undefined;
findLastKey(predicate, context?): number | undefined;
```

`predicate: (value: T, index: number, iter: this) => boolean`. `*Last` variants iterate in reverse.

### keyOf / lastKeyOf / max / min / maxBy / minBy

```ts
keyOf(searchValue: T): number | undefined;
lastKeyOf(searchValue: T): number | undefined;
max(comparator?: (a: T, b: T) => number): T | undefined;
min(comparator?: (a: T, b: T) => number): T | undefined;
maxBy<C>(mapper: (value: T, key: number, iter: this) => C, comparator?: (a: C, b: C) => number): T | undefined;
minBy<C>(mapper: (value: T, key: number, iter: this) => C, comparator?: (a: C, b: C) => number): T | undefined;
```

## Persistent changes

### set

```ts
set(index: number, value: T): List<T>;
```

Negative `index` is allowed. Setting beyond `size` grows the List (gaps become `undefined`). `List().set(50000, 'v').size === 50001`.

### delete (alias `remove`)

```ts
delete(index: number): List<T>;
remove(index: number): List<T>;
```

Re-indexes successors; `O(N)`. Cannot be used in `withMutations`.

### insert

```ts
insert(index: number, value: T): List<T>;
```

Equivalent to `splice(index, 0, value)`. `O(N)`. Cannot be used in `withMutations`.

### clear

```ts
clear(): List<T>;
```

### push / pop / unshift / shift

```ts
push(...values: Array<T>): List<T>;
pop(): List<T>;
unshift(...values: Array<T>): List<T>;
shift(): List<T>;
```

`pop`/`shift` return the trimmed List, not the removed value (use `last()`/`first()`).

### update

```ts
update(index: number, notSetValue: T, updater: (value: T) => T): this;
update(index: number, updater: (value: T | undefined) => T | undefined): this;
update<R>(updater: (value: this) => R): R;
```

The single-argument form is a "thru" / pipe: `list.update(sum)` calls `sum(list)`. See `shallow-functional.md`.

### setSize

```ts
setSize(size: number): List<T>;
```

Truncates or pads with `undefined`. Pair with `withMutations` when the final size is known up front for faster construction.

## Deep persistent changes

See `deep-updates.md` for full semantics, key-path conventions, and interaction with nested plain JS objects/arrays.

### setIn / deleteIn (alias `removeIn`) / updateIn / mergeIn / mergeDeepIn

```ts
setIn(keyPath: Iterable<unknown>, value: unknown): this;
deleteIn(keyPath: Iterable<unknown>): this;
removeIn(keyPath: Iterable<unknown>): this;
updateIn(keyPath: Iterable<unknown>, notSetValue: unknown, updater: (value: unknown) => unknown): this;
updateIn(keyPath: Iterable<unknown>, updater: (value: unknown) => unknown): this;
mergeIn(keyPath: Iterable<unknown>, ...collections: Array<unknown>): this;
mergeDeepIn(keyPath: Iterable<unknown>, ...collections: Array<unknown>): this;
```

Numeric keys index into the List; string keys traverse nested Maps/objects. `deleteIn` cannot be used in `withMutations`; the others can.

## Sequence algorithms

### concat (alias `merge`) / map / flatMap

```ts
concat<C>(...valuesOrCollections: Array<Iterable<C> | C>): List<T | C>;
map<M>(mapper: (value: T, key: number, iter: this) => M, context?: unknown): List<M>;
flatMap<M>(mapper: (value: T, key: number, iter: this) => Iterable<M>, context?: unknown): List<M>;
```

`flatMap` is equivalent to `list.map(...).flatten(true)`.

### filter / filterNot / partition

```ts
filter<F extends T>(predicate: (value: T, index: number, iter: this) => value is F, context?: unknown): List<F>;
filter(predicate: (value: T, index: number, iter: this) => unknown, context?: unknown): this;
filterNot(predicate: (value: T, index: number, iter: this) => boolean, context?: unknown): this;
partition<F extends T, C>(predicate: (this: C, value: T, index: number, iter: this) => value is F, context?: C): [List<T>, List<F>];
partition<C>(predicate: (this: C, value: T, index: number, iter: this) => unknown, context?: C): [this, this];
```

`filter`/`filterNot` always return a new instance. `partition` returns `[falses, trues]`.

### zip / zipAll / zipWith

```ts
zip<U>(other: Collection<unknown, U>): List<[T, U]>;
zipAll<U>(other: Collection<unknown, U>): List<[T, U]>;
zipWith<U, Z>(zipper: (value: T, otherValue: U) => Z, otherCollection: Collection<unknown, U>): List<Z>;
```

`zip` stops at the shortest input; `zipAll` pads shorter inputs with `undefined`.

### slice / reverse / sort / sortBy / groupBy

```ts
slice(begin?: number, end?: number): this;
reverse(): this;
sort(comparator?: (a: T, b: T) => PairSorting | number): this;
sortBy<C>(mapper: (value: T, key: number, iter: this) => C, comparator?: (a: C, b: C) => number): this;
groupBy<G>(grouper: (value: T, index: number, iter: this) => G, context?: unknown): Map<G, this>;
```

`slice` accepts negative indices (inherited from `Collection.Indexed`). `sort`/`sortBy` are stable, eager, and always return a new instance. `groupBy` is also eager.

### Other (inherited from `Collection.Indexed`)

`interpose(separator)`, `interleave(...collections)`, `splice(index, removeNum, ...values)`, `flatten(depth?)`, `shuffle(random?)`, `mapKeys`, `mapEntries`.

## Conversion

See `conversions.md` for `toJS` deep-conversion rules and the relationship with `toJSON` / `JSON.stringify`.

### toArray / toJS / toJSON

```ts
toArray(): Array<T>;          // shallow
toJS(): Array<DeepCopy<T>>;   // deep — recursively unwraps nested Immutable collections
toJSON(): Array<T>;           // shallow; called by JSON.stringify
```

### toSeq / toIndexedSeq / toKeyedSeq / toSetSeq

```ts
toSeq(): Seq.Indexed<T>;
toIndexedSeq(): Seq.Indexed<T>;
toKeyedSeq(): Seq.Keyed<number, T>;
toSetSeq(): Seq.Set<T>;
```

`toKeyedSeq` preserves `[index, value]` pairs through later filter/map.

### asImmutable / asMutable

```ts
asImmutable(): this;
asMutable(): this;
```

See "Mutation batching".

## Mutation batching

`withMutations` returns a transient mutable copy; once the callback returns, the result is frozen back into a regular persistent `List`. Useful when chaining many updates to avoid intermediate allocations.

### withMutations

```ts
withMutations(mutator: (mutable: this) => unknown): this;
```

Not every method is safe inside the mutator — methods that re-index (`delete`, `insert`, `splice`, `interleave`, `deleteIn`) are unsafe. Each method's signature in this file notes whether it is safe.

### asMutable / asImmutable

```ts
asMutable(): this;
asImmutable(): this;
```

Alternative to `withMutations` when you want explicit begin/end calls.

### wasAltered

```ts
wasAltered(): boolean;
```

True if a transient mutation actually changed the collection.

## See also

- `Collection.Indexed` for inherited iteration, search, and reduction methods (`forEach`, `reduce`, `every`, `some`, `count`, `keys`, `values`, `entries`, etc.)
- `deep-updates.md` for `setIn` / `updateIn` / `mergeIn` / `mergeDeepIn` semantics
- `shallow-functional.md` for `update`-as-pipe and other functional patterns
- `conversions.md` for `toJS` vs `toJSON` vs `toArray`
- `predicates.md` for `List.isList` and other type guards
