`Stack` is an `Collection.Indexed` optimized for LIFO operations at the FRONT (index 0). Unlike `List` and the JavaScript `Array`, `push` and `pop` operate on the head of the collection, not the tail: `push(v)` is an alias for `unshift(v)` and `pop()` is an alias for `shift()`. Both are `O(1)` because Stack is implemented as a singly-linked list. Reach for `Stack` whenever the workload is dominated by head insertion/removal (parser/eval stacks, undo histories, DFS frontiers); reach for `List` when you need fast tail operations or random access. Reverse traversals (`reverse`, `reduceRight`, `lastIndexOf`, etc.) are not efficient on Stack.

## Construction

### Stack
```ts
Stack<T>(collection?: Iterable<T> | ArrayLike<T>): Stack<T>
```
Factory function (no `new`). Iteration order of the input is preserved; the first item of the input becomes the head (index 0).

### Stack.of
```ts
Stack.of<T>(...values: Array<T>): Stack<T>
```
Creates a Stack with the given values; the first argument becomes the head.

```ts
import { Stack } from 'immutable';
Stack.of(1, 2, 3); // => Stack [ 1, 2, 3 ]  (head is 1)
```

## Reading

### peek
```ts
peek(): T | undefined
```
Alias for `first()`; returns the value at the head without removing it.

### first
```ts
first(): T | undefined
```
Returns the value at index 0 (the head).

### last
```ts
last(): T | undefined
```
Returns the value at the tail. `O(n)` — Stack is singly-linked.

### get
```ts
get(key: number): T | undefined
get<NSV>(key: number, notSetValue: NSV): T | NSV
```
Index-based access; `O(n)` traversal from the head.

### size
```ts
readonly size: number
```

### includes / has / indexOf / lastIndexOf / find / findIndex
```ts
includes(value: T): boolean
has(key: number): boolean
indexOf(searchValue: T): number
lastIndexOf(searchValue: T): number
find(predicate, context?, notSetValue?): T | undefined
findIndex(predicate, context?): number
```
Equality uses `Immutable.is`. `lastIndexOf` and `findLast*` walk the entire stack in reverse and are not efficient. `findEntry`, `findKey`, `keyOf`, `lastKeyOf`, `findLast`, `findLastIndex` are inherited from `Collection.Indexed`.

## Persistent changes (head)

All mutating operations target the FRONT of the Stack. This is the key behavioral difference from `List`/`Array`.

### push / unshift
```ts
push(...values: Array<T>): Stack<T>
unshift(...values: Array<T>): Stack<T>
```
Both prepend `values` to the FRONT (`push` is an alias for `unshift`), shifting existing values to higher indices. NOT equivalent to `List#push` / `Array#push`, which append to the tail. `O(1)` per value.

```ts
Stack.of(1, 2).push(0);     // => Stack [ 0, 1, 2 ]
Stack.of(1, 2).push(9, 8);  // => Stack [ 9, 8, 1, 2 ]
```

### pushAll / unshiftAll
```ts
pushAll(iter: Iterable<T>): Stack<T>
unshiftAll(iter: Iterable<T>): Stack<T>
```
Iterable-accepting variants; both prepend to the FRONT. `pushAll` is an alias for `unshiftAll`.

### pop / shift
```ts
pop(): Stack<T>
shift(): Stack<T>
```
Both remove the value at the FRONT (`pop` is an alias for `shift`). NOT equivalent to `List#pop` / `Array#pop`. Returns the new Stack, NOT the removed value — use `peek()`/`first()` to read the head before popping. Differs from `Array#shift` for the same reason.

```ts
Stack.of(1, 2, 3).pop(); // => Stack [ 2, 3 ]
```

### clear
```ts
clear(): Stack<T>
```
Returns an empty Stack.

All of `push`, `pushAll`, `pop`, `unshift`, `unshiftAll`, `shift`, `clear` are safe inside `withMutations`.

## Sequence algorithms

### map / flatMap / filter / filterNot
```ts
map<M>(mapper: (value: T, key: number, iter: this) => M, context?: unknown): Stack<M>
flatMap<M>(mapper: (value: T, key: number, iter: this) => Iterable<M>, context?: unknown): Stack<M>
filter<F extends T>(predicate: (value: T, index: number, iter: this) => value is F, context?: unknown): Set<F>
filter(predicate: (value: T, index: number, iter: this) => unknown, context?: unknown): this
filterNot(predicate: (value: T, index: number, iter: this) => boolean, context?: unknown): this
```
Each returns a new Stack instance (or refined `Set` for the type-guard `filter` overload).

### concat
```ts
concat<C>(...valuesOrCollections: Array<Iterable<C> | C>): Stack<T | C>
```
Concatenates onto the END of this Stack (after the existing tail).

### reverse
```ts
reverse(): this
```
Eager and `O(n)` — Stack is singly-linked, so reverse traversal is not efficient.

### slice
```ts
slice(begin?: number, end?: number): this
```

### sort / sortBy
```ts
sort(comparator?: Comparator<T>): this
sortBy<C>(comparatorValueMapper: (value: T, key: number, iter: this) => C, comparator?: Comparator<C>): this
```
Stable, eager. Default comparator uses `<`/`>`; comparator may also return a `PairSorting` enum value.

### groupBy
```ts
groupBy<G>(grouper: (value: T, key: number, iter: this) => G, context?: unknown): Map<G, Stack<T>>
```
Eager; returns a `Map<G, Stack<T>>`.

### partition
```ts
partition<F extends T, C>(predicate: (this: C, value: T, index: number, iter: this) => value is F, context?: C): [Stack<T>, Stack<F>]
partition<C>(predicate: (this: C, value: T, index: number, iter: this) => unknown, context?: C): [this, this]
```
Returns `[falseMatches, trueMatches]`.

### zip / zipAll / zipWith
```ts
zip<U>(other: Collection<unknown, U>): Stack<[T, U]>
zipAll<U>(other: Collection<unknown, U>): Stack<[T, U]>
zipWith<U, Z>(zipper: (value: T, otherValue: U) => Z, other: Collection<unknown, U>): Stack<Z>
```
`zip` stops at the shortest input; `zipAll` continues to the longest, padding with `undefined`.

## Conversion

### toArray / toJS / toJSON
```ts
toArray(): Array<T>            // shallow; head becomes index 0
toJS(): Array<DeepCopy<T>>     // deep
toJSON(): Array<T>             // shallow (used by JSON.stringify)
```

### toSeq
```ts
toSeq(): Seq.Indexed<T>
```
Lazy `Seq.Indexed` view; also `toIndexedSeq()`, `toKeyedSeq()`, `toSetSeq()`.

### asMutable / asImmutable
```ts
asMutable(): this
asImmutable(): this
```
Manual transient pair; prefer `withMutations` for scoped batches.

## Mutation batching

### withMutations
```ts
withMutations(mutator: (mutable: this) => unknown): this
```
Apply a batch of head-mutations efficiently. Only methods documented as safe in `withMutations` may be used inside (`push`, `pushAll`, `pop`, `unshift`, `unshiftAll`, `shift`, `clear`).

```ts
Stack.of(1, 2).withMutations(s => {
  s.push(0).push(-1).pop();
}); // => Stack [ 0, 1, 2 ]
```

### wasAltered
```ts
wasAltered(): boolean
```
True if the most recent operation produced a structurally different Stack.

## See also

- `collection.md` — `Collection.Indexed` superclass methods Stack inherits.
- `list.md` — when you need fast TAIL operations, random access, or `Array`-like `push`/`pop` semantics.
- `predicates.md` — `Stack.isStack(value)`.
