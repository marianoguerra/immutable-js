All `is*()` helpers are exported directly from `immutable` and most are TypeScript type guards (return `value is List<T>` etc.), so they narrow types in branches. Reach for them when accepting unknown input — typical entry-point checks after `fromJS()`, in serialization boundaries, or when an API accepts both Immutable and plain JS values.

```ts
import { isList, isMap, isCollection, isImmutable } from 'immutable';

function size(x: unknown): number {
  if (isCollection(x) || isImmutable(x)) return x.size;
  return 0;
}

function asEntries(x: unknown) {
  if (isKeyed(x)) return x.entrySeq();      // [k, v] pairs
  if (isIndexed(x)) return x.map((v, i) => [i, v]);
  return Seq.Keyed();
}
```

The concrete predicates are also re-exposed as static methods on their constructors (`List.isList`, `Map.isMap`, `Seq.isSeq`, etc.) — identical behavior, pick whichever reads better at the call site.

## Concrete-type predicates

- `isList(v): v is List<unknown>`
- `isMap(v): v is Map<unknown, unknown>` — also `true` for `OrderedMap`. Use `isOrderedMap` to distinguish.
- `isOrderedMap(v): v is OrderedMap<unknown, unknown>`
- `isSet(v): v is Set<unknown>` — also `true` for `OrderedSet`. Use `isOrderedSet` to distinguish.
- `isOrderedSet(v): v is OrderedSet<unknown>`
- `isStack(v): v is Stack<unknown>`
- `isRecord(v): v is Record<object>` — Records are not Collections; `isCollection(record)` is `false`.
- `isSeq(v): v is Seq.Indexed | Seq.Keyed | Seq.Set` — true for any lazy `Seq` subtype. Also exposed as `Seq.isSeq`.

```ts
isMap(Map())          // true
isMap(OrderedMap())   // true
isOrderedMap(Map())   // false
isOrderedMap(OrderedMap()) // true
```

## Shape predicates

Describe the role a value plays in iteration rather than its concrete class.

- `isCollection(v): v is Collection<unknown, unknown>` — true for any Immutable collection (`List`, `Map`, `Set`, `Stack`, `Seq`, etc.). False for `Record`.
- `isKeyed(v): v is Collection.Keyed<unknown, unknown>` — true for keyed collections (`Map`, `OrderedMap`, `Record`, `Seq.Keyed`); they iterate as `[k, v]` entries.
- `isIndexed(v): v is Collection.Indexed<unknown>` — true for ordered indexed collections (`List`, `Stack`, `Seq.Indexed`); iterate by integer index.
- `isAssociative(v): v is Collection.Keyed | Collection.Indexed` — true if the collection supports `get(key)` lookup, i.e. keyed OR indexed (everything except `Set`/`OrderedSet`/`Seq.Set`).
- `isOrdered(v): v is OrderedCollection<unknown>` — true if iteration order is stable (`List`, `Stack`, `OrderedMap`, `OrderedSet`, `Seq.Indexed`, etc.). False for unsorted `Map`/`Set`.

## isImmutable

- `isImmutable(v): v is Collection<unknown, unknown>`
- True for any Immutable collection or `Record`. Effectively `isCollection(v) || isRecord(v)` — the one-stop check for "did this come from Immutable.js?". Still returns `true` mid-`withMutations()`.

## Quick reference matrix

```
              isCollection isKeyed isIndexed isAssociative isOrdered isImmutable
List               yes                 yes        yes         yes        yes
Map                yes      yes                   yes                    yes
OrderedMap         yes      yes                   yes         yes        yes
Set                yes                                                   yes
OrderedSet         yes                                        yes        yes
Stack              yes                 yes        yes         yes        yes
Record             no       yes                   yes                    yes
Seq.Keyed          yes      yes                   yes                    yes
Seq.Indexed        yes                 yes        yes         yes        yes
Seq.Set            yes                                                   yes
```

Notes:
- `isOrdered` is unrelated to `Seq.Keyed` ordering: a `Seq.Keyed` built from an array of pairs will not pass `isOrdered` — only `OrderedMap` does for keyed shapes.
- `isCollection` is `false` for `Record` even though `isImmutable` is `true`.
- All concrete `is*` predicates imply `isCollection` except `isRecord`.
- `isMap`/`isSet` are union checks; prefer `isOrderedMap`/`isOrderedSet` when iteration order matters.

## Common patterns

```ts
// Idempotent fromJS-style normalization
const toMap = (v: unknown) => isMap(v) ? v : Map(v as any);

// Generic deep walker that handles plain JS and Immutable inputs
function walk(v: unknown, fn: (leaf: unknown) => void): void {
  if (isKeyed(v))      v.forEach(child => walk(child, fn));
  else if (isIndexed(v)) v.forEach(child => walk(child, fn));
  else fn(v);
}
```

## See also

- `list.md`, `map.md`, `set.md`, `stack.md`, `record.md`, `seq.md`
- `equality.md` — `is()` / `isValueObject()` for value equality
- `conversions.md` — `fromJS()` / `toJS()` boundaries where these checks are most useful
