import type { Seq } from '../../type-definitions/immutable';

export const IS_SEQ_SYMBOL = '@@__IMMUTABLE_SEQ__@@';

/**
 * True if `maybeSeq` is a Seq.
 */
export function isSeq(
  maybeSeq: unknown
): maybeSeq is
  | Seq.Indexed<unknown>
  | Seq.Keyed<unknown, unknown>
  | Seq.Set<unknown> {
  return (
    typeof maybeSeq === 'object' &&
    maybeSeq !== null &&
    IS_SEQ_SYMBOL in maybeSeq
  );
}
