import type { Record } from '../../type-definitions/immutable';

export const IS_RECORD_SYMBOL = '@@__IMMUTABLE_RECORD__@@';

/**
 * True if `maybeRecord` is a Record.
 */
export function isRecord(maybeRecord: unknown): maybeRecord is Record<object> {
  return (
    typeof maybeRecord === 'object' &&
    maybeRecord !== null &&
    IS_RECORD_SYMBOL in maybeRecord
  );
}
