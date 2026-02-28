import {
  CollectionImpl,
  KeyedCollectionImpl,
  IndexedCollectionImpl,
  SetCollectionImpl,
} from './Collection';
import {
  emptyIterator,
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

// SeqImpl is retained as the base for internal operation sequences (ConcatSeq
// in Operations.js) and for makeSequence()'s Object.create() pattern.
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
    let iterations = 0;
    for (const [key, value] of this.__iteratorUncached(reverse)) {
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

  // abstract __iteratorUncached(reverse)

  __iterator(reverse) {
    const cache = this._cache;
    if (cache) {
      const size = cache.length;
      let i = 0;
      function* gen() {
        while (i !== size) {
          yield cache[reverse ? size - ++i : i++];
        }
      }
      return gen();
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

  *__iteratorUncached(reverse) {
    const array = this._array;
    const size = array.length;
    let i = 0;
    while (i !== size) {
      const ii = reverse ? size - ++i : i++;
      yield [ii, array[ii]];
    }
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

  *__iteratorUncached(reverse) {
    const object = this._object;
    const keys = this._keys;
    const size = keys.length;
    let i = 0;
    while (i !== size) {
      const key = keys[reverse ? size - ++i : i++];
      yield [key, object[key]];
    }
  }
}

class CollectionSeq extends IndexedSeqImpl {
  constructor(collection) {
    super();
    this._collection = collection;
    this.size = collection.length || collection.size;
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
    function* gen() {
      for (const value of iterator) {
        yield [iterations++, value];
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

  __iteratorUncached(reverse) {
    if (this._wrappedIterables.length === 0) {
      return emptyIterator();
    }

    if (reverse) {
      return this.cacheResult().__iterator(reverse);
    }

    const wrappedIterables = this._wrappedIterables;
    const reIndex = !isKeyed(this);
    function* gen() {
      let index = 0;
      for (const iterable of wrappedIterables) {
        if (reIndex) {
          for (const [, value] of iterable.__iterator(reverse)) {
            yield [index++, value];
          }
        } else {
          yield* iterable.__iterator(reverse);
        }
      }
    }
    return gen();
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

  *__iteratorUncached(reverse) {
    yield* this._iter.__iterator(reverse);
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

  *__iteratorUncached(reverse) {
    let i = 0;
    if (reverse) {
      ensureSize(this);
    }
    const size = this.size;
    for (const [, value] of this._iter.__iterator(reverse)) {
      yield [reverse ? size - ++i : i++, value];
    }
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

  *__iteratorUncached(reverse) {
    for (const [, value] of this._iter.__iterator(reverse)) {
      yield [value, value];
    }
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

  *__iteratorUncached(reverse) {
    for (const [, entry] of this._iter.__iterator(reverse)) {
      // Check if entry exists first so array access doesn't throw for holes
      // in the parent iteration.
      if (entry) {
        validateEntry(entry);
        const indexedCollection = isCollection(entry);
        yield [
          indexedCollection ? entry.get(0) : entry[0],
          indexedCollection ? entry.get(1) : entry[1],
        ];
      }
    }
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
