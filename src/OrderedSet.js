import {
  KeyedCollection,
  SetCollection,
  IndexedCollectionPrototype,
} from './Collection';
import { emptyOrderedMap } from './OrderedMap';
import { SetImpl } from './Set';
import { IS_ORDERED_SYMBOL, isOrderedSet } from './predicates';
import { assertNotInfinite } from './utils/assertions';

export const OrderedSet = (value) =>
  value === undefined || value === null
    ? emptyOrderedSet()
    : isOrderedSet(value)
      ? value
      : emptyOrderedSet().withMutations((set) => {
          const iter = SetCollection(value);
          assertNotInfinite(iter.size);
          iter.forEach((v) => set.add(v));
        });

OrderedSet.of = (...values) => OrderedSet(values);

OrderedSet.fromKeys = (value) => OrderedSet(KeyedCollection(value).keySeq());
export class OrderedSetImpl extends SetImpl {
  static {
    this.prototype[IS_ORDERED_SYMBOL] = true;
    this.prototype[Symbol.toStringTag] = 'Immutable.OrderedSet';
    this.prototype.zip = IndexedCollectionPrototype.zip;
    this.prototype.zipWith = IndexedCollectionPrototype.zipWith;
    this.prototype.zipAll = IndexedCollectionPrototype.zipAll;
  }

  create(value) {
    return OrderedSet(value);
  }

  toString() {
    return this.__toString('OrderedSet {', '}');
  }

  __empty() {
    return emptyOrderedSet();
  }
  __make(map, ownerID) {
    return makeOrderedSet(map, ownerID);
  }
}

OrderedSet.isOrderedSet = isOrderedSet;

const makeOrderedSet = (map, ownerID) => new OrderedSetImpl(map, ownerID);

const emptyOrderedSet = () => makeOrderedSet(emptyOrderedMap());
