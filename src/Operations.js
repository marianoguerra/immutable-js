import {
  Collection,
  KeyedCollection,
  SetCollection,
  IndexedCollection,
} from './Collection';
import {
  getIterator,
  emptyIterator,
  getValueFromType,
  ITERATE_KEYS,
  ITERATE_VALUES,
  ITERATE_ENTRIES,
} from './Iterator';
import { Map } from './Map';
import { OrderedMap } from './OrderedMap';
import {
  SeqImpl,
  KeyedSeq,
  SetSeq,
  IndexedSeq,
  keyedSeqFromValue,
  indexedSeqFromValue,
  ArraySeq,
  KeyedSeqImpl,
  IndexedSeqImpl,
  SetSeqImpl,
} from './Seq';
import {
  NOT_SET,
  ensureSize,
  wrapIndex,
  wholeSlice,
  resolveBegin,
  resolveEnd,
} from './TrieUtils';
import { isCollection } from './predicates/isCollection';
import { IS_INDEXED_SYMBOL, isIndexed } from './predicates/isIndexed';
import { IS_KEYED_SYMBOL, isKeyed } from './predicates/isKeyed';
import { isOrdered, IS_ORDERED_SYMBOL } from './predicates/isOrdered';
import { isSeq } from './predicates/isSeq';

export class ToKeyedSequence extends KeyedSeqImpl {
  constructor(indexed, useKeys) {
    super();

    this._iter = indexed;
    this._useKeys = useKeys;
    this.size = indexed.size;
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

  __iterate(fn, reverse) {
    return this._iter.__iterate((v, k) => fn(v, k, this), reverse);
  }

  __iterator(type, reverse) {
    return this._iter.__iterator(type, reverse);
  }
}
ToKeyedSequence.prototype[IS_ORDERED_SYMBOL] = true;

export class ToIndexedSequence extends IndexedSeqImpl {
  constructor(iter) {
    super();

    this._iter = iter;
    this.size = iter.size;
  }

  includes(value) {
    return this._iter.includes(value);
  }

  __iterate(fn, reverse) {
    let i = 0;
    if (reverse) {
      ensureSize(this);
    }
    return this._iter.__iterate(
      (v) => fn(v, reverse ? this.size - ++i : i++, this),
      reverse
    );
  }

  __iterator(type, reverse) {
    const iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
    let i = 0;
    if (reverse) {
      ensureSize(this);
    }
    return (function* (self) {
      for (const value of iterator) {
        yield getValueFromType(type, reverse ? self.size - ++i : i++, value);
      }
    })(this);
  }
}

export class ToSetSequence extends SetSeqImpl {
  constructor(iter) {
    super();

    this._iter = iter;
    this.size = iter.size;
  }

  has(key) {
    return this._iter.includes(key);
  }

  __iterate(fn, reverse) {
    return this._iter.__iterate((v) => fn(v, v, this), reverse);
  }

  __iterator(type, reverse) {
    const iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
    return (function* () {
      for (const value of iterator) {
        yield getValueFromType(type, value, value);
      }
    })();
  }
}

export class FromEntriesSequence extends KeyedSeqImpl {
  constructor(entries) {
    super();

    this._iter = entries;
    this.size = entries.size;
  }

  entrySeq() {
    return this._iter.toSeq();
  }

  __iterate(fn, reverse) {
    return this._iter.__iterate((entry) => {
      // Check if entry exists first so array access doesn't throw for holes
      // in the parent iteration.
      if (entry) {
        validateEntry(entry);
        const indexedCollection = isCollection(entry);
        return fn(
          indexedCollection ? entry.get(1) : entry[1],
          indexedCollection ? entry.get(0) : entry[0],
          this
        );
      }
    }, reverse);
  }

