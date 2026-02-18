import type { Map } from '../../type-definitions/immutable';

export const IS_MAP_SYMBOL = '@@__IMMUTABLE_MAP__@@';

/**
 * True if `maybeMap` is a Map.
 *
 * Also true for OrderedMaps.
 */
export function isMap(maybeMap: unknown): maybeMap is Map<unknown, unknown> {
  return (
    typeof maybeMap === 'object' &&
    maybeMap !== null &&
    IS_MAP_SYMBOL in maybeMap
  );
}
