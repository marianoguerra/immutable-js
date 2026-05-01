When you have nested data, these helpers update by path without writing the boilerplate yourself. Each returns a new structure with structural sharing for the unchanged parts. Available both as top-level functions imported from `immutable` (which also accept plain JS objects/arrays) and as instance methods on every Immutable collection. The instance forms (`map.setIn(...)`, `list.updateIn(...)`, etc.) have identical semantics on Immutable inputs.

## Paths

- A path is any iterable of keys/indices — most code uses an `Array`, but any `Iterable` works.
- Use numeric indices for `List`/`Array` segments and string keys for `Map`/`Record`/object segments. Keys are matched exactly (no negative-index resolution like `List.get(-1)` does).
- For `setIn`/`updateIn`/`mergeIn`, missing intermediate keys are auto-created as empty `Map`s to fill out the path. If you want a `List` at some level, initialize it explicitly first.
- `getIn`/`hasIn` never mutate or extend — a missing intermediate just yields `notSetValue` / `false`.
- All functions return the same identity (`===`) when no change occurs (e.g. `setIn` to the existing value).

## getIn

```ts
getIn(collection, keyPath, notSetValue?): any
```

Walks `keyPath` from `collection` and returns the value found, or `notSetValue` (default `undefined`) if any segment is missing.

```js
getIn({ x: { y: { z: 123 } } }, ['x', 'y', 'z']);          // => 123
getIn({ x: { y: { z: 123 } } }, ['x', 'q', 'p'], 'fallback'); // => 'fallback'
```

## hasIn

```ts
hasIn(collection, keyPath): boolean
```

Returns `true` iff every segment of `keyPath` resolves. Distinguishes "key absent" from "key present but `undefined`", unlike `getIn(...) !== undefined`.

```js
hasIn({ x: { y: { z: 123 } } }, ['x', 'y', 'z']); // => true
hasIn({ x: { y: { z: 123 } } }, ['x', 'q', 'p']); // => false
```

## setIn

```ts
setIn(collection: C, keyPath: Iterable, value: any): C
```

Returns a copy of `collection` with the value at `keyPath` replaced by `value`. Missing intermediate keys are filled in as empty `Map`s.

```js
setIn({ x: { y: { z: 123 } } }, ['x', 'y', 'z'], 456);
// => { x: { y: { z: 456 } } }

setIn(Map(), ['a', 'b', 'c'], 1);
// => Map { "a": Map { "b": Map { "c": 1 } } }
```

## updateIn

```ts
updateIn(collection, keyPath, updater)
updateIn(collection, keyPath, notSetValue, updater)
```

Returns a copy where the value at `keyPath` is replaced by `updater(currentValue)`. With four arguments, `notSetValue` is passed to `updater` when the path is missing (otherwise `updater` receives `undefined`). Like `setIn`, missing intermediates become empty `Map`s.

```js
// 3-arg: updater receives undefined when path is missing
updateIn(Map(), ['hits'], n => (n || 0) + 1);
// => Map { "hits": 1 }

// 4-arg: notSetValue is passed in when path is missing
updateIn(Map({ x: { y: 10 } }), ['x', 'y'], 0, n => n + 1);
// => Map { "x": { "y": 11 } }
updateIn(Map(), ['x', 'y'], 0, n => n + 1);
// => Map { "x": Map { "y": 1 } }
```

## removeIn (alias deleteIn)

```ts
removeIn(collection: C, keyPath: Iterable): C
```

Returns a copy with the entry at `keyPath` removed. Intermediate containers are left in place even if they become empty.

```js
removeIn({ x: { y: { z: 123 } } }, ['x', 'y', 'z']);
// => { x: { y: {} } }
```

## merge

```ts
merge<C>(collection: C, ...sources): C
```

Shallow non-mutating merge: each source's keys overwrite `collection`'s at the top level only. For plain objects this behaves like `Object.assign({}, target, ...sources)` but never mutates; for `Map`-like targets it merges entries.

```js
merge({ x: 123, y: 456 }, { y: 789 });
// => { x: 123, y: 789 }
```

## mergeWith

```ts
mergeWith<C>(
  merger: (oldVal, newVal, key) => any,
  collection: C,
  ...sources
): C
```

Like `merge`, but `merger(oldVal, newVal, key)` resolves every collision (called only when both sides have the key).

```js
mergeWith(
  (oldVal, newVal) => oldVal + newVal,
  { x: 123, y: 456 },
  { y: 789, z: 'abc' }
);
// => { x: 123, y: 1245, z: 'abc' }
```

## mergeDeep

```ts
mergeDeep<C>(collection: C, ...sources): C
```

Recursive merge. At each key: if both old and new values are "compatible" collections in the same category (keyed: `Map`/`Record`/object, indexed: `List`/`Array`, set-like: `Set`), they are merged together; otherwise the new value replaces the old. Indexed and set-like values are merged via `concat()`/`union()` — they do NOT recurse element-wise. Mixing categories at a key (e.g. `List` vs `Map`) replaces.

```js
mergeDeep({ x: { y: 123 } }, { x: { z: 456 } });
// => { x: { y: 123, z: 456 } }

mergeDeep({ xs: [1, 2] }, { xs: [3, 4] });
// => { xs: [1, 2, 3, 4] }   // concat, NOT element-wise merge
```

## mergeDeepWith

```ts
mergeDeepWith<C>(
  merger: (oldVal, newVal, key) => any,
  collection: C,
  ...sources
): C
```

Like `mergeDeep`, but at any leaf collision (or when the two sides are in incompatible categories), `merger(oldVal, newVal, key)` decides the resulting value.

```js
mergeDeepWith(
  (oldVal, newVal) => oldVal + newVal,
  { x: { y: 123 } },
  { x: { y: 456 } }
);
// => { x: { y: 579 } }
```

## Gotchas

- `setIn`/`updateIn`/`mergeIn` create missing intermediates as empty `Map`s. If a layer should be a `List`, build it yourself (e.g. `setIn(state, ['items'], List())` first) — paths cannot signal which container type to materialize.
- `mergeDeep` does NOT element-merge `List`s/`Array`s — same-key indexed values are concatenated, and `Set`s are unioned. To deep-merge by index, write a custom `mergeDeepWith` merger.
- A category mismatch at a key (e.g. existing `List`, incoming `Map`) replaces under `mergeDeep`; only `mergeDeepWith` lets you intervene.
- Top-level functional forms accept plain JS as the target and return the same kind back (object in / object out, `Map` in / `Map` out). The instance methods are only on Immutable collections.
- All operations are identity-preserving on no-op: `setIn(c, path, c.getIn(path)) === c`, `merge(c) === c` when nothing changes.
- `getIn`/`hasIn` perform exact key lookups. `getIn(list, [-1])` does not return the last element — use `list.last()`.

## See also

- `list.md`, `map.md` — instance variants and additional `*In` methods (`mergeIn`, `mergeDeepIn`).
- `record.md` — path access on `Record` respects declared fields.
- `conversions.md` — when mixing JS and Immutable inputs across these helpers.
- `shallow-functional.md` — single-level versions (`get`, `set`, `update`, `remove`, `has`).
