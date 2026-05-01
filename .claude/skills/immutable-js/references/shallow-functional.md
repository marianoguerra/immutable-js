These are JS-friendly top-level helpers exported from `immutable`: `get`, `set`, `has`, `update`, `remove`. They act on a single key/index (no path traversal). Use when interop with plain JS objects/arrays is needed, or when writing functions that accept either Immutable or plain inputs. For Immutable inputs, the instance methods (`map.set`, `list.get`) are equivalent and return the same result.

## Common signature shape

- First arg is the collection — an Immutable `Collection`, a plain object, or an `Array`.
- Second arg is the key (string/symbol for objects/Maps, number index for arrays/Lists).
- `set` / `update` / `remove` return a NEW collection of the same kind; the input is never mutated.
- `get` returns the value (or `notSetValue` / `undefined`); `has` returns a boolean.
- Plain objects are treated as keyed; arrays are treated as indexed.
- For Immutable inputs, structural sharing applies; for plain JS inputs, a shallow clone is produced.

## get

```ts
get<K, V>(collection, key, notSetValue?): V | undefined
```

Returns the value at `key`, or `notSetValue` (or `undefined`) if absent. Functional alternative to `collection.get(key)` / `collection[key]`.

```js
get(['dog', 'frog', 'cat'], 2);          // => 'cat'
get({ x: 123, y: 456 }, 'x');            // => 123
get({ x: 123, y: 456 }, 'z', 'fallback'); // => 'fallback'
get(List([1, 2, 3]), 0);                  // => 1
```

## has

```ts
has(collection: object, key: unknown): boolean
```

Returns `true` if `key` is defined in the collection. For plain objects this is equivalent to `hasOwnProperty`.

```js
has(['dog', 'frog', 'cat'], 2); // => true
has(['dog', 'frog', 'cat'], 5); // => false
has({ x: 123, y: 456 }, 'x');   // => true
has({ x: 123, y: 456 }, 'z');   // => false
```

## set

```ts
set<C>(collection: C, key, value): C
```

Returns a copy of the collection with `key` set to `value`. For plain JS, returns a new shallow-cloned object/array; the original is not mutated.

```js
set(List(['dog', 'frog', 'cat']), 1, 'cow'); // => List ['dog', 'cow', 'cat']
set({ x: 123, y: 456 }, 'x', 789);            // => { x: 789, y: 456 }
```

## update

```ts
update<C>(collection: C, key, updater): C
update<C>(collection: C, key, notSetValue, updater): C
```

Returns a copy with `key` set to `updater(currentValue)`. If `notSetValue` is supplied and the key is absent, the updater receives `notSetValue` instead of `undefined`.

```js
update(List(['dog', 'frog', 'cat']), 1, v => v.toUpperCase());
// => List ['dog', 'FROG', 'cat']

update({ x: 123, y: 456 }, 'x', v => v * 6);
// => { x: 738, y: 456 }
```

## remove

```ts
remove<C>(collection: C, key): C
```

Alias: `delete`. Returns a copy of the collection with `key` removed. For plain objects, returns a new shallow-cloned object without that key. For arrays and `List`, removes the element at that index and shifts following elements down by one.

```js
remove(List(['dog', 'frog', 'cat']), 1); // => List ['dog', 'cat']
remove({ x: 123, y: 456 }, 'x');         // => { y: 456 }
remove([10, 20, 30], 1);                  // => [10, 30]
```

## Gotchas

- These are NOT path-based — for nested paths, use the `*In` variants (`getIn`, `setIn`, `updateIn`, `removeIn`, `hasIn`); see `deep-updates.md`.
- On plain JS arrays and on `List`, `remove(arr, i)` shifts later elements down (like `Array.prototype.splice`); it does not produce a sparse/hole result.
- For Immutable inputs, returns the same identity (`===`) when no change occurs; this short-circuit does not apply to plain JS inputs (which always shallow-clone on write).
- For plain JS, the prototype chain is preserved by spreading; class instances are shallow-copied as plain objects of the same shape.
- `update` with no `notSetValue` passes `undefined` to the updater for missing keys — guard against this in your updater.

## See also

- `deep-updates.md` — path-based variants (`getIn`, `setIn`, `updateIn`, `removeIn`, `hasIn`, `mergeIn`, `mergeDeepIn`).
- `list.md` — indexed Immutable collection.
- `map.md` — keyed Immutable collection.
- `conversions.md` — moving between plain JS and Immutable.