  __iterator(type, reverse) {
    const iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
    return (function* () {
      for (const entry of iterator) {
        // Check if entry exists first so array access doesn't throw for holes
        // in the parent iteration.
        if (entry) {
          validateEntry(entry);
          const indexedCollection = isCollection(entry);
          yield getValueFromType(
            type,
            indexedCollection ? entry.get(0) : entry[0],
            indexedCollection ? entry.get(1) : entry[1]
          );
        }
      }
    })();
  }
}

ToIndexedSequence.prototype.cacheResult =
  ToKeyedSequence.prototype.cacheResult =
  ToSetSequence.prototype.cacheResult =
  FromEntriesSequence.prototype.cacheResult =
    cacheResultThrough;

export function flipFactory(collection) {
  const flipSequence = makeSequence(collection);
  flipSequence._iter = collection;
  flipSequence.size = collection.size;
  flipSequence.flip = () => collection;
  flipSequence.reverse = function () {
    const reversedSequence = collection.reverse.apply(this); // super.reverse()
    reversedSequence.flip = () => collection.reverse();
    return reversedSequence;
  };
  flipSequence.has = (key) => collection.includes(key);
  flipSequence.includes = (key) => collection.has(key);
  flipSequence.cacheResult = cacheResultThrough;
  flipSequence.__iteratorUncached = function (type, reverse) {
    if (type === ITERATE_ENTRIES) {
      const iterator = collection.__iterator(type, reverse);
      return (function* () {
        for (const entry of iterator) {
          yield [entry[1], entry[0]];
        }
      })();
    }
    return collection.__iterator(
      type === ITERATE_VALUES ? ITERATE_KEYS : ITERATE_VALUES,
      reverse
    );
  };
  return flipSequence;
}

export function mapFactory(collection, mapper, context) {
  const mappedSequence = makeSequence(collection);
  mappedSequence.size = collection.size;
  mappedSequence.has = (key) => collection.has(key);
  mappedSequence.get = (key, notSetValue) => {
    const v = collection.get(key, NOT_SET);
    return v === NOT_SET
      ? notSetValue
      : mapper.call(context, v, key, collection);
  };
  mappedSequence.__iteratorUncached = function (type, reverse) {
    const iterator = collection.__iterator(ITERATE_ENTRIES, reverse);
    return (function* () {
      for (const [key, value] of iterator) {
        yield getValueFromType(
          type,
          key,
          mapper.call(context, value, key, collection)
        );
      }
    })();
  };
  return mappedSequence;
}

export function reverseFactory(collection, useKeys) {
  const reversedSequence = makeSequence(collection);
  reversedSequence._iter = collection;
  reversedSequence.size = collection.size;
  reversedSequence.reverse = () => collection;
  if (collection.flip) {
    reversedSequence.flip = function () {
      const flipSequence = flipFactory(collection);
      flipSequence.reverse = () => collection.flip();
      return flipSequence;
    };
  }
  reversedSequence.get = (key, notSetValue) =>
    collection.get(useKeys ? key : -1 - key, notSetValue);
  reversedSequence.has = (key) => collection.has(useKeys ? key : -1 - key);
  reversedSequence.includes = (value) => collection.includes(value);
  reversedSequence.cacheResult = cacheResultThrough;
  reversedSequence.__iterate = function (fn, reverse) {
    let i = 0;
    if (reverse) {
      ensureSize(collection);
    }
    return collection.__iterate(
      (v, k) => fn(v, useKeys ? k : reverse ? this.size - ++i : i++, this),
      !reverse
    );
  };
  reversedSequence.__iterator = function (type, reverse) {
    let i = 0;
    if (reverse) {
      ensureSize(collection);
    }
    const iterator = collection.__iterator(ITERATE_ENTRIES, !reverse);
    return (function* (self) {
      for (const [key, value] of iterator) {
        yield getValueFromType(
          type,
          useKeys ? key : reverse ? self.size - ++i : i++,
          value
        );
      }
    })(this);
  };
  return reversedSequence;
}

export function filterFactory(collection, predicate, context, useKeys) {
  const filterSequence = makeSequence(collection);
  if (useKeys) {
    filterSequence.has = (key) => {
      const v = collection.get(key, NOT_SET);
      return v !== NOT_SET && !!predicate.call(context, v, key, collection);
    };
    filterSequence.get = (key, notSetValue) => {
      const v = collection.get(key, NOT_SET);
      return v !== NOT_SET && predicate.call(context, v, key, collection)
        ? v
        : notSetValue;
    };
  }
  filterSequence.__iteratorUncached = function (type, reverse) {
    const iterator = collection.__iterator(ITERATE_ENTRIES, reverse);
    let iterations = 0;
    return (function* () {
      for (const [key, value] of iterator) {
        if (predicate.call(context, value, key, collection)) {
          yield getValueFromType(type, useKeys ? key : iterations++, value);
        }
      }
    })();
  };
  return filterSequence;
}

export function countByFactory(collection, grouper, context) {
  const groups = Map().asMutable();
  collection.__iterate((v, k) => {
    groups.update(grouper.call(context, v, k, collection), 0, (a) => a + 1);
  });
  return groups.asImmutable();
}

export function groupByFactory(collection, grouper, context) {
  const isKeyedIter = isKeyed(collection);
  const groups = (isOrdered(collection) ? OrderedMap() : Map()).asMutable();
  collection.__iterate((v, k) => {
    groups.update(
      grouper.call(context, v, k, collection),
      (a) => ((a = a || []), a.push(isKeyedIter ? [k, v] : v), a)
    );
  });
  const coerce = collectionClass(collection);
  return groups.map((arr) => reify(collection, coerce(arr))).asImmutable();
}

export function partitionFactory(collection, predicate, context) {
  const isKeyedIter = isKeyed(collection);
  const groups = [[], []];
  collection.__iterate((v, k) => {
    groups[predicate.call(context, v, k, collection) ? 1 : 0].push(
      isKeyedIter ? [k, v] : v
    );
  });
  const coerce = collectionClass(collection);
  return groups.map((arr) => reify(collection, coerce(arr)));
}

export function sliceFactory(collection, begin, end, useKeys) {
  const originalSize = collection.size;

  if (wholeSlice(begin, end, originalSize)) {
    return collection;
  }

  // begin or end can not be resolved if they were provided as negative numbers and
  // this collection's size is unknown. In that case, cache first so there is
  // a known size and these do not resolve to NaN.
  if (typeof originalSize === 'undefined' && (begin < 0 || end < 0)) {
    return sliceFactory(collection.toSeq().cacheResult(), begin, end, useKeys);
  }

  const resolvedBegin = resolveBegin(begin, originalSize);
  const resolvedEnd = resolveEnd(end, originalSize);

  // Note: resolvedEnd is undefined when the original sequence's length is
  // unknown and this slice did not supply an end and should contain all
  // elements after resolvedBegin.
  // In that case, resolvedSize will be NaN and sliceSize will remain undefined.
  const resolvedSize = resolvedEnd - resolvedBegin;
  let sliceSize;
  if (resolvedSize === resolvedSize) {
    sliceSize = resolvedSize < 0 ? 0 : resolvedSize;
  }

  const sliceSeq = makeSequence(collection);

  // If collection.size is undefined, the size of the realized sliceSeq is
  // unknown at this point unless the number of items to slice is 0
  sliceSeq.size =
    sliceSize === 0 ? sliceSize : (collection.size && sliceSize) || undefined;

  if (!useKeys && isSeq(collection) && sliceSize >= 0) {
    sliceSeq.get = function (index, notSetValue) {
      index = wrapIndex(this, index);
      return index >= 0 && index < sliceSize
        ? collection.get(index + resolvedBegin, notSetValue)
        : notSetValue;
    };
  }

  sliceSeq.__iteratorUncached = function (type, reverse) {
    if (sliceSize !== 0 && reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    // Don't bother instantiating parent iterator if taking 0.
    if (sliceSize === 0) {
      return emptyIterator();
    }
    const iterator = collection.__iterator(type, reverse);
    function* gen() {
      // Phase 1: skip
      for (let i = 0; i < resolvedBegin; i++) {
        iterator.next();
      }
      // Phase 2: yield up to sliceSize items (all remaining if sliceSize is undefined)
      for (
        let iterations = 0;
        sliceSize === undefined || iterations < sliceSize;
        iterations++
      ) {
        const step = iterator.next();
        if (step.done) {
          return;
        }
        if (useKeys || type === ITERATE_VALUES) {
          yield step.value;
        } else if (type === ITERATE_KEYS) {
          yield getValueFromType(type, iterations, undefined);
        } else {
          yield getValueFromType(type, iterations, step.value[1]);
        }
      }
    }
    return gen();
  };

  return sliceSeq;
}

export function takeWhileFactory(collection, predicate, context) {
  const takeSequence = makeSequence(collection);
  takeSequence.__iteratorUncached = function (type, reverse) {
    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    const iterator = collection.__iterator(ITERATE_ENTRIES, reverse);
    return (function* (seq) {
      for (const [k, v] of iterator) {
        if (!predicate.call(context, v, k, seq)) {
          return;
        }
        yield getValueFromType(type, k, v);
      }
    })(this);
  };
  return takeSequence;
}

export function skipWhileFactory(collection, predicate, context, useKeys) {
  const skipSequence = makeSequence(collection);
  skipSequence.__iteratorUncached = function (type, reverse) {
    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    const iterator = collection.__iterator(ITERATE_ENTRIES, reverse);
    let iterations = 0;
    return (function* (seq) {
      // Phase 1: skip while predicate holds
      let skipping = true;
      for (const [k, v] of iterator) {
        if (skipping && predicate.call(context, v, k, seq)) {
          continue;
        }
        skipping = false;
        yield useKeys
          ? getValueFromType(type, k, v)
          : getValueFromType(type, iterations++, v);
      }
    })(this);
  };
  return skipSequence;
}

class ConcatSeq extends SeqImpl {
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

  __iteratorUncached(type, reverse) {
    if (this._wrappedIterables.length === 0) {
      return emptyIterator();
    }

    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }

    const wrappedIterables = this._wrappedIterables;
    const reIndex = !isKeyed(this) && type === ITERATE_ENTRIES;
    return (function* () {
      let index = 0;
      for (const iterable of wrappedIterables) {
        if (reIndex) {
          for (const value of iterable.__iterator(ITERATE_VALUES, reverse)) {
            yield [index++, value];
          }
        } else {
          yield* iterable.__iterator(type, reverse);
        }
      }
    })();
  }
}

export function concatFactory(collection, values) {
  const isKeyedCollection = isKeyed(collection);
  const iters = [collection]
    .concat(values)
    .map((v) => {
      if (!isCollection(v)) {
        v = isKeyedCollection
          ? keyedSeqFromValue(v)
          : indexedSeqFromValue(Array.isArray(v) ? v : [v]);
      } else if (isKeyedCollection) {
        v = KeyedCollection(v);
      }
      return v;
    })
    .filter((v) => v.size !== 0);

  if (iters.length === 0) {
    return collection;
  }

  if (iters.length === 1) {
    const singleton = iters[0];
    if (
      singleton === collection ||
      (isKeyedCollection && isKeyed(singleton)) ||
      (isIndexed(collection) && isIndexed(singleton))
    ) {
      return singleton;
    }
  }

  return new ConcatSeq(iters);
}

export function flattenFactory(collection, depth, useKeys) {
  const flatSequence = makeSequence(collection);
  flatSequence.__iteratorUncached = function (type, reverse) {
    if (reverse) {
      return this.cacheResult().__iterator(type, reverse);
    }
    let iterations = 0;
    function* flatGen(iter, currentDepth) {
      for (const [k, v] of iter.__iterator(ITERATE_ENTRIES, reverse)) {
        if ((!depth || currentDepth < depth) && isCollection(v)) {
          yield* flatGen(v, currentDepth + 1);
        } else {
          yield useKeys
            ? getValueFromType(type, k, v)
            : getValueFromType(type, iterations++, v);
        }
      }
    }
    return flatGen(collection, 0);
  };
  return flatSequence;
}

export function flatMapFactory(collection, mapper, context) {
  const coerce = collectionClass(collection);
  return collection
    .toSeq()
    .map((v, k) => coerce(mapper.call(context, v, k, collection)))
    .flatten(true);
}

export function interposeFactory(collection, separator) {
  const interposedSequence = makeSequence(collection);
  interposedSequence.size = collection.size && collection.size * 2 - 1;
  interposedSequence.__iteratorUncached = function (type, reverse) {
    const iterator = collection.__iterator(ITERATE_VALUES, reverse);
    let iterations = 0;
    return (function* () {
      let isFirst = true;
      for (const value of iterator) {
        if (!isFirst) {
          yield getValueFromType(type, iterations++, separator);
        }
        isFirst = false;
        yield getValueFromType(type, iterations++, value);
      }
    })();
  };
  return interposedSequence;
}

export function sortFactory(collection, comparator, mapper) {
  if (!comparator) {
    comparator = defaultComparator;
  }
  const isKeyedCollection = isKeyed(collection);
  let index = 0;
  const entries = collection
    .toSeq()
    .map((v, k) => [k, v, index++, mapper ? mapper(v, k, collection) : v])
    .valueSeq()
    .toArray();
  entries
    .sort((a, b) => comparator(a[3], b[3]) || a[2] - b[2])
    .forEach(
      isKeyedCollection
        ? (v, i) => {
            entries[i].length = 2;
          }
        : (v, i) => {
            entries[i] = v[1];
          }
    );
  return isKeyedCollection
    ? KeyedSeq(entries)
    : isIndexed(collection)
      ? IndexedSeq(entries)
      : SetSeq(entries);
}

export function maxFactory(collection, comparator, mapper) {
  if (!comparator) {
    comparator = defaultComparator;
  }
  if (mapper) {
    const entry = collection
      .toSeq()
      .map((v, k) => [v, mapper(v, k, collection)])
      .reduce((a, b) => (maxCompare(comparator, a[1], b[1]) ? b : a));
    return entry && entry[0];
  }
  return collection.reduce((a, b) => (maxCompare(comparator, a, b) ? b : a));
}

function maxCompare(comparator, a, b) {
  const comp = comparator(b, a);
  // b is considered the new max if the comparator declares them equal, but
  // they are not equal and b is in fact a nullish value.
  return (
    (comp === 0 && b !== a && (b === undefined || b === null || b !== b)) ||
    comp > 0
  );
}

export function zipWithFactory(keyIter, zipper, iters, zipAll) {
  const zipSequence = makeSequence(keyIter);
  const sizes = new ArraySeq(iters).map((i) => i.size);
  zipSequence.size = zipAll ? sizes.max() : sizes.min();
  // Note: this a generic base implementation of __iterate in terms of
  // __iterator which may be more generically useful in the future.
  zipSequence.__iterate = function (fn, reverse) {
    let iterations = 0;
    for (const value of this.__iterator(ITERATE_VALUES, reverse)) {
      if (fn(value, iterations++, this) === false) {
        break;
      }
    }
    return iterations;
  };
  zipSequence.__iteratorUncached = function (type, reverse) {
    const iterators = iters.map(
      (i) => ((i = Collection(i)), getIterator(reverse ? i.reverse() : i))
    );
    let iterations = 0;
    return (function* () {
      while (true) {
        const steps = iterators.map((i) => i.next());
        const isDone = zipAll
          ? steps.every((s) => s.done)
          : steps.some((s) => s.done);
        if (isDone) {
          return;
        }
        yield getValueFromType(
          type,
          iterations++,
          zipper(...steps.map((s) => s.value))
        );
      }
    })();
  };
  return zipSequence;
}

export function reify(iter, seq) {
  return iter === seq
    ? iter
    : isSeq(iter)
      ? seq
      : iter.create
        ? iter.create(seq)
        : iter.constructor(seq);
}

function validateEntry(entry) {
  if (entry !== Object(entry)) {
    throw new TypeError('Expected [K, V] tuple: ' + entry);
  }
}

function collectionClass(collection) {
  return isKeyed(collection)
    ? KeyedCollection
    : isIndexed(collection)
      ? IndexedCollection
      : SetCollection;
}

function makeSequence(collection) {
  return Object.create(
    (isKeyed(collection)
      ? KeyedSeqImpl
      : isIndexed(collection)
        ? IndexedSeqImpl
        : SetSeqImpl
    ).prototype
  );
}

function cacheResultThrough() {
  if (this._iter.cacheResult) {
    this._iter.cacheResult();
    this.size = this._iter.size;
    return this;
  }
  return SeqImpl.prototype.cacheResult.call(this);
}

function defaultComparator(a, b) {
  if (a === undefined && b === undefined) {
    return 0;
  }

  if (a === undefined) {
    return 1;
  }

  if (b === undefined) {
    return -1;
  }

  return a > b ? 1 : a < b ? -1 : 0;
}
