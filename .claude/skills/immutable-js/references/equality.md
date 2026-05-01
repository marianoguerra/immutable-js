Immutable.js treats collections as VALUES, not references: two distinct `Map({a: 1})` instances are equal even though `===` says otherwise. This is implemented via two protocols, `equals(other): boolean` and `hashCode(): number`, together forming the `ValueObject` interface. The top-level `is(a, b)` function dispatches to the appropriate comparison. Anything that implements both methods becomes a `ValueObject` and can be used as a `Map`/`OrderedMap` key or a `Set`/`OrderedSet` member with value-equality semantics — so two structurally equal custom objects collapse to a single entry, and lookup works with any equivalent instance.

## is

### is

```ts
is(first: unknown, second: unknown): boolean
```

Value-equality check. Returns `true` for SameValue semantics (handles `NaN === NaN` as true), but unlike `Object.is` treats `0` and `-0` as equal (matching ES6 `Map` key equality). For `ValueObject` arguments dispatches to `first.equals(second)`. For primitives and non-`ValueObject` objects falls back to `Object.is`-style comparison.

```js
import { Map, is } from 'immutable';
const a = Map({ x: 1, y: 2 });
const b = Map({ x: 1, y: 2 });
a !== b;             // true — distinct instances
Object.is(a, b);     // false
is(a, b);            // true — value-equal
a.equals(b);         // true — same as is(a, b)
```

Used internally throughout Immutable.js for `Map` key equality, `Set` membership, `.includes()`, `.indexOf()`, etc.

## hash

### hash

```ts
hash(value: unknown): number
```

Returns a 31-bit integer hash for any value. For `ValueObject`s, calls `value.hashCode()`. For primitives (strings, numbers, booleans, `null`, `undefined`), produces a deterministic per-value hash. For plain objects, plain arrays, `Date`, etc. that don't implement `hashCode`, generates a unique per-instance hash and memoizes it on the object — so the hash represents referential identity (stable across mutations), not value equality.

Used internally by `Map`/`Set` for hash bucketing. Balances speed and collision avoidance; not cryptographically secure. _New in v4.0._

## ValueObject

### ValueObject

```ts
interface ValueObject {
  equals(other: unknown): boolean;
  hashCode(): number;
}
```

The interface to implement so a custom class behaves as a value: usable as a `Map`/`OrderedMap` key, in a `Set`/`OrderedSet`, and comparable via `is()`. All Immutable collections (`List`, `Map`, `Set`, `Record`, etc.) already implement it.

Contract:

- `a.equals(b) === true` MUST imply `a.hashCode() === b.hashCode()` (the converse is not required — hash collisions are allowed).
- `hashCode()` MUST return a Uint32. Idiomatic guard: `return myHash | 0`.
- `hashCode()` is not guaranteed to be called before `equals()`; lookups always verify via `equals()`.

```js
import { Set, hash } from 'immutable';

class Point {
  constructor(x, y) { this.x = x; this.y = y; }
  equals(other) {
    return other instanceof Point && other.x === this.x && other.y === this.y;
  }
  hashCode() {
    return (hash(this.x) * 31 + hash(this.y)) | 0;
  }
}

const s = Set([new Point(1, 2)]);
s.has(new Point(1, 2)); // true — different instance, value-equal
```

## isValueObject

### isValueObject

```ts
isValueObject(maybeValue: unknown): maybeValue is ValueObject
```

Returns `true` iff `maybeValue` is a JavaScript object that has BOTH `equals` and `hashCode` methods. Any two value objects can be compared with `is()` and used as `Map` keys or `Set` members.

## Reference identity vs value equality

- All Immutable collections implement `ValueObject`, so `is(a, b)` and `a.equals(b)` give value-equality.
- Persistent operations that don't change content return the SAME identity: `map.set('k', v)` where `map.get('k') === v` returns `map` itself (`===`). This makes `===` a valid fast-path for "definitely unchanged" — useful for `React.memo`, `shouldComponentUpdate`, and memoization.
- JavaScript's `===` between two distinct Immutable collections with equal content is `false`. This is intentional: cheap reference checks remain cheap, and value-equality is opt-in via `is()` / `.equals()`.
- Rule of thumb: use `===` to detect "this reference changed"; use `is()` / `.equals()` to ask "is the content the same?".

## See also

- `map.md`, `set.md` — collections whose key/member identity is governed by `is`/`hashCode`.
- `record.md` — `Record` instances are `ValueObject`s, equal when their fields are value-equal.
- `predicates.md` — `isImmutable`, `isCollection`, etc. for runtime type checks.
- `conversions.md` — `fromJS`/`toJS` boundary where value identity is created/lost.
