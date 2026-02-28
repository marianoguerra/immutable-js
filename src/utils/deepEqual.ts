import type { CollectionImpl } from '../Collection';
import type { RangeImpl as Range } from '../Range';
import type { RepeatImpl as Repeat } from '../Repeat';
import { NOT_SET } from '../TrieUtils';
import { is } from '../is';
import {
  isAssociative,
  isCollection,
  isIndexed,
  isKeyed,
  isOrdered,
} from '../predicates';

export default function deepEqual(
  a: Range | Repeat | CollectionImpl<unknown, unknown>,
  b: unknown
): boolean {
  if (a === b) {
    return true;
  }

  if (
    !isCollection(b) ||
    (a.size !== undefined && b.size !== undefined && a.size !== b.size) ||
    (a.__hash !== undefined &&
      (b as CollectionImpl<unknown, unknown>).__hash !== undefined &&
      a.__hash !== (b as CollectionImpl<unknown, unknown>).__hash) ||
    isKeyed(a) !== isKeyed(b) ||
    isIndexed(a) !== isIndexed(b) ||
    isOrdered(a) !== isOrdered(b)
  ) {
    return false;
  }

  if (a.size === 0 && b.size === 0) {
    return true;
  }

  const notAssociative = !isAssociative(a);

  if (isOrdered(a)) {
    const entries = a.entries();
    return !!(
      b.every((v, k) => {
        const entry = entries.next().value;
        return entry && is(entry[1], v) && (notAssociative || is(entry[0], k));
      }) && entries.next().done
    );
  }

  let flipped = false;

  type Sized = { size?: number; cacheResult?: () => void };
  if ((a as unknown as Sized).size === undefined) {
    if ((b as unknown as Sized).size === undefined) {
      if (typeof (a as unknown as Sized).cacheResult === 'function') {
        (a as unknown as Sized).cacheResult!();
      }
    } else {
      flipped = true;
      const _ = a;
      a = b as CollectionImpl<unknown, unknown>;
      b = _;
    }
  }

  let allEqual = true;
  const bSize: number = (b as CollectionImpl<unknown, unknown>).__iterate(
    (v: unknown, k: unknown): boolean => {
      if (
        notAssociative
          ? !a.has(v as never)
          : flipped
            ? !is(v, a.get(k as never, NOT_SET as never))
            : !is(a.get(k as never, NOT_SET as never), v)
      ) {
        allEqual = false;
        return false;
      }
      return true;
    }
  );

  return allEqual && a.size === bSize;
}
