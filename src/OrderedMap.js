import { CollectionImpl, KeyedCollection } from './Collection';
import { makeEntryIterator } from './Iterator';
import { emptyList } from './List';
import { MapImpl, emptyMap } from './Map';
import { DELETE, NOT_SET, SIZE } from './TrieUtils';
import { IS_ORDERED_SYMBOL, isOrderedMap } from './predicates';
import { assertNotInfinite } from './utils/assertions';

export const OrderedMap = (value) =>
  value === undefined || value === null
    ? emptyOrderedMap()
    : isOrderedMap(value)
      ? value
      : emptyOrderedMap().withMutations((map) => {
          const iter = KeyedCollection(value);
          assertNotInfinite(iter.size);
          iter.forEach((v, k) => map.set(k, v));
        });
OrderedMap.of = (...values) => OrderedMap(values);
export class OrderedMapImpl extends MapImpl {
  static {
    this.prototype[IS_ORDERED_SYMBOL] = true;
    this.prototype[DELETE] = this.prototype.remove;
    this.prototype[Symbol.toStringTag] = 'Immutable.OrderedMap';
  }

  constructor(map, list, ownerID, hash) {
    super(map ? map.size : 0, undefined, ownerID, hash);
    this._map = map;
    this._list = list;
  }

  create(value) {
    return OrderedMap(value);
  }

  toString() {
    return this.__toString('OrderedMap {', '}');
  }

  get(k, notSetValue) {
    const index = this._map.get(k);
    return index !== undefined ? this._list.get(index)[1] : notSetValue;
  }

  clear() {
    if (this.size === 0) {
      return this;
    }
    if (this.__ownerID) {
      this.size = 0;
      this._map.clear();
      this._list.clear();
      this.__altered = true;
      return this;
    }
    return emptyOrderedMap();
  }

  set(k, v) {
    return updateOrderedMap(this, k, v);
  }

  remove(k) {
    return updateOrderedMap(this, k, NOT_SET);
  }

  // Override MapImpl's trie-based __iterate since OrderedMap uses _list, not the trie.
  __iterate(fn, reverse) {
    return CollectionImpl.prototype.__iterate.call(this, fn, reverse);
  }

  __iterator(reverse) {
    const listIter = this._list.__iterator(reverse);
    return makeEntryIterator((entry) => {
      while (true) {
        const step = listIter.next();
        if (step.done) {
          return false;
        }
        const e = step.value[1];
        if (e) {
          entry[0] = e[0];
          entry[1] = e[1];
          return true;
        }
      }
    });
  }

  __ensureOwner(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    const newMap = this._map.__ensureOwner(ownerID);
    const newList = this._list.__ensureOwner(ownerID);
    if (!ownerID) {
      if (this.size === 0) {
        return emptyOrderedMap();
      }
      this.__ownerID = ownerID;
      this.__altered = false;
      this._map = newMap;
      this._list = newList;
      return this;
    }
    return makeOrderedMap(newMap, newList, ownerID, this.__hash);
  }
}

OrderedMap.isOrderedMap = isOrderedMap;

const makeOrderedMap = (map, list, ownerID, hash) =>
  new OrderedMapImpl(map, list, ownerID, hash);

export const emptyOrderedMap = () => makeOrderedMap(emptyMap(), emptyList());

function updateOrderedMap(omap, k, v) {
  const { _map: map, _list: list } = omap;
  const i = map.get(k);
  const has = i !== undefined;
  let newMap;
  let newList;
  if (v === NOT_SET) {
    // entry is being removed
    if (!has) {
      return omap;
    }
    if (list.size >= SIZE && list.size >= map.size * 2) {
      newList = list.filter((entry, idx) => entry !== undefined && i !== idx);
      newMap = newList
        .toKeyedSeq()
        .map((entry) => entry[0])
        .flip()
        .toMap();
      if (omap.__ownerID) {
        newMap.__ownerID = newList.__ownerID = omap.__ownerID;
      }
    } else {
      newMap = map.remove(k);
      newList = i === list.size - 1 ? list.pop() : list.set(i, undefined);
    }
  } else if (has) {
    if (v === list.get(i)[1]) {
      return omap;
    }
    newMap = map;
    newList = list.set(i, [k, v]);
  } else {
    newMap = map.set(k, list.size);
    newList = list.set(list.size, [k, v]);
  }
  if (omap.__ownerID) {
    omap.size = newMap.size;
    omap._map = newMap;
    omap._list = newList;
    omap.__hash = undefined;
    omap.__altered = true;
    return omap;
  }
  return makeOrderedMap(newMap, newList);
}
