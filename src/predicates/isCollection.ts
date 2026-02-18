import type { CollectionImpl } from '../Collection';

// Note: value is unchanged to not break immutable-devtools.
export const IS_COLLECTION_SYMBOL = '@@__IMMUTABLE_ITERABLE__@@';

/**
 * True if `maybeCollection` is a Collection, or any of its subclasses.
 *
 * ```js
 * import { isCollection, Map, List, Stack } from 'immutable';
 *
 * isCollection([]); // false
 * isCollection({}); // false
 * isCollection(Map()); // true
 * isCollection(List()); // true
 * isCollection(Stack()); // true
 * ```
 */
export function isCollection(
  maybeCollection: unknown
): maybeCollection is CollectionImpl<unknown, unknown> {
  return (
    typeof maybeCollection === 'object' &&
    maybeCollection !== null &&
    IS_COLLECTION_SYMBOL in maybeCollection
  );
}
