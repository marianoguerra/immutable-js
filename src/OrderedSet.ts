/* eslint-disable @typescript-eslint/no-explicit-any -- the backing ordered
 * map comes from the still-untyped OrderedMap.js */
import {
  KeyedCollection,
  SetCollection,
  IndexedCollectionPrototype,
} from './Collection';
import { emptyOrderedMap } from './OrderedMap';
import { SetImpl } from './Set';
import type { OwnerID } from './TrieUtils';
import { mixin } from './methods';
import { IS_ORDERED_SYMBOL, isOrderedSet } from './predicates';
import { assertNotInfinite } from './utils/assertions';

export const OrderedSet = <T>(
  value?: Iterable<T> | ArrayLike<T>
): OrderedSetImpl<T> =>
  value === undefined || value === null
    ? emptyOrderedSet()
    : isOrderedSet(value)
      ? (value as unknown as OrderedSetImpl<T>)
      : emptyOrderedSet<T>().withMutations((set) => {
          const iter = SetCollection(value);
          assertNotInfinite(iter.size);
          iter.forEach((v) => set.add(v as T));
        });

OrderedSet.of = <T>(...values: Array<T>): OrderedSetImpl<T> =>
  OrderedSet(values);

OrderedSet.fromKeys = (value: unknown): OrderedSetImpl<unknown> =>
  OrderedSet(KeyedCollection(value).keySeq());

export class OrderedSetImpl<T> extends SetImpl<T> {
  static {
    mixin(this, {
      [IS_ORDERED_SYMBOL]: true,
      [Symbol.toStringTag]: 'Immutable.OrderedSet',
      // Borrowing indexed zip methods onto a set type is intentionally
      // type-incoherent; the public API types them properly.
      zip: IndexedCollectionPrototype.zip,
      zipWith: IndexedCollectionPrototype.zipWith,
      zipAll: IndexedCollectionPrototype.zipAll,
    });
  }

  override create(value: unknown): OrderedSetImpl<unknown> {
    return OrderedSet(value as Iterable<unknown>);
  }

  override toString(): string {
    return this.__toString('OrderedSet {', '}');
  }

  override __empty(): OrderedSetImpl<T> {
    return emptyOrderedSet();
  }
  override __make(map: any, ownerID?: OwnerID): OrderedSetImpl<T> {
    return makeOrderedSet(map, ownerID);
  }
}

OrderedSet.isOrderedSet = isOrderedSet;

const makeOrderedSet = <T>(map?: any, ownerID?: OwnerID): OrderedSetImpl<T> =>
  new OrderedSetImpl(map, ownerID);

const emptyOrderedSet = <T>(): OrderedSetImpl<T> =>
  makeOrderedSet(emptyOrderedMap());
