export const DONE: IteratorResult<never> = {
  done: true,
  value: undefined as never,
};

export function makeIterator<T>(
  next: () => IteratorResult<T>
): IterableIterator<T> {
  return {
    next,
    [Symbol.iterator]() {
      return this;
    },
  };
}

/**
 * Creates an entry-yielding iterator with reduced allocations.
 * The `next` callback receives a reusable [key, value] tuple to populate;
 * return true to yield a *copy* of it, or false when done.
 * Reuses the {done, value} result wrapper object across calls.
 */
export function makeEntryIterator<K, V>(
  next: (entry: [K, V]) => boolean
): IterableIterator<[K, V]> {
  const entry = [undefined, undefined] as unknown as [K, V];
  const result: IteratorResult<[K, V]> = {
    done: false,
    value: undefined as unknown as [K, V],
  };
  return makeIterator(() => {
    if (next(entry)) {
      result.value = [entry[0], entry[1]];
      return result;
    }
    return DONE as IteratorResult<[K, V]>;
  });
}

const EMPTY_ITERATOR: IterableIterator<never> = makeIterator(
  () => DONE
) as IterableIterator<never>;
export const emptyIterator = (): IterableIterator<never> => EMPTY_ITERATOR;

export function makeIndexKeys(size: number): IterableIterator<number> {
  let i = 0;
  const result: IteratorResult<number> = {
    done: false,
    value: undefined as unknown as number,
  };
  return makeIterator(() => {
    if (i === size) return DONE as IteratorResult<number>;
    result.value = i++;
    return result;
  });
}

export function mapEntries<K, V>(
  source: IterableIterator<[unknown, unknown]>,
  transform: (key: unknown, value: unknown, entry: [K, V]) => void
): IterableIterator<[K, V]> {
  return makeEntryIterator((entry: [K, V]) => {
    const step = source.next();
    if (step.done) return false;
    transform(step.value[0], step.value[1], entry);
    return true;
  });
}

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
