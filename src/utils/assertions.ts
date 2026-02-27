export default function invariant(
  condition: unknown,
  error: string
): asserts condition {
  if (!condition) throw new Error(error);
}

export function assertNotInfinite(size: number): void {
  invariant(
    size !== Infinity,
    'Cannot perform this action with an infinite size.'
  );
}
