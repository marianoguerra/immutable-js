import { CollectionImpl } from './Collection';
import {
  emptyIterator,
  getValueFromType,
  hasIterator,
  isIterator,
  getIterator,
  isEntriesIterable,
  isKeysIterable,
  ITERATE_ENTRIES,
} from './Iterator';
import { wrapIndex } from './TrieUtils';
import { isAssociative } from './predicates/isAssociative';
import { isCollection } from './predicates/isCollection';
import { isImmutable } from './predicates/isImmutable';
import { isKeyed } from './predicates/isKeyed';
import { IS_ORDERED_SYMBOL } from './predicates/isOrdered';
import { isRecord } from './predicates/isRecord';
import { IS_SEQ_SYMBOL, isSeq } from './predicates/isSeq';
import isArrayLike from './utils/isArrayLike';

export const Seq = (value) =>
  value === undefined || value === null
    ? emptySequence()
    : isImmutable(value)
      ? value.toSeq()
      : seqFromValue(value);
export class SeqImpl extends CollectionImpl {
  toSeq() {
    return this;
  }

  toString() {
    return this.__toString('Seq {', '}');
  }

  cacheResult() {
    if (!this._cache && this.__iterateUncached) {
      this._cache = this.entrySeq().toArray();
      this.size = this._cache.length;
    }
    return this;
  }

  __iterateUncached(fn, reverse) {
    let iterations = 0;
    for (const [key, value] of this.__iteratorUncached(
      ITERATE_ENTRIES,
      reverse
    )) {
      iterations++;
      if (fn(value, key, this) === false) {
        break;
      }
    }
    return iterations;
  }

  __iterate(fn, reverse) {
    const cache = this._cache;
    if (cache) {
      const size = cache.length;
      let i = 0;
      while (i !== size) {
        const [key, value] = cache[reverse ? size - ++i : i++];
        if (fn(value, key, this) === false) {
          break;
        }
      }
      return i;
    }
    return this.__iterateUncached(fn, reverse);
  }

  // abstract __iteratorUncached(type, reverse)

  __iterator(type, reverse) {
    const cache = this._cache;
    if (cache) {
      const size = cache.length;
      let i = 0;
      function* gen() {
        while (i !== size) {
          const [key, value] = cache[reverse ? size - ++i : i++];
          yield getValueFromType(type, key, value);
        }
      }
      return gen();
    }
    return this.__iteratorUncached(type, reverse);
  }
}

export const KeyedSeq = (value) =>
  value === undefined || value === null
    ? emptySequence().toKeyedSeq()
    : isCollection(value)
      ? isKeyed(value)
        ? value.toSeq()
        : value.fromEntrySeq()
      : isRecord(value)
        ? value.toSeq()
        : keyedSeqFromValue(value);
export class KeyedSeqImpl extends SeqImpl {
  toKeyedSeq() {
    return this;
  }
}

export const IndexedSeq = (value) =>
  value === undefined || value === null
    ? emptySequence()
    : isCollection(value)
      ? isKeyed(value)
        ? value.entrySeq()
        : value.toIndexedSeq()
      : isRecord(value)
        ? value.toSeq().entrySeq()
        : indexedSeqFromValue(value);

IndexedSeq.of = (...values) => IndexedSeq(values);
export class IndexedSeqImpl extends SeqImpl {
  toIndexedSeq() {
    return this;
  }

  toString() {
    return this.__toString('Seq [', ']');
  }
}
export const SetSeq = (value) =>
  (isCollection(value) && !isAssociative(value)
    ? value
    : IndexedSeq(value)
  ).toSetSeq();

SetSeq.of = (...values) => SetSeq(values);

export class SetSeqImpl extends SeqImpl {
  toSetSeq() {
    return this;
  }
}

Seq.isSeq = isSeq;
Seq.Keyed = KeyedSeq;
Seq.Set = SetSeq;
Seq.Indexed = IndexedSeq;

SeqImpl.prototype[IS_SEQ_SYMBOL] = true;

export class ArraySeq extends IndexedSeqImpl {
  constructor(array) {
    super();
    this._array = array;
    this.size = array.length;
  }

