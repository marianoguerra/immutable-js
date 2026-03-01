import {
  CollectionImpl,
  KeyedCollectionImpl,
  IndexedCollectionImpl,
  SetCollectionImpl,
} from './Collection';
import {
  DONE,
  emptyIterator,
  mapEntries,
  makeEntryIterator,
  makeIterator,
  hasIterator,
  isIterator,
  getIterator,
  isEntriesIterable,
  isKeysIterable,
} from './Iterator';
import { reverseFactory, mapFactory } from './Operations';
import { ensureSize, wrapIndex } from './TrieUtils';
import {
  IS_INDEXED_SYMBOL,
  IS_KEYED_SYMBOL,
  IS_ORDERED_SYMBOL,
  IS_SEQ_SYMBOL,
  isAssociative,
  isCollection,
  isImmutable,
  isIndexed,
  isKeyed,
  isRecord,
  isSeq,
} from './predicates';
import { isArrayLike } from './utils/typeChecks';

export const Seq = (value) =>
  value === undefined || value === null
    ? emptySequence()
    : isImmutable(value)
      ? value.toSeq()
      : seqFromValue(value);

export const makeSequence = (collection) =>
  Object.create(
    (isKeyed(collection)
      ? KeyedSeqImpl
      : isIndexed(collection)
        ? IndexedSeqImpl
        : SetSeqImpl
    ).prototype
  );

