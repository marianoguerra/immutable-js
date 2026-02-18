import type { Set } from '../../type-definitions/immutable';

export const IS_SET_SYMBOL = '@@__IMMUTABLE_SET__@@';

/**
 * True if `maybeSet` is a Set.
 *
 * Also true for OrderedSets.
 */
export function isSet(maybeSet: unknown): maybeSet is Set<unknown> {
  return (
    typeof maybeSet === 'object' &&
    maybeSet !== null &&
    IS_SET_SYMBOL in maybeSet
  );
}
