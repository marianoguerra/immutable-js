import type { List } from '../../type-definitions/immutable';

export const IS_LIST_SYMBOL = '@@__IMMUTABLE_LIST__@@';

/**
 * True if `maybeList` is a List.
 */
export function isList(maybeList: unknown): maybeList is List<unknown> {
  return (
    typeof maybeList === 'object' &&
    maybeList !== null &&
    IS_LIST_SYMBOL in maybeList
  );
}
