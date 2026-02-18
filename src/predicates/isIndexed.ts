import type { IndexedCollectionImpl } from '../Collection';

export const IS_INDEXED_SYMBOL = '@@__IMMUTABLE_INDEXED__@@';

/**
 * True if `maybeIndexed` is a Collection.Indexed, or any of its subclasses.
 *
 * ```js
 * import { isIndexed, Map, List, Stack, Set } from 'immutable';
 *
 * isIndexed([]); // false
 * isIndexed({}); // false
 * isIndexed(Map()); // false
 * isIndexed(List()); // true
 * isIndexed(Stack()); // true
 * isIndexed(Set()); // false
 * ```
 */
export function isIndexed<T>(
  maybeIndexed: unknown
): maybeIndexed is IndexedCollectionImpl<T> {
  return (
    typeof maybeIndexed === 'object' &&
    maybeIndexed !== null &&
    IS_INDEXED_SYMBOL in maybeIndexed
  );
}
