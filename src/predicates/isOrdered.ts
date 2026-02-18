import type { OrderedCollection } from '../../type-definitions/immutable';

export const IS_ORDERED_SYMBOL = '@@__IMMUTABLE_ORDERED__@@';

/**
 * True if `maybeOrdered` is a Collection where iteration order is well
 * defined. True for Collection.Indexed as well as OrderedMap and OrderedSet.
 *
 * ```js
 * import { isOrdered, Map, OrderedMap, List, Set } from 'immutable';
 *
 * isOrdered([]); // false
 * isOrdered({}); // false
 * isOrdered(Map()); // false
 * isOrdered(OrderedMap()); // true
 * isOrdered(List()); // true
 * isOrdered(Set()); // false
 * ```
 */
export function isOrdered<I>(
  maybeOrdered: Iterable<I>
): maybeOrdered is OrderedCollection<I>;
export function isOrdered(
  maybeOrdered: unknown
): maybeOrdered is OrderedCollection<unknown>;
export function isOrdered(
  maybeOrdered: unknown
): maybeOrdered is OrderedCollection<unknown> {
  return (
    typeof maybeOrdered === 'object' &&
    maybeOrdered !== null &&
    IS_ORDERED_SYMBOL in maybeOrdered
  );
}
