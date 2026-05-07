---
name: immutable-js
description: Reference for the Immutable.js API organized by datatype (List, Map, Set, OrderedMap, OrderedSet, Stack, Record, Seq, Collection, Range, Repeat) and by topic (deep updates, equality, type predicates, JS conversion). Use when the user asks how to use a specific Immutable.js datatype or method, when writing or reviewing code that imports from `immutable`, or when explaining Immutable.js semantics like persistent updates, value equality, or lazy evaluation.
---

# Immutable.js

Persistent immutable data structures: every operation returns a new collection,
never mutates. Treat collections as **values** — compare with `is(a, b)` or
`a.equals(b)`, never `===`. See [equality.md](references/equality.md).

## Inheritance cheatsheet

```
Collection ─┬─ Collection.Keyed   ─┬─ Map ── OrderedMap
            │                      └─ Record (object-like, fixed keys)
            │
            ├─ Collection.Indexed ─┬─ List
            │                      └─ Stack
            │
            └─ Collection.Set     ─┬─ Set ── OrderedSet
                                   └─ (OrderedCollection marker)

Seq mirrors the hierarchy lazily:
  Seq ─┬─ Seq.Keyed   ─ keyed lazy sequence
       ├─ Seq.Indexed ─ indexed lazy sequence
       └─ Seq.Set     ─ set-like lazy sequence
```

## How to use this skill

Load only the reference file(s) that match the question — do not preload
all of them. Pick a datatype file when the question is about one type's
methods; pick an operations/topics file when the question crosses types
(deep updates, equality, conversions). For exact signatures, fall back
to `type-definitions/immutable.d.ts` (see *Authoritative sources* below).

## Datatypes

Read the reference for a specific datatype when answering questions about
its constructors, methods, or semantics.

- [List](references/list.md) — ordered indexed collection (push/pop/get/set/etc.)
- [Map](references/map.md) — keyed collection with value-equality keys; covers OrderedMap
- [Set](references/set.md) — unique values with value equality; covers OrderedSet
- [Stack](references/stack.md) — LIFO; fast push/pop/peek at the front
- [Record](references/record.md) — fixed-shape, named, typed record; class-like
- [Seq](references/seq.md) — lazy sequence (Keyed / Indexed / Set variants)
- [Collection](references/collection.md) — abstract base; methods shared by all collections
- [Range, Repeat](references/range-repeat.md) — lazy generator factories

## Operations and topics

Cross-cutting topics. Load these alongside (or instead of) a datatype reference
when the question is about an operation rather than a single type.

- [Deep updates](references/deep-updates.md) — `getIn`, `setIn`, `updateIn`, `removeIn`, `hasIn`, `merge`, `mergeWith`, `mergeDeep`, `mergeDeepWith`
- [Shallow functional helpers](references/shallow-functional.md) — top-level `get`, `set`, `has`, `update`, `remove` that work on any collection or plain JS object
- [JS conversions](references/conversions.md) — `fromJS`, `toJS`, plain-JS interop, reviver patterns
- [Equality and hashing](references/equality.md) — `is`, `hash`, `ValueObject`, `isValueObject`, value vs reference semantics
- [Type predicates](references/predicates.md) — `isList`, `isMap`, `isSet`, `isOrderedMap`, `isOrderedSet`, `isStack`, `isRecord`, `isSeq`, `isCollection`, `isKeyed`, `isIndexed`, `isAssociative`, `isOrdered`, `isImmutable`

## Cross-cutting semantics worth knowing up front

- **Value equality**: keys in `Map`/`Set` and elements in `Set` compare by `is()`, not `===`. Two distinct `Map({a:1})` instances are equal as keys.
- **Identity preservation**: an operation that produces an equal collection returns the original (`===`-identical), so memoization with `===` is sound.
- **Mutation batching**: `withMutations(c => { c.set(...).push(...) })` builds a transient copy; cheaper than chained calls when doing many updates.
- **Lazy `Seq`**: chained `map`/`filter`/etc. on a `Seq` doesn't run until something pulls values (e.g. `toList()`, `forEach`, iteration). See [seq.md](references/seq.md).
- **Path-based updates**: `setIn`/`updateIn`/`mergeDeep` create missing intermediate `Map`s by default. See [deep-updates.md](references/deep-updates.md).
- **`fromJS` is shallow-recursive**: arrays become `List`, plain objects become `Map`. Customize with the `reviver`. See [conversions.md](references/conversions.md).

## Authoritative sources in this repo

When a reference here is ambiguous or you need an exact signature, fall back to:

- `type-definitions/immutable.d.ts` — canonical TypeScript signatures for the entire public API
- `website/docs/<Name>.mdx` — the original long-form docs each reference here distills
- `README.md` — top-level rationale and worked examples
