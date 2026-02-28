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

export function defaultComparator(a: unknown, b: unknown): number {
  if (a === undefined && b === undefined) {
    return 0;
  }

  if (a === undefined) {
    return 1;
  }

  if (b === undefined) {
    return -1;
  }

  return (a as number) > (b as number)
    ? 1
    : (a as number) < (b as number)
      ? -1
      : 0;
}

export const defaultNegComparator = (
  a: number | string,
  b: number | string
): number => (a < b ? 1 : a > b ? -1 : 0);
