export const ITERATE_KEYS = 0;
export const ITERATE_VALUES = 1;
export const ITERATE_ENTRIES = 2;

export type IteratorType =
  | typeof ITERATE_KEYS
  | typeof ITERATE_VALUES
  | typeof ITERATE_ENTRIES;

export function getValueFromType<K, V>(
  type: typeof ITERATE_KEYS,
  k: K,
  v: V
): K;
export function getValueFromType<K, V>(
  type: typeof ITERATE_VALUES,
  k: K,
  v: V
): V | undefined;
export function getValueFromType<K, V>(
  type: typeof ITERATE_ENTRIES,
  k: K,
  v: V
): [K, V] | undefined;
export function getValueFromType<K, V>(
  type: IteratorType,
  k: K,
  v: V
): K | V | [K, V];
export function getValueFromType<K, V>(
  type: IteratorType,
  k: K,
  v: V
): K | V | [K, V] {
  return type === ITERATE_KEYS ? k : type === ITERATE_VALUES ? v : [k, v];
}

export function* emptyIterator(): Generator<never, undefined> {}

export function hasIterator(
  maybeIterable: unknown
): maybeIterable is Iterable<unknown> {
  if (Array.isArray(maybeIterable)) {
    // Fast path: avoid symbol lookup for arrays
    return true;
  }

  return !!getIteratorFn(maybeIterable);
}

export function isIterator(
  maybeIterator: unknown
): maybeIterator is globalThis.Iterator<unknown> {
  return !!(
    maybeIterator &&
    // @ts-expect-error: maybeIterator is typed as `{}`
    typeof maybeIterator.next === 'function'
  );
}

export function getIterator(
  iterable: unknown
): globalThis.Iterator<unknown> | undefined {
  const iteratorFn = getIteratorFn(iterable);
  return iteratorFn?.call(iterable);
}

function getIteratorFn(
  iterable: unknown
): (() => globalThis.Iterator<unknown>) | undefined {
  const iteratorFn =
    iterable &&
    // @ts-expect-error: maybeIterator is typed as `{}`
    iterable[Symbol.iterator];
  if (typeof iteratorFn === 'function') {
    return iteratorFn;
  }
}

export function isEntriesIterable(
  maybeIterable: unknown
): maybeIterable is Iterable<[unknown, unknown]> {
  const iteratorFn = getIteratorFn(maybeIterable);
  // @ts-expect-error: maybeIterator is typed as `{}`
  return iteratorFn && iteratorFn === maybeIterable.entries;
}

export function isKeysIterable(
  maybeIterable: unknown
): maybeIterable is Iterable<unknown> {
  const iteratorFn = getIteratorFn(maybeIterable);
  // @ts-expect-error: maybeIterator is typed as `{}`
  return iteratorFn && iteratorFn === maybeIterable.keys;
}