  get(index, notSetValue) {
    return this.has(index) ? this._array[wrapIndex(this, index)] : notSetValue;
  }

  __iterate(fn, reverse) {
    const array = this._array;
    const size = array.length;
    let i = 0;
    while (i !== size) {
      const ii = reverse ? size - ++i : i++;
      if (fn(array[ii], ii, this) === false) {
        break;
      }
    }
    return i;
  }

  __iterator(type, reverse) {
    const array = this._array;
    const size = array.length;
    let i = 0;
    function* gen() {
      while (i !== size) {
        const ii = reverse ? size - ++i : i++;
        yield getValueFromType(type, ii, array[ii]);
      }
    }
    return gen();
  }
}

class ObjectSeq extends KeyedSeqImpl {
  constructor(object) {
    super();
    const keys = [
      ...Object.keys(object),
      ...Object.getOwnPropertySymbols(object),
    ];
    this._object = object;
    this._keys = keys;
    this.size = keys.length;
  }

  get(key, notSetValue) {
    if (notSetValue !== undefined && !this.has(key)) {
      return notSetValue;
    }
    return this._object[key];
  }

  has(key) {
    return Object.hasOwn(this._object, key);
  }

  __iterate(fn, reverse) {
    const object = this._object;
    const keys = this._keys;
    const size = keys.length;
    let i = 0;
    while (i !== size) {
      const key = keys[reverse ? size - ++i : i++];
      if (fn(object[key], key, this) === false) {
        break;
      }
    }
    return i;
  }

  __iterator(type, reverse) {
    const object = this._object;
    const keys = this._keys;
    const size = keys.length;
    let i = 0;
    function* gen() {
      while (i !== size) {
        const key = keys[reverse ? size - ++i : i++];
        yield getValueFromType(type, key, object[key]);
      }
    }
    return gen();
  }
}
ObjectSeq.prototype[IS_ORDERED_SYMBOL] = true;

class CollectionSeq extends IndexedSeqImpl {
  constructor(collection) {
    super();
    this._collection = collection;
    this.size = collection.length || collection.size;
  }

  __iterateUncached(fn, reverse) {
    if (reverse) {
      return this.cacheResult().__iterate(fn, reverse);
    }
    const collection = this._collection;
    const iterator = getIterator(collection);
    if (!isIterator(iterator)) {
      return 0;
    }
    let iterations = 0;
    for (const value of iterator) {
      if (fn(value, iterations++, this) === false) {
        break;
      }
    }
    return iterations;
  }

  __iteratorUncached(type, reverse) {
    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    const collection = this._collection;
    const iterator = getIterator(collection);
    if (!isIterator(iterator)) {
      return emptyIterator();
    }
    let iterations = 0;
    function* gen() {
      for (const value of iterator) {
        yield getValueFromType(type, iterations++, value);
      }
    }
    return gen();
  }
}

// # pragma Helper functions
const emptySequence = () => new ArraySeq([]);

const maybeIndexedSeqFromValue = (value) =>
  isArrayLike(value)
    ? new ArraySeq(value)
    : hasIterator(value)
      ? new CollectionSeq(value)
      : undefined;

export function keyedSeqFromValue(value) {
  const seq = maybeIndexedSeqFromValue(value);
  if (seq) {
    return seq.fromEntrySeq();
  }
  if (typeof value === 'object') {
    return new ObjectSeq(value);
  }
  throw new TypeError(
    `Expected Array or collection object of [k, v] entries, or keyed object: ${value}`
  );
}

export function indexedSeqFromValue(value) {
  const seq = maybeIndexedSeqFromValue(value);
  if (seq) {
    return seq;
  }
  throw new TypeError(
    `Expected Array or collection object of values: ${value}`
  );
}

function seqFromValue(value) {
  const seq = maybeIndexedSeqFromValue(value);
  if (seq) {
    return isEntriesIterable(value)
      ? seq.fromEntrySeq()
      : isKeysIterable(value)
        ? seq.toSetSeq()
        : seq;
  }
  if (typeof value === 'object') {
    return new ObjectSeq(value);
  }
  throw new TypeError(
    `Expected Array or collection object of values, or keyed object: ${value}`
  );
}
