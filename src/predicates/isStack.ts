import type { Stack } from '../../type-definitions/immutable';

export const IS_STACK_SYMBOL = '@@__IMMUTABLE_STACK__@@';

/**
 * True if `maybeStack` is a Stack.
 */
export function isStack(maybeStack: unknown): maybeStack is Stack<unknown> {
  return (
    typeof maybeStack === 'object' &&
    maybeStack !== null &&
    IS_STACK_SYMBOL in maybeStack
  );
}