export class SeqImpl extends CollectionImpl {
  static {
    this.prototype[IS_SEQ_SYMBOL] = true;
  }

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
    const iterator = this.__iteratorUncached(reverse);
    let iterations = 0;
    let step;
    while (!(step = iterator.next()).done) {
      iterations++;
      if (fn(step.value[1], step.value[0], this) === false) {
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
        const entry = cache[reverse ? size - ++i : i++];
        if (fn(entry[1], entry[0], this) === false) {
          break;
        }
      }
      return i;
    }
    return this.__iterateUncached(fn, reverse);
  }

  // abstract __iteratorUncached(reverse)

  __iterator(reverse) {
    const cache = this._cache;
    if (cache) {
      const size = cache.length;
      let i = 0;
      const result = { done: false, value: undefined };
      return makeIterator(() => {
        if (i === size) {
          return DONE;
        }
        result.value = cache[reverse ? size - ++i : i++];
        return result;
      });
    }
    return this.__iteratorUncached(reverse);
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
export class KeyedSeqImpl extends KeyedCollectionImpl {
  static {
    this.prototype[IS_SEQ_SYMBOL] = true;
    Object.assign(this.prototype, {
      cacheResult: SeqImpl.prototype.cacheResult,
      __iterateUncached: SeqImpl.prototype.__iterateUncached,
      __iterate: SeqImpl.prototype.__iterate,
      __iterator: SeqImpl.prototype.__iterator,
    });
  }

  toSeq() {
    return this;
  }

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
export class IndexedSeqImpl extends IndexedCollectionImpl {
  static {
    this.prototype[IS_SEQ_SYMBOL] = true;
    Object.assign(this.prototype, {
      cacheResult: SeqImpl.prototype.cacheResult,
      __iterateUncached: SeqImpl.prototype.__iterateUncached,
      __iterate: SeqImpl.prototype.__iterate,
      __iterator: SeqImpl.prototype.__iterator,
    });
  }

  toSeq() {
    return this;
  }

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

export class SetSeqImpl extends SetCollectionImpl {
  static {
    this.prototype[IS_SEQ_SYMBOL] = true;
    Object.assign(this.prototype, {
      cacheResult: SeqImpl.prototype.cacheResult,
      __iterateUncached: SeqImpl.prototype.__iterateUncached,
      __iterate: SeqImpl.prototype.__iterate,
      __iterator: SeqImpl.prototype.__iterator,
    });
  }

  toSeq() {
    return this;
  }

  toSetSeq() {
    return this;
  }
}

Seq.isSeq = isSeq;
Seq.Keyed = KeyedSeq;
Seq.Set = SetSeq;
Seq.Indexed = IndexedSeq;

export class ArraySeq extends IndexedSeqImpl {
  constructor(array) {
    super();
    this._array = array;
    this.size = array.length;
  }

  get(index, notSetValue) {
    return this.has(index) ? this._array[wrapIndex(this, index)] : notSetValue;
  }

  __iterateUncached(fn, reverse) {
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

  __iteratorUncached(reverse) {
    const array = this._array;
    const size = array.length;
    let i = 0;
    return makeEntryIterator((entry) => {
      if (i === size) {
        return false;
      }
      const ii = reverse ? size - ++i : i++;
      entry[0] = ii;
      entry[1] = array[ii];
      return true;
    });
  }
}

class ObjectSeq extends KeyedSeqImpl {
  static {
    this.prototype[IS_ORDERED_SYMBOL] = true;
  }

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

  __iterateUncached(fn, reverse) {
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

  __iteratorUncached(reverse) {
    const object = this._object;
    const keys = this._keys;
    const size = keys.length;
    let i = 0;
    return makeEntryIterator((entry) => {
      if (i === size) {
        return false;
      }
      const key = keys[reverse ? size - ++i : i++];
      entry[0] = key;
      entry[1] = object[key];
      return true;
    });
  }
}

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
    let iterations = 0;
    for (const value of this._collection) {
      if (fn(value, iterations, this) === false) {
        break;
      }
      iterations++;
    }
    return iterations;
  }

  __iteratorUncached(reverse) {
    if (reverse) {
      return this.cacheResult().__iterator(reverse);
    }
    const collection = this._collection;
    const iterator = getIterator(collection);
    if (!isIterator(iterator)) {
      return emptyIterator();
    }
    let iterations = 0;
    return makeEntryIterator((entry) => {
      const step = iterator.next();
      if (step.done) {
        return false;
      }
      entry[0] = iterations++;
      entry[1] = step.value;
      return true;
    });
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

// Classes moved from Operations.js to break circular dependencies.
// Top-level class definitions that extend Seq classes must live here
// so they are defined before Operations.js evaluates.

export class ConcatSeq extends SeqImpl {
  constructor(iterables) {
    super();

    this._wrappedIterables = iterables.flatMap((iterable) => {
      if (iterable._wrappedIterables) {
        return iterable._wrappedIterables;
      }
      return [iterable];
    });
    this.size = this._wrappedIterables.reduce((sum, iterable) => {
      if (sum !== undefined) {
        const size = iterable.size;
        if (size !== undefined) {
          return sum + size;
        }
      }
    }, 0);
    const first = this._wrappedIterables[0];
    if (first[IS_KEYED_SYMBOL]) {
      this[IS_KEYED_SYMBOL] = true;
    }
    if (first[IS_INDEXED_SYMBOL]) {
      this[IS_INDEXED_SYMBOL] = true;
    }
    if (first[IS_ORDERED_SYMBOL]) {
      this[IS_ORDERED_SYMBOL] = true;
    }
  }

  __iterateUncached(fn, reverse) {
    if (this._wrappedIterables.length === 0) {
      return 0;
    }

    if (reverse) {
      return this.cacheResult().__iterate(fn, reverse);
    }

    const wrappedIterables = this._wrappedIterables;
    const reIndex = !isKeyed(this);
    let index = 0;
    let stopped = false;
    for (const iterable of wrappedIterables) {
      iterable.__iterate((v, k) => {
        if (fn(v, reIndex ? index++ : k, this) === false) {
          stopped = true;
          return false;
        }
      }, reverse);
      if (stopped) {
        break;
      }
    }
    return index;
  }

  __iteratorUncached(reverse) {
    if (this._wrappedIterables.length === 0) {
      return emptyIterator();
    }

    if (reverse) {
      return this.cacheResult().__iterator(reverse);
    }

    const wrappedIterables = this._wrappedIterables;
    const reIndex = !isKeyed(this);
    let iterableIdx = 0;
    let currentIterator = wrappedIterables[0].__iterator(reverse);

    function nextStep() {
      while (iterableIdx < wrappedIterables.length) {
        const step = currentIterator.next();
        if (!step.done) return step;
        iterableIdx++;
        if (iterableIdx < wrappedIterables.length) {
          currentIterator = wrappedIterables[iterableIdx].__iterator(reverse);
        }
      }
      return undefined;
    }

    if (reIndex) {
      let index = 0;
      return makeEntryIterator((entry) => {
        const step = nextStep();
        if (!step) return false;
        entry[0] = index++;
        entry[1] = step.value[1];
        return true;
      });
    }
    return makeIterator(() => {
      return nextStep() || DONE;
    });
  }
}

export class ToKeyedSequence extends KeyedSeqImpl {
  static {
    this.prototype[IS_ORDERED_SYMBOL] = true;
  }

  constructor(indexed, useKeys) {
    super();

    this._iter = indexed;
    this._useKeys = useKeys;
    this.size = indexed.size;
  }

  cacheResult() {
    return cacheResultThrough.call(this);
  }

  get(key, notSetValue) {
    return this._iter.get(key, notSetValue);
  }

  has(key) {
    return this._iter.has(key);
  }

  valueSeq() {
    return this._iter.valueSeq();
  }

  reverse() {
    const reversedSequence = reverseFactory(this, true);
    if (!this._useKeys) {
      reversedSequence.valueSeq = () => this._iter.toSeq().reverse();
    }
    return reversedSequence;
  }

  map(mapper, context) {
    const mappedSequence = mapFactory(this, mapper, context);
    if (!this._useKeys) {
      mappedSequence.valueSeq = () => this._iter.toSeq().map(mapper, context);
    }
    return mappedSequence;
  }

  __iterateUncached(fn, reverse) {
    return this._iter.__iterate(fn, reverse);
  }

  __iteratorUncached(reverse) {
    return this._iter.__iterator(reverse);
  }
}

export class ToIndexedSequence extends IndexedSeqImpl {
  constructor(iter) {
    super();

    this._iter = iter;
    this.size = iter.size;
  }

  cacheResult() {
    return cacheResultThrough.call(this);
  }

  includes(value) {
    return this._iter.includes(value);
  }

  __iterateUncached(fn, reverse) {
    let i = 0;
    if (reverse) {
      ensureSize(this);
    }
    const size = this.size;
    this._iter.__iterate((v) => {
      const ii = reverse ? size - ++i : i++;
      return fn(v, ii, this);
    }, reverse);
    return i;
  }

  __iteratorUncached(reverse) {
    let i = 0;
    if (reverse) {
      ensureSize(this);
    }
    const size = this.size;
    return mapEntries(this._iter.__iterator(reverse), (k, v, entry) => {
      entry[0] = reverse ? size - ++i : i++;
      entry[1] = v;
    });
  }
}

export class ToSetSequence extends SetSeqImpl {
  constructor(iter) {
    super();

    this._iter = iter;
    this.size = iter.size;
  }

  cacheResult() {
    return cacheResultThrough.call(this);
  }

  has(key) {
    return this._iter.includes(key);
  }

  __iterateUncached(fn, reverse) {
    return this._iter.__iterate((v) => fn(v, v, this), reverse);
  }

  __iteratorUncached(reverse) {
    return mapEntries(this._iter.__iterator(reverse), (k, v, entry) => {
      entry[0] = v;
      entry[1] = v;
    });
  }
}

export class FromEntriesSequence extends KeyedSeqImpl {
  constructor(entries) {
    super();

    this._iter = entries;
    this.size = entries.size;
  }

  cacheResult() {
    return cacheResultThrough.call(this);
  }

  entrySeq() {
    return this._iter.toSeq();
  }

  __iterateUncached(fn, reverse) {
    let iterations = 0;
    this._iter.__iterate((entry) => {
      if (entry) {
        validateEntry(entry);
        iterations++;
        const indexedCollection = isCollection(entry);
        return fn(
          indexedCollection ? entry.get(1) : entry[1],
          indexedCollection ? entry.get(0) : entry[0],
          this
        );
      }
    }, reverse);
    return iterations;
  }

  __iteratorUncached(reverse) {
    const iterator = this._iter.__iterator(reverse);
    return makeEntryIterator((out) => {
      while (true) {
        const step = iterator.next();
        if (step.done) {
          return false;
        }
        const entry = step.value[1];
        if (entry) {
          validateEntry(entry);
          const indexedCollection = isCollection(entry);
          out[0] = indexedCollection ? entry.get(0) : entry[0];
          out[1] = indexedCollection ? entry.get(1) : entry[1];
          return true;
        }
      }
    });
  }
}

export function cacheResultThrough() {
  if (this._iter.cacheResult) {
    this._iter.cacheResult();
    this.size = this._iter.size;
    return this;
  }
  return SeqImpl.prototype.cacheResult.call(this);
}

function validateEntry(entry) {
  if (entry !== Object(entry)) {
    throw new TypeError(`Expected [K, V] tuple: ${entry}`);
  }
}
