Immutable.js conversions go in two directions: PARSE plain JS into Immutable with `fromJS`, and PROJECT Immutable back to plain JS with `toJS` / `toJSON` / `toArray` / `toObject` / specific-type converters (`toList`, `toMap`, `toSet`, ...). Reach for `fromJS` when you receive JSON or other plain data at a boundary. Reach for `toJS` only at boundaries (serialization, debugging, libraries that don't speak Immutable) — passing Immutable values around inside your code is preferred since `toJS` is recursive and allocates a fresh deep copy.

## fromJS

```ts
fromJS(jsValue, reviver?: (key, sequence, path) => unknown): unknown
```

Default behavior:
- Plain `Array` → `List`
- Plain `Object` (no custom prototype, own enumerable string keys) → `Map`
- Recurses into both
- Numbers, strings, booleans, `null`, `Date`, `RegExp`, JS `Map`/`Set`, custom class instances pass through unchanged

```js
import { fromJS } from 'immutable';
fromJS({ a: { b: [10, 20, 30] }, c: 40 });
// Map { a: Map { b: List [ 10, 20, 30 ] }, c: 40 }
```

The optional `reviver` is called bottom-up (deepest collection first) with each level wrapped as a `Seq.Keyed` (for objects) or `Seq.Indexed` (for arrays). It must return an Immutable Collection. The default reviver is effectively:

```js
(key, value) => (isKeyed(value) ? value.toMap() : value.toList());
```

Override it to choose different bucket types — e.g. `OrderedMap` + `List`:

```js
import { fromJS, isKeyed } from 'immutable';
fromJS(payload, (_, value) =>
  isKeyed(value) ? value.toOrderedMap() : value.toList()
);
```

The reviver also receives a `path` array (sequence of keys from the root) — useful for selectively converting only certain branches (e.g. leave `events` as a `List` but turn `index` into an `OrderedMap`).

## toJS / toJSON

- `toJS()` — recursively converts an Immutable value into plain JS. `Map`/`Record`/Keyed → object (string keys), `List`/`Stack`/Indexed → array, `Set`/`OrderedSet` → array.
- `toJSON()` — SHALLOW one-level conversion. The same shape (object vs array) but the values are still Immutable.
- `JSON.stringify(immutableValue)` works out of the box: each node's `toJSON` is invoked recursively by the serializer, so the resulting JSON string IS deeply plain.
- `Record#toJSON()` returns a plain object with the record's defined keys (no prototype).

```js
import { Map, List } from 'immutable';
const m = Map({ items: List([1, 2, 3]) });
m.toJS(); // { items: [1, 2, 3] }            (deep)
m.toJSON(); // { items: List [ 1, 2, 3 ] }   (shallow)
JSON.stringify(m); // '{"items":[1,2,3]}'    (deep, via toJSON recursion)
```

## Per-type converters

Shallow conversions to plain JS containers:

```ts
toArray(): Array<V> | Array<[K, V]>   // Keyed → entries; Indexed/Set → values
toObject(): { [key: string]: V }      // Keyed only; coerces keys to strings
```

Re-bucket into another Immutable collection (the source's keys may or may not survive — see notes):

```ts
toList(): List<V>           // discards keys (Map → values only)
toMap(): Map<K, V>          // requires hashable keys; throws otherwise
toOrderedMap(): OrderedMap<K, V>  // preserves iteration order
toSet(): Set<V>             // discards keys; requires hashable values
toOrderedSet(): OrderedSet<V>     // preserves iteration order
toStack(): Stack<V>         // discards keys
```

Lazy `Seq` variants (no work until iterated):

```ts
toSeq(): Seq<K, V>          // same kind as the source
toKeyedSeq(): Seq.Keyed<K, V>     // for Indexed: indices become keys
toIndexedSeq(): Seq.Indexed<V>    // discards keys
toSetSeq(): Seq.Set<V>            // discards keys
```

These are equivalent to passing the collection to the corresponding constructor (`List(coll)`, `Map(coll)`, ...) but read better in chains and have one important difference: `List(map)` produces a list of `[key, value]` entry tuples, while `map.toList()` produces a list of values only.

## Gotchas

- `fromJS` does NOT convert `Date`, JS `Map`/`Set`, `RegExp`, typed arrays, or custom class instances — they pass through. Use a `reviver` if you need to convert them.
- `fromJS` only treats objects with the default `Object.prototype` as plain — anything with a custom prototype is left alone. This is usually what you want, but means subclasses of `Object` won't be deepened.
- `toJS` is recursive and allocates a fresh deep copy on every call. On large structures it is expensive — iterate Immutable values directly rather than calling `.toJS()` in render paths or hot loops.
- `Map#toList()` discards keys (values-only). If you want pairs, use `map.entrySeq().toList()` or `map.toIndexedSeq()` over `entrySeq`.
- `Map#toArray()` (and other Keyed `toArray()`) returns `[key, value]` tuples, not values — use `valueSeq().toArray()` for a flat values array.
- Round-tripping `fromJS(value).toJS()` produces a structurally similar object but not necessarily identical: property iteration order may change, and any non-plain instances on the input round-trip as the same reference (since `fromJS` left them alone).
- `JSON.stringify(immutable)` works without explicit conversion — `toJSON` is wired up on every collection. No need to call `.toJS()` first.
- `toMap()` and `toSet()` throw at runtime if the values/keys are not hashable (e.g. mutable JS objects). `toOrderedMap`/`toOrderedSet` have the same constraint but preserve insertion order.

## See also

- `references/deep-updates.md` — `getIn`/`setIn`/`updateIn`/`mergeDeep` for working without converting back to JS.
- `references/list.md`, `references/map.md`, `references/set.md` — per-type construction and method details.
- `references/predicates.md` — `isImmutable`, `isKeyed`, `isIndexed` (used in `fromJS` revivers).
