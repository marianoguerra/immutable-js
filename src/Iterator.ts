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

export const isIterator = (
  maybeIterator: unknown
): maybeIterator is globalThis.Iterator<unknown> =>
  !!(
    maybeIterator &&
    // @ts-expect-error: maybeIterator is typed as `{}`
    typeof maybeIterator.next === 'function'
  );

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
