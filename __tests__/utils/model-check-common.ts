import { expect } from '@jest/globals';
import fc from 'fast-check';

/**
 * A value type wide enough to exercise hashing and value-equality edge
 * cases (NaN, undefined, null, booleans, strings) while staying
 * deterministic in the plain-JS models used by the model-check suites.
 * `-0` is deliberately excluded: Immutable treats `-0` as `0` (via `is`)
 * while Jest's `toBe`/`toEqual` distinguish them, which would produce
 * false failures unrelated to the semantics under test.
 */
export type RichValue = number | string | boolean | null | undefined;

export const richValueArb: fc.Arbitrary<RichValue> = fc.oneof(
  { weight: 4, arbitrary: fc.integer() as fc.Arbitrary<RichValue> },
  { weight: 2, arbitrary: fc.string({ maxLength: 5 }) },
  {
    weight: 1,
    arbitrary: fc.constantFrom<RichValue>(NaN, undefined, null, true, false),
  }
);

/**
 * A key object with a deliberately colliding hashCode. Only a handful of
 * hash values exist across the pool, forcing Immutable's Map/Set into
 * HashCollisionNode paths. `equals` is identity-based so that a plain-JS
 * Map/Set keyed by reference remains a valid model.
 */
export class CollidingKey {
  constructor(readonly id: number) {}
  hashCode(): number {
    return this.id % 2;
  }
  equals(other: unknown): boolean {
    return other === this;
  }
  toString(): string {
    return `CollidingKey(${this.id})`;
  }
}

const collidingKeyPool = Array.from({ length: 6 }, (_, i) => new CollidingKey(i));

export type RichKey = RichValue | CollidingKey;

export const richKeyArb: fc.Arbitrary<RichKey> = fc.oneof(
  { weight: 3, arbitrary: fc.string({ maxLength: 5 }) as fc.Arbitrary<RichKey> },
  { weight: 2, arbitrary: fc.integer({ min: -100, max: 100 }) },
  {
    weight: 1,
    arbitrary: fc.constantFrom<RichKey>(NaN, undefined, null, true, false),
  },
  { weight: 2, arbitrary: fc.constantFrom(...collidingKeyPool) }
);

/** True when a value is safe to run through a numeric sort comparator. */
export function isSortableNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

/** expect(actual).toBe(expected), callable from command classes
 * (jest/no-standalone-expect flags expects in class methods but not in
 * functions). */
export function assertSame(actual: unknown, expected: unknown): void {
  expect(actual).toBe(expected);
}

/** expect(actual).toEqual(expected), callable from command classes. */
export function assertEqual(actual: unknown, expected: unknown): void {
  expect(actual).toEqual(expected);
}

/** Compact, stable label for command toString() output. */
export function show(v: unknown): string {
  if (v instanceof CollidingKey) return v.toString();
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(show).join(', ')}]`;
  return String(v);
}
