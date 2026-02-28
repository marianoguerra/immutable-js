import type { CollectionImpl } from './Collection';
import { assertNotInfinite } from './utils/assertions';

export function reduce(
  collection: CollectionImpl<unknown, unknown>,
  reducer: (...args: unknown[]) => unknown,
  reduction: unknown,
  context: unknown,
  useFirst: boolean,
  reverse: boolean
) {
  assertNotInfinite(collection.size);
  collection.__iterate((v, k, c) => {
    if (useFirst) {
      useFirst = false;
      reduction = v;
    } else {
      reduction = reducer.call(context, reduction, v, k, c);
    }
  }, reverse);
  return reduction;
}

export const keyMapper = <K, V>(v: V, k: K): K => k;

export const entryMapper = <K, V>(v: V, k: K): [K, V] => [k, v];

export const not = (predicate: (...args: unknown[]) => boolean) =>
  function (this: unknown, ...args: unknown[]): boolean {
    return !predicate.apply(this, args);
  };

export const neg = (predicate: (...args: unknown[]) => number) =>
  function (this: unknown, ...args: unknown[]): number {
    return -predicate.apply(this, args);
  };

export const defaultNegComparator = (
  a: number | string,
  b: number | string
): number => (a < b ? 1 : a > b ? -1 : 0);
