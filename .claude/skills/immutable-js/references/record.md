`Record` creates a class-like factory with a known shape and a default value for each key. Instances are immutable, compare by value with `.equals()`, and expose direct property access (`record.foo`) in addition to `.get('foo')`. Use a Record when modeling a "thing with a known set of fields" rather than a free-form `Map`. Records always have a value for the keys they define; setting an unknown key throws, and `delete` resets the key to its default rather than removing it. Record instances are also `Map`-like via `getIn`/`setIn`, `toSeq`, and iteration over `[key, value]` pairs.

## Defining a Record class

`Record(defaultValues, name?)` returns a `Record.Factory`. The optional `name` is used in `toString()` output and error messages.

```js
import { Record } from 'immutable';

const Point = Record({ x: 0, y: 0 }, 'Point');
const p = Point({ x: 3 });
p.x;          // 3 (direct property access)
p.get('y');   // 0 (default)
p.toString(); // 'Point { "x": 3, "y": 0 }'

Point({ x: 1, z: 9 }).get('z'); // undefined — undeclared keys are ignored
```

A Record class can be subclassed to add methods (instances must then be created with `new`):

```js
class ABRecord extends Record({ a: 1, b: 2 }) {
  getAB() { return this.a + this.b; }
}
new ABRecord({ b: 3 }).getAB(); // 4
```

## Record.Factory (the constructor)

```ts
Record.Factory<TProps>(values?: Partial<TProps>): RecordOf<TProps>
```

Calling the factory creates an instance; calling with no argument yields all defaults. The factory is `instanceof`-compatible with the instances it produces.

```js
const Point = Record({ x: 0, y: 0 }, 'Point');
Point();                          // all defaults
Point({ x: 3 }) instanceof Point; // true
Point.displayName;                // 'Point'
```

### Record.isRecord
```ts
Record.isRecord(maybeRecord: unknown): boolean
```
True if the argument is any Record instance.

### Record.getDescriptiveName
```ts
Record.getDescriptiveName(record: RecordOf<TProps>): string
```
Returns the `name` passed to `Record(values, name)`, or `"Record"` if none was provided.

## Instance: Reading

### get
```ts
get<K>(key: K): TProps[K]
get<T>(key: string, notSetValue: T): T
```
Returns the value for `key`, or the declared default. Direct property access (`record.field`) reads the same value.

### has
```ts
has(key: string): boolean
```
True when `key` is one of the declared fields.

### hasIn / getIn
```ts
hasIn(keyPath: Iterable<unknown>): boolean
getIn(keyPath: Iterable<unknown>): unknown
```
Deep lookup along a key path through nested collections.

### equals
```ts
equals(other: unknown): boolean
```
Value equality: same Record factory and equal values for every declared key.

### hashCode
```ts
hashCode(): number
```
Hash consistent with `equals`, suitable for use as a `Map` key or `Set` member.

### toSeq
```ts
toSeq(): Seq.Keyed<keyof TProps, TProps[keyof TProps]>
```
Keyed Seq view of the record's fields. Records are also iterable as `[key, value]` pairs.

### toJS / toJSON / toObject
```ts
toJS(): DeepCopy<TProps>   // deep, recursively converts nested Immutable values
toJSON(): TProps           // shallow plain object
toObject(): TProps         // shallow plain object
```
`toJS` may not be overridden; override `toJSON` for custom serialization.

## Instance: Persistent changes

All persistent updates return a new Record of the same type. Setting or deleting a key not in the defaults throws.

### set
```ts
set<K>(key: K, value: TProps[K]): this
```
```js
Point({ x: 3 }).set('y', 4); // Point { x: 3, y: 4 }
```

### delete (alias remove)
```ts
delete<K>(key: K): this
```
Resets the key to its declared default — does not remove it from the shape.

### clear
```ts
clear(): this
```
Returns an instance with every field reset to its default.

### update
```ts
update<K>(key: K, updater: (value: TProps[K]) => TProps[K]): this
```

### merge / mergeDeep / mergeWith / mergeDeepWith
```ts
merge(...collections: Array<Partial<TProps>>): this
mergeDeep(...collections: Array<Partial<TProps>>): this
mergeWith(merger, ...collections): this
mergeDeepWith(merger, ...collections): this
```
`merge` shallowly applies provided fields; `mergeDeep` recurses into nested Immutable values. The `*With` variants resolve conflicts via the supplied merger.

### setIn / deleteIn / updateIn / mergeIn / mergeDeepIn
```ts
setIn(keyPath, value): this
deleteIn(keyPath): this        // alias removeIn
updateIn(keyPath, updater): this
mergeIn(keyPath, ...collections): this
mergeDeepIn(keyPath, ...collections): this
```
Deep variants that follow `keyPath` into nested collections.

### withMutations / asMutable / asImmutable / wasAltered
```ts
withMutations(mutator: (mutable: this) => unknown): this
asMutable(): this
asImmutable(): this
wasAltered(): boolean
```
Transient batching, mirroring `Map`. Only `set` may be used mutatively inside `withMutations`.

## TypeScript notes

Use `RecordFactory<TProps>` for the factory type and `RecordOf<TProps>` for instances. `RecordOf<T>` is `Record<T> & Readonly<T>`, which is what enables typed property access.

```ts
import { Record, type RecordFactory, type RecordOf } from 'immutable';

type Point3DProps = { x: number; y: number; z: number };
const defaults: Point3DProps = { x: 0, y: 0, z: 0 };

const makePoint3D: RecordFactory<Point3DProps> = Record(defaults);
export type Point3D = RecordOf<Point3DProps>;
const p: Point3D = makePoint3D({ x: 10, y: 20, z: 30 });
```

When subclassing, do **not** use `RecordFactory`; apply the props type when extending instead:

```ts
class Person extends Record({ name: 'Aristotle', age: 2400 })<{ name: string; age: number }> {
  getName(): string { return this.get('name'); }
}
```

## Gotchas

- Defaults are fixed at factory creation. New keys cannot be added later — `set`/`delete` of an unknown key throws.
- `delete(key)` resets to the default; it does not remove the field from the shape.
- `clear()` returns the all-defaults instance, not an empty one.
- Records from different factories are never `equals`, even when they hold the same values.
- Direct assignment (`record.field = ...`) throws; use `set`. Property access (`record.field`) is unsupported on IE8 — fall back to `get('field')` if targeting it.
- `toJS` is final and cannot be overridden; override `toJSON` for custom serialization.

## See also

- `map.md` — when keys are dynamic or the shape isn't known up front.
- `equality.md` — how `equals`/`hashCode` interact with Record identity.
- `predicates.md` — `isRecord` and related type guards.
