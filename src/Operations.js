import { Collection } from './Collection';
import { defaultComparator } from './CollectionHelperMethods';
import {
  DONE,
  getIterator,
  emptyIterator,
  mapEntries,
  makeEntryIterator,
  makeIterator,
} from './Iterator';
import {
  KeyedSeq,
  SetSeq,
  IndexedSeq,
  ArraySeq,
  cacheResultThrough,
  makeSequence,
} from './Seq';
import {
  NOT_SET,
  ensureSize,
  wrapIndex,
  wholeSlice,
  resolveBegin,
  resolveEnd,
} from './TrieUtils';
import { isIndexed, isKeyed, isSeq } from './predicates';

export function flipFactory(collection) {
  const flipSequence = makeSequence(collection);
  flipSequence._iter = collection;
  flipSequence.size = collection.size;
  flipSequence.flip = () => collection;
  flipSequence.reverse = function () {
    const reversedSequence = collection.reverse.call(this); // super.reverse()
    reversedSequence.flip = () => collection.reverse();
    return reversedSequence;
  };
  flipSequence.has = (key) => collection.includes(key);
  flipSequence.includes = (key) => collection.has(key);
  flipSequence.cacheResult = cacheResultThrough;
  flipSequence.__iterate = function (fn, reverse) {
    return collection.__iterate((v, k) => fn(k, v, this), reverse);
  };
  flipSequence.__iteratorUncached = function (reverse) {
    return mapEntries(collection.__iterator(reverse), (k, v, entry) => {
      entry[0] = v;
      entry[1] = k;
    });
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
  mappedSequence.__iterate = function (fn, reverse) {
    return collection.__iterate(
      (v, k) => fn(mapper.call(context, v, k, collection), k, this),
      reverse
    );
  };
  mappedSequence.__iteratorUncached = function (reverse) {
    return mapEntries(collection.__iterator(reverse), (k, v, entry) => {
      entry[0] = k;
      entry[1] = mapper.call(context, v, k, collection);
    });
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
  reversedSequence.__iteratorUncached = function (reverse) {
    let i = 0;
    if (reverse) {
      ensureSize(collection);
    }
    const size = this.size;
    return mapEntries(collection.__iterator(!reverse), (k, v, entry) => {
      entry[0] = useKeys ? k : reverse ? size - ++i : i++;
      entry[1] = v;
    });
  };
  return reversedSequence;
}

export function sliceFactory(collection, begin, end, useKeys) {
  const originalSize = collection.size;

  if (wholeSlice(begin, end, originalSize)) {
    return collection;
  }

  // begin or end can not be resolved if they were provided as negative numbers and
  // this collection's size is unknown. In that case, cache first so there is
  // a known size and these do not resolve to NaN.
  if (originalSize === undefined && (begin < 0 || end < 0)) {
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
  if (!Number.isNaN(resolvedSize)) {
    sliceSize = Math.max(0, resolvedSize);
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

  sliceSeq.__iterateUncached = function (fn, reverse) {
    if (sliceSize !== 0 && reverse) {
      return this.cacheResult().__iterate(fn, reverse);
    }
    if (sliceSize === 0) {
      return 0;
    }
    let skipped = 0;
    let iterations = 0;
    collection.__iterate((v, k) => {
      if (skipped < resolvedBegin) {
        skipped++;
        return;
      }
      if (sliceSize !== undefined && iterations >= sliceSize) {
        return false;
      }
      iterations++;
      if (fn(v, useKeys ? k : iterations - 1, this) === false) {
        return false;
      }
    }, reverse);
    return iterations;
  };

  sliceSeq.__iteratorUncached = function (reverse) {
    if (sliceSize !== 0 && reverse) {
      return this.cacheResult().__iterator(reverse);
    }
    // Don't bother instantiating parent iterator if taking 0.
    if (sliceSize === 0) {
      return emptyIterator();
    }
    const iterator = collection.__iterator(reverse);
    let skipped = 0;
    let iterations = 0;
    if (useKeys) {
      return makeIterator(() => {
        while (skipped < resolvedBegin) {
          skipped++;
          iterator.next();
        }
        if (sliceSize !== undefined && iterations >= sliceSize) {
          return DONE;
        }
        const step = iterator.next();
        if (step.done) {
          return step;
        }
        iterations++;
        return step;
      });
    }
    return makeEntryIterator((entry) => {
      while (skipped < resolvedBegin) {
        skipped++;
        iterator.next();
      }
      if (sliceSize !== undefined && iterations >= sliceSize) {
        return false;
      }
      const step = iterator.next();
      if (step.done) {
        return false;
      }
      iterations++;
      entry[0] = iterations - 1;
      entry[1] = step.value[1];
      return true;
    });
  };

  return sliceSeq;
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
    (comp === 0 &&
      b !== a &&
      (b === undefined || b === null || Number.isNaN(b))) ||
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
    const iterator = this.__iterator(reverse);
    let iterations = 0;
    let step;
    while (!(step = iterator.next()).done) {
      if (fn(step.value[1], iterations++, this) === false) {
        break;
      }
    }
    return iterations;
  };
  zipSequence.__iteratorUncached = function (reverse) {
    const iterators = iters.map((i) => {
      const col = Collection(i);
      return getIterator(reverse ? col.reverse() : col);
    });
    let iterations = 0;
    return makeEntryIterator((entry) => {
      const steps = iterators.map((i) => i.next());
      const isDone = zipAll
        ? steps.every((s) => s.done)
        : steps.some((s) => s.done);
      if (isDone) {
        return false;
      }
      entry[0] = iterations++;
      entry[1] = zipper(...steps.map((s) => s.value));
      return true;
    });
  };
  return zipSequence;
}
