import {
  Collection,
  SetCollectionImpl,
  KeyedCollection,
  SetCollection,
} from './Collection';
import { emptyMap } from './Map';
import { sortFactory } from './Operations';
import { OrderedSet } from './OrderedSet';
import { DELETE } from './TrieUtils';
import { asImmutable, asMutable, withMutations } from './methods';
import { IS_SET_SYMBOL, isOrdered, isSet } from './predicates';
import { assertNotInfinite } from './utils/assertions';

export const Set = (value) =>
  value === undefined || value === null
    ? emptySet()
    : isSet(value) && !isOrdered(value)
      ? value
      : emptySet().withMutations((set) => {
          const iter = SetCollection(value);
          assertNotInfinite(iter.size);
          iter.forEach((v) => set.add(v));
        });

Set.of = (...values) => Set(values);

Set.fromKeys = (value) => Set(KeyedCollection(value).keySeq());

Set.intersect = (sets) => {
  sets = Collection(sets).toArray();
  return sets.length ? Set(sets.pop()).intersect(...sets) : emptySet();
};

Set.union = (sets) => {
  const setArray = Collection(sets).toArray();
  return setArray.length ? Set(setArray.pop()).union(...setArray) : emptySet();
};

export class SetImpl extends SetCollectionImpl {
  static {
    this.prototype[IS_SET_SYMBOL] = true;
    this.prototype[DELETE] = this.prototype.remove;
    this.prototype.merge = this.prototype.concat = this.prototype.union;
    this.prototype[Symbol.toStringTag] = 'Immutable.Set';
  }

  constructor(map, ownerID) {
    super();
    this.size = map ? map.size : 0;
    this._map = map;
    this.__ownerID = ownerID;
  }

  create(value) {
    return Set(value);
  }

  toString() {
    return this.__toString('Set {', '}');
  }

  has(value) {
    return this._map.has(value);
  }

  add(value) {
    return updateSet(this, this._map.set(value, value));
  }

  remove(value) {
    return updateSet(this, this._map.remove(value));
  }

  clear() {
    return updateSet(this, this._map.clear());
  }

  map(mapper, context) {
    // keep track if the set is altered by the map function
    let didChanges = false;

    const newMap = updateSet(
      this,
      this._map.mapEntries(([, v]) => {
        const mapped = mapper.call(context, v, v, this);

        if (mapped !== v) {
          didChanges = true;
        }

        return [mapped, mapped];
      }, context)
    );

    return didChanges ? newMap : this;
  }

  union(...iters) {
    iters = iters.filter((x) => x.size !== 0);
    if (iters.length === 0) {
      return this;
    }
    if (this.size === 0 && !this.__ownerID && iters.length === 1) {
      return Set(iters[0]);
    }
    return this.withMutations((set) => {
      for (const iter of iters) {
        if (typeof iter === 'string') {
          set.add(iter);
        } else {
          SetCollection(iter).forEach((value) => set.add(value));
        }
      }
    });
  }

  intersect(...iters) {
    return filterByIters(
      this,
      iters,
      (value, sets) => !sets.every((iter) => iter.includes(value))
    );
  }

  subtract(...iters) {
    return filterByIters(this, iters, (value, sets) =>
      sets.some((iter) => iter.includes(value))
    );
  }

  sort(comparator) {
    // Late binding
    return OrderedSet(sortFactory(this, comparator));
  }

  sortBy(mapper, comparator) {
    // Late binding
    return OrderedSet(sortFactory(this, comparator, mapper));
  }

  wasAltered() {
    return this._map.wasAltered();
  }

  __iterate(fn, reverse) {
    return this._map.__iterate((k) => fn(k, k, this), reverse);
  }

  __iterator(type, reverse) {
    return this._map.__iterator(type, reverse);
  }

  // methods.js wrappers
  withMutations(fn) {
    return withMutations.call(this, fn);
  }
  asImmutable() {
    return asImmutable.call(this);
  }
  asMutable() {
    return asMutable.call(this);
  }

  __empty() {
    return emptySet();
  }
  __make(map, ownerID) {
    return makeSet(map, ownerID);
  }

  __ensureOwner(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    const newMap = this._map.__ensureOwner(ownerID);
    if (!ownerID) {
      if (this.size === 0) {
        return this.__empty();
      }
      this.__ownerID = ownerID;
      this._map = newMap;
      return this;
    }
    return this.__make(newMap, ownerID);
  }
}

Set.isSet = isSet;

const makeSet = (map, ownerID) => new SetImpl(map, ownerID);

let EMPTY_SET;
const emptySet = () => EMPTY_SET || (EMPTY_SET = makeSet(emptyMap()));

function filterByIters(set, iters, shouldRemove) {
  if (iters.length === 0) {
    return set;
  }
  iters = iters.map((iter) => SetCollection(iter));
  const toRemove = [];
  set.forEach((value) => {
    if (shouldRemove(value, iters)) {
      toRemove.push(value);
    }
  });
  return set.withMutations((s) => {
    toRemove.forEach((value) => {
      s.remove(value);
    });
  });
}

function updateSet(set, newMap) {
  if (set.__ownerID) {
    set.size = newMap.size;
    set._map = newMap;
    return set;
  }
  return newMap === set._map
    ? set
    : newMap.size === 0
      ? set.__empty()
      : set.__make(newMap);
}
