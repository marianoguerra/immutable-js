`Range()` and `Repeat()` are factory functions (no `new`) that produce a lazy `Seq.Indexed`. They are cheap to construct, can represent infinite sequences, and compose with every `Seq` method (`map`, `filter`, `take`, `slice`, `concat`, `reduce`, ...). Nothing is computed until the sequence is iterated or materialized via `toArray`/`toList`/etc.

## Range

```ts
Range(start?: number, end?: number, step?: number): Seq.Indexed<number>
```

- `start` defaults to `0` (inclusive).
- `end` defaults to `Infinity` (exclusive). When `end` is `Infinity`, you MUST bound the sequence with `take()` / `takeWhile()` / `slice()` before materializing, or iteration will never terminate.
- `step` defaults to `1`. May be negative to count down. When `start === end`, the range is empty.

```js
Range(0, 5).toArray(); // => [0, 1, 2, 3, 4]
Range(10, 30, 5).toArray(); // => [10, 15, 20, 25]
Range(30, 10, -5).toArray(); // => [30, 25, 20, 15]
```

## Repeat

```ts
Repeat<T>(value: T, times?: number): Seq.Indexed<T>
```

- `times` defaults to `Infinity`. Same rule as `Range`: bound infinite repeats with `take()`/`slice()` before materializing.
- `value` is held by reference; `Repeat` does not clone it.

```js
Repeat('x', 3).toArray(); // => ['x', 'x', 'x']
```

## Common patterns

```js
// Squares of 0..9 as a List
Range(0, 10).map(n => n * n).toList();
// => List [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

// Concatenate two finite repeats
Repeat('a', 3).concat(Repeat('b', 2)).toArray();
// => ['a', 'a', 'a', 'b', 'b']

// Bound an infinite Range with take()
Range().filter(n => n % 7 === 0).take(5).toArray();
// => [0, 7, 14, 21, 28]

// Build a List directly from a Range
List(Range(0, 5)); // => List [0, 1, 2, 3, 4]
```

## See also

- `seq.md` — the underlying lazy `Seq.Indexed` API and laziness rules.
- `list.md` — materializing into a `List` (e.g. `List(Range(0, 5))`).
- `conversions.md` — `toArray`, `toList`, `toSet`, and other terminal operations.
