/* eslint-disable @typescript-eslint/no-explicit-any -- Internal implementation with inherent generic variance issues */
import {
  defaultNegComparator,
  entryMapper,
  keyMapper,
  neg,
  not,
  reduce,
} from './CollectionHelperMethods';
import {
  flipFactory,
  mapFactory,
  maxFactory,
  reverseFactory,
  sliceFactory,
  sortFactory,
  zipWithFactory,
} from './Operations';
import {
  ArraySeq,
  ConcatSeq,
  FromEntriesSequence,
  IndexedSeq,
  KeyedSeq,
  Seq,
  SetSeq,
  makeSequence,
  ToIndexedSequence,
  ToKeyedSequence,
  ToSetSequence,
  indexedSeqFromValue,
  keyedSeqFromValue,
} from './Seq';
import {
  ensureSize,
  NOT_SET,
  resolveBegin,
  returnTrue,
  wrapIndex,
} from './TrieUtils';
import type ValueObject from './ValueObject';
import { getIn as functionalGetIn } from './functional/getIn';
import { hasIn as functionalHasIn } from './functional/hasIn';
import { is } from './is';
import {
  IS_COLLECTION_SYMBOL,
  IS_INDEXED_SYMBOL,
  IS_KEYED_SYMBOL,
  IS_ORDERED_SYMBOL,
  isAssociative,
  isCollection,
  isIndexed,
  isKeyed,
  isOrdered,
  isSeq,
} from './predicates';
import { toJS } from './toJS';
import { assertNotInfinite } from './utils/assertions';
import deepEqual from './utils/deepEqual';
import { hashCollection } from './utils/hashCollection';
import quoteString from './utils/quoteString';

// Late-binding references for concrete collection constructors that cannot be
// directly imported due to circular class hierarchy dependencies.
// Populated by Immutable.js after all modules have loaded.
export const _late: Record<string, any> = {};

const reify = <K, V>(iter: CollectionImpl<K, V>, seq: any): any =>
  iter === seq
    ? iter
    : isSeq(iter)
      ? seq
      : (iter as any).create
        ? (iter as any).create(seq)
        : (iter.constructor as any)(seq);

const reifyValues = (collection: any, arr: any): any =>
  reify(
    collection,
    (isKeyed(collection)
      ? KeyedCollection
      : isIndexed(collection)
        ? IndexedCollection
        : SetCollection)(arr)
  );

const asValues = (collection: any): any =>
  isKeyed(collection) ? collection.valueSeq() : collection;

const defaultZipper = (...values: unknown[]) => values;

export const Collection = (value: unknown): CollectionImpl<unknown, unknown> =>
  isCollection(value)
    ? value
    : (Seq(value) as CollectionImpl<unknown, unknown>);

export class CollectionImpl<K, V> implements ValueObject {
  declare __hash: number | undefined;
  declare __toStringMapper: (v: unknown, k: unknown) => string;

  size: number = 0;

  static {
    (this.prototype as unknown as Record<string, unknown>)[
      IS_COLLECTION_SYMBOL
    ] = true;
    this.prototype.__toStringMapper = quoteString;
    // Same-reference aliases
    this.prototype[Symbol.iterator] = this.prototype.values;
    this.prototype.toJSON = this.prototype.toArray;
    this.prototype.contains = this.prototype.includes;
  }

  // ### Hashable Object

  equals(other: unknown): boolean {
    return deepEqual(this as any, other);
  }

  hashCode() {
    return this.__hash ?? (this.__hash = hashCollection(this));
  }

  // ### Conversion to other types

  toArray() {
    assertNotInfinite(this.size);
    const array = new Array(this.size || 0);
    const useTuples = isKeyed(this);
    let i = 0;
    this.__iterate((v: V, k: K) => {
      array[i++] = useTuples ? [k, v] : v;
    });
    return array;
  }

  toIndexedSeq(): CollectionImpl<unknown, unknown> {
    return new ToIndexedSequence(this);
  }

  toJS(): unknown {
    return toJS(this);
  }

  toKeyedSeq(): CollectionImpl<unknown, unknown> {
    return new ToKeyedSequence(this, true);
  }

  toMap(): unknown {
    return _late.Map(this.toKeyedSeq());
  }

  toObject(): Record<string, unknown> {
    assertNotInfinite(this.size);
    const object: Record<string, unknown> = {};
    this.__iterate((v: V, k: K) => {
      (object as any)[k] = v;
    });
    return object;
  }

  toOrderedMap(): unknown {
    return _late.OrderedMap(this.toKeyedSeq());
  }

  toOrderedSet(): unknown {
    return _late.OrderedSet(asValues(this));
  }

  toSet(): unknown {
    return _late.Set(asValues(this));
  }

  toSetSeq(): CollectionImpl<unknown, unknown> {
    return new ToSetSequence(this);
  }

  toSeq(): CollectionImpl<unknown, unknown> {
    return isIndexed(this)
      ? this.toIndexedSeq()
      : isKeyed(this)
        ? this.toKeyedSeq()
        : this.toSetSeq();
  }

  toStack(): unknown {
    return _late.Stack(asValues(this));
  }

  toList(): unknown {
    return _late.List(asValues(this));
  }

  // ### Common JavaScript methods and properties

  toString() {
    return '[Collection]';
  }

  __toString(head: string, tail: string): string {
    if (this.size === 0) {
      return `${head}${tail}`;
    }
    return `${head} ${this.toSeq().map(this.__toStringMapper).join(', ')} ${tail}`;
  }

  // ### ES6 Collection methods (ES6 Array and Map)

  concat(...values: unknown[]) {
    const isKeyedCollection = isKeyed(this);
    const iters = [this as any, ...values]
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
      .filter((v: any) => v.size !== 0);

    if (iters.length === 0) {
      return this;
    }

    if (iters.length === 1) {
      const singleton = iters[0];
      if (
        singleton === this ||
        (isKeyedCollection && isKeyed(singleton)) ||
        (isIndexed(this) && isIndexed(singleton))
      ) {
        return singleton;
      }
    }

    return reify(this, new ConcatSeq(iters));
  }

  includes(searchValue: V) {
    return this.some((value: V) => is(value, searchValue));
  }

  declare contains: (searchValue: V) => boolean;

  every(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ): boolean {
    assertNotInfinite(this.size);
    let returnValue = true;
    this.__iterate((v, k, c) => {
      if (!predicate.call(context, v, k, c)) {
        returnValue = false;
        return false;
      }
    });
    return returnValue;
  }

  entries() {
    return this.__iterator();
  }

  filter(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- captured for nested function expressions on the sequence object
    const collection = this;
    const useKeys = isKeyed(this);
    const filterSequence = makeSequence(collection);
    if (useKeys) {
      filterSequence.has = (key: K) => {
        const v = collection.get(key, NOT_SET as V);
        return v !== NOT_SET && !!predicate.call(context, v, key, collection);
      };
      filterSequence.get = (key: K, notSetValue?: V) => {
        const v = collection.get(key, NOT_SET as V);
        return v !== NOT_SET && predicate.call(context, v, key, collection)
          ? v
          : notSetValue;
      };
    }
    filterSequence.__iterateUncached = function (fn: any, reverse: boolean) {
      let iterations = 0;
      collection.__iterate((v: any, k: any) => {
        if (predicate.call(context, v, k, collection)) {
          iterations++;
          return fn(v, useKeys ? k : iterations - 1, this);
        }
      }, reverse);
      return iterations;
    };
    filterSequence.__iteratorUncached = function (reverse: boolean) {
      const iterator = collection.__iterator(reverse);
      let iterations = 0;
      function* gen() {
        for (const [key, value] of iterator) {
          if (predicate.call(context, value, key, collection)) {
            yield [useKeys ? key : iterations++, value];
          }
        }
      }
      return gen();
    };
    return reify(this, filterSequence);
  }

  partition(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    const isKeyedIter = isKeyed(this);
    const groups: any[][] = [[], []];
    this.__iterate((v: V, k: K) => {
      groups[predicate.call(context, v, k, this) ? 1 : 0]!.push(
        isKeyedIter ? [k, v] : v
      );
    });
    return groups.map((arr) => reifyValues(this, arr));
  }

  find(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown,
    notSetValue?: V
  ) {
    const entry = this.findEntry(predicate, context) as any;
    return entry ? entry[1] : notSetValue;
  }

  forEach(
    sideEffect: (value: V, key: K, iter: this) => unknown,
    context?: unknown
  ) {
    assertNotInfinite(this.size);
    return this.__iterate(context ? sideEffect.bind(context) : sideEffect);
  }

  join(separator?: string) {
    assertNotInfinite(this.size);
    separator = separator !== undefined ? String(separator) : ',';
    let joined = '';
    let isFirst = true;
    this.__iterate((v: V) => {
      if (isFirst) {
        isFirst = false;
      } else {
        joined += separator;
      }
      joined += v !== null && v !== undefined ? String(v) : '';
    });
    return joined;
  }

  *keys() {
    for (const [k] of this.__iterator()) {
      yield k;
    }
  }

  map(mapper: (value: V, key: K, iter: this) => V, context?: unknown): any {
    return reify(this, mapFactory(this, mapper, context));
  }

  reduce(
    reducer: (...args: unknown[]) => unknown,
    initialReduction: unknown = NOT_SET,
    context?: unknown
  ) {
    return reduce(
      this,
      reducer,
      initialReduction,
      context,
      initialReduction === NOT_SET,
      false
    );
  }

  reduceRight(
    reducer: (...args: unknown[]) => unknown,
    initialReduction: unknown = NOT_SET,
    context?: unknown
  ) {
    return reduce(
      this,
      reducer,
      initialReduction,
      context,
      initialReduction === NOT_SET,
      true
    );
  }

  reverse() {
    return reify(this, reverseFactory(this, isKeyed(this)));
  }

  slice(begin?: number, end?: number) {
    return reify(this, sliceFactory(this, begin, end, isKeyed(this)));
  }

  some(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    assertNotInfinite(this.size);
    let returnValue = false;
    this.__iterate((v, k, c) => {
      if (predicate.call(context, v, k, c)) {
        returnValue = true;
        return false;
      }
    });
    return returnValue;
  }

  sort(comparator?: (a: V, b: V) => number): any {
    return reify(this, sortFactory(this, comparator));
  }

  *values() {
    for (const [, v] of this.__iterator()) {
      yield v;
    }
  }

  // ### More sequential methods

  butLast() {
    return this.slice(0, -1);
  }

  isEmpty() {
    return this.size !== undefined ? this.size === 0 : !this.some(() => true);
  }

  count(
    predicate?: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    return ensureSize(
      predicate ? this.toSeq().filter(predicate as any, context) : (this as any)
    );
  }

  countBy(
    grouper: (value: V, key: K, iter: this) => unknown,
    context?: unknown
  ) {
    const groups = _late.Map().asMutable();
    this.__iterate((v: V, k: K) => {
      groups.update(grouper.call(context, v, k, this), 0, (a: number) => a + 1);
    });
    return groups.asImmutable();
  }

  entrySeq(): CollectionImpl<unknown, unknown> {
    const collection = this as CollectionImpl<K, V> & { _cache?: [K, V][] };
    if (collection._cache) {
      return new ArraySeq(collection._cache);
    }
    const entriesSequence = collection.toSeq().map(entryMapper).toIndexedSeq();
    (entriesSequence as { fromEntrySeq: () => unknown }).fromEntrySeq = () =>
      collection.toSeq();
    return entriesSequence;
  }

  filterNot(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    return this.filter(
      not(predicate as (...args: unknown[]) => boolean) as (
        value: V,
        key: K,
        iter: this
      ) => boolean,
      context
    );
  }

  findEntry(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown,
    notSetValue?: unknown
  ) {
    let found = notSetValue;
    this.__iterate((v, k, c) => {
      if (predicate.call(context, v, k, c)) {
        found = [k, v];
        return false;
      }
    });
    return found;
  }

  findKey(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    const entry = this.findEntry(predicate, context);
    return entry && (entry as [K, V])[0];
  }

  findLast(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown,
    notSetValue?: V
  ) {
    return this.toKeyedSeq().reverse().find(predicate, context, notSetValue);
  }

  findLastEntry(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown,
    notSetValue?: unknown
  ) {
    return this.toKeyedSeq()
      .reverse()
      .findEntry(predicate, context, notSetValue);
  }

  findLastKey(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    return this.toKeyedSeq().reverse().findKey(predicate, context);
  }

  first(notSetValue?: V) {
    return this.find(returnTrue as () => boolean, null, notSetValue);
  }

  flatMap(
    mapper: (value: V, key: K, iter: this) => unknown,
    context?: unknown
  ) {
    return reify(
      this,
      this.toSeq()
        .map((v: any, k: any) =>
          (isKeyed(this)
            ? KeyedCollection
            : isIndexed(this)
              ? IndexedCollection
              : SetCollection)(mapper.call(context, v, k, this) as any)
        )
        .flatten(true)
    );
  }

  flatten(depth?: number | boolean) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- captured for nested function expressions on the sequence object
    const collection = this;
    const useKeys = isKeyed(this);
    const flatSequence = makeSequence(collection);
    flatSequence.__iterateUncached = function (fn: any, reverse: boolean) {
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      let iterations = 0;
      let stopped = false;
      function flatDeep(iter: any, currentDepth: number) {
        iter.__iterate((v: any, k: any) => {
          if ((!depth || currentDepth < (depth as number)) && isCollection(v)) {
            flatDeep(v, currentDepth + 1);
          } else {
            iterations++;
            if (fn(v, useKeys ? k : iterations - 1, flatSequence) === false) {
              stopped = true;
            }
          }
          if (stopped) {
            return false;
          }
        }, reverse);
      }
      flatDeep(collection, 0);
      return iterations;
    };
    flatSequence.__iteratorUncached = function (reverse: boolean) {
      if (reverse) {
        return this.cacheResult().__iterator(reverse);
      }
      let iterations = 0;
      function* flatGen(iter: any, currentDepth: number): any {
        for (const [k, v] of iter.__iterator(reverse)) {
          if ((!depth || currentDepth < (depth as number)) && isCollection(v)) {
            yield* flatGen(v, currentDepth + 1);
          } else {
            yield useKeys ? [k, v] : [iterations++, v];
          }
        }
      }
      return flatGen(collection, 0);
    };
    return reify(this, flatSequence);
  }

  fromEntrySeq() {
    return new FromEntriesSequence(this);
  }

  get(searchKey: K, notSetValue?: V) {
    return this.find(
      (_: V, key: K) => is(key, searchKey),
      undefined,
      notSetValue
    );
  }

  getIn(searchKeyPath: unknown, notSetValue?: unknown) {
    return functionalGetIn(this, searchKeyPath as any, notSetValue);
  }

  groupBy(
    grouper: (value: V, key: K, iter: this) => unknown,
    context?: unknown
  ) {
    const isKeyedIter = isKeyed(this);
    const groups = (
      isOrdered(this) ? _late.OrderedMap() : _late.Map()
    ).asMutable();
    this.__iterate((v: V, k: K) => {
      groups.update(
        grouper.call(context, v, k, this),
        (a: any[] | undefined) => {
          a ??= [];
          a.push(isKeyedIter ? [k, v] : v);
          return a;
        }
      );
    });
    return groups.map((arr: any) => reifyValues(this, arr)).asImmutable();
  }

  has(searchKey: K) {
    return this.get(searchKey, NOT_SET as V) !== NOT_SET;
  }

  hasIn(searchKeyPath: unknown) {
    return functionalHasIn(this, searchKeyPath as any);
  }

  isSubset(iter: unknown) {
    const other =
      typeof (iter as CollectionImpl<unknown, unknown>).includes === 'function'
        ? (iter as CollectionImpl<unknown, unknown>)
        : Collection(iter as never);
    return this.every((value: V) => other.includes(value));
  }

  isSuperset(iter: unknown) {
    const other =
      typeof (iter as CollectionImpl<unknown, unknown>).isSubset === 'function'
        ? (iter as CollectionImpl<unknown, unknown>)
        : Collection(iter as never);
    return other.isSubset(this);
  }

  keyOf(searchValue: V) {
    return this.findKey((value: V) => is(value, searchValue));
  }

  keySeq() {
    return this.toSeq().map(keyMapper).toIndexedSeq();
  }

  last(notSetValue?: V) {
    return this.toSeq().reverse().first(notSetValue);
  }

  lastKeyOf(searchValue: V) {
    return this.toKeyedSeq().reverse().keyOf(searchValue);
  }

  max(comparator?: (a: V, b: V) => number) {
    return maxFactory(this, comparator);
  }

  maxBy(
    mapper: (value: V, key: K, iter: this) => unknown,
    comparator?: (a: unknown, b: unknown) => number
  ) {
    return maxFactory(this, comparator, mapper);
  }

  min(comparator?: (a: V, b: V) => number) {
    return maxFactory(
      this,
      comparator
        ? neg(comparator as (...args: unknown[]) => number)
        : defaultNegComparator
    );
  }

  minBy(
    mapper: (value: V, key: K, iter: this) => unknown,
    comparator?: (a: unknown, b: unknown) => number
  ) {
    return maxFactory(
      this,
      comparator
        ? neg(comparator as (...args: unknown[]) => number)
        : defaultNegComparator,
      mapper
    );
  }

  rest() {
    return this.slice(1);
  }

  skip(amount: number) {
    return amount === 0 ? this : this.slice(Math.max(0, amount));
  }

  skipLast(amount: number) {
    return amount === 0 ? this : this.slice(0, -Math.max(0, amount));
  }

  skipWhile(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- captured for nested function expressions on the sequence object
    const collection = this;
    const useKeys = isKeyed(this);
    const skipSequence = makeSequence(collection);
    skipSequence.__iterateUncached = function (fn: any, reverse: boolean) {
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      let skipping = true;
      let iterations = 0;
      collection.__iterate((v: any, k: any) => {
        if (skipping && predicate.call(context, v, k, this)) {
          return;
        }
        skipping = false;
        iterations++;
        return fn(v, useKeys ? k : iterations - 1, this);
      }, reverse);
      return iterations;
    };
    skipSequence.__iteratorUncached = function (reverse: boolean) {
      if (reverse) {
        return this.cacheResult().__iterator(reverse);
      }
      const iterator = collection.__iterator(reverse);
      let iterations = 0;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const seq = this;
      function* gen() {
        let skipping = true;
        for (const [k, v] of iterator) {
          if (skipping && predicate.call(context, v, k, seq)) {
            continue;
          }
          skipping = false;
          yield useKeys ? [k, v] : [iterations++, v];
        }
      }
      return gen();
    };
    return reify(this, skipSequence);
  }

  skipUntil(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    return this.skipWhile(
      not(predicate as (...args: unknown[]) => boolean) as (
        value: V,
        key: K,
        iter: this
      ) => boolean,
      context
    );
  }

  sortBy(
    mapper: (value: V, key: K, iter: this) => unknown,
    comparator?: (a: unknown, b: unknown) => number
  ): any {
    return reify(this, sortFactory(this, comparator, mapper));
  }

  take(amount: number) {
    return this.slice(0, Math.max(0, amount));
  }

  takeLast(amount: number) {
    return this.slice(-Math.max(0, amount));
  }

  takeWhile(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- captured for nested function expressions on the sequence object
    const collection = this;
    const takeSequence = makeSequence(collection);
    takeSequence.__iterateUncached = function (fn: any, reverse: boolean) {
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      let iterations = 0;
      collection.__iterate((v: any, k: any) => {
        if (!predicate.call(context, v, k, this)) {
          return false;
        }
        iterations++;
        return fn(v, k, this);
      }, reverse);
      return iterations;
    };
    takeSequence.__iteratorUncached = function (reverse: boolean) {
      if (reverse) {
        return this.cacheResult().__iterator(reverse);
      }
      const iterator = collection.__iterator(reverse);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const seq = this;
      function* gen() {
        for (const [k, v] of iterator) {
          if (!predicate.call(context, v, k, seq)) {
            return;
          }
          yield [k, v];
        }
      }
      return gen();
    };
    return reify(this, takeSequence);
  }

  takeUntil(
    predicate: (value: V, key: K, iter: this) => boolean,
    context?: unknown
  ) {
    return this.takeWhile(
      not(predicate as (...args: unknown[]) => boolean) as (
        value: V,
        key: K,
        iter: this
      ) => boolean,
      context
    );
  }

  update(fn: (collection: this) => unknown) {
    return fn(this);
  }

  valueSeq() {
    return this.toIndexedSeq();
  }

  declare [Symbol.iterator]: () => IterableIterator<V>;
  declare toJSON: () => unknown;

  // ### Internal

  __iterate(
    fn: (value: V, index: K, iter: this) => boolean,
    reverse?: boolean
  ): number;
  __iterate(
    fn: (value: V, index: K, iter: this) => void,
    reverse?: boolean
  ): void;
  __iterate(
    fn: (value: V, index: K, iter: this) => boolean | void,
    reverse: boolean = false
  ): number {
    let iterations = 0;
    for (const [key, value] of this.__iterator(reverse)) {
      iterations++;
      if (fn(value, key, this) === false) {
        break;
      }
    }
    return iterations;
  }

  // Always yields [K, V] entries. Subclasses override in .js files where
  // TypeScript can't enforce the tuple shape, so we keep `any` here.
  __iterator(_reverse: boolean = false): IterableIterator<any> {
    throw new Error(
      'CollectionImpl does not implement __iterator. Use a subclass instead.'
    );
  }
}

/**
 * Always returns a Seq.Keyed, if input is not keyed, expects an
 * collection of [K, V] tuples.
 *
 * Note: `Seq.Keyed` is a conversion function and not a class, and does not
 * use the `new` keyword during construction.
 */
export const KeyedCollection = (
  value: unknown
): KeyedCollectionImpl<unknown, unknown> =>
  (isKeyed(value) ? value : KeyedSeq(value)) as KeyedCollectionImpl<
    unknown,
    unknown
  >;

export class KeyedCollectionImpl<K, V> extends CollectionImpl<K, V> {
  static {
    (this.prototype as unknown as Record<string, unknown>)[IS_KEYED_SYMBOL] =
      true;
    (
      this.prototype as unknown as CollectionImpl<unknown, unknown>
    ).__toStringMapper = (v: unknown, k: unknown) =>
      `${quoteString(k)}: ${quoteString(v)}`;
    (this.prototype as unknown as CollectionImpl<unknown, unknown>)[
      Symbol.iterator
    ] = CollectionImpl.prototype.entries;
    this.prototype.toJSON = function () {
      assertNotInfinite(this.size);
      const object: Record<string, unknown> = {};
      this.__iterate((v: unknown, k: unknown) => {
        (object as any)[k as string] = v;
      });
      return object;
    };
  }

  flip() {
    return reify(this, flipFactory(this));
  }

  mapEntries(
    mapper: (entry: [K, V], index: number, iter: this) => [unknown, unknown],
    context?: unknown
  ) {
    let iterations = 0;
    return reify(
      this,
      (this.toSeq() as any)
        .map((v: V, k: K) => mapper.call(context, [k, v], iterations++, this))
        .fromEntrySeq()
    );
  }

  mapKeys(
    mapper: (key: K, value: V, iter: this) => unknown,
    context?: unknown
  ) {
    return reify(
      this,
      (this.toSeq() as any)
        .flip()
        .map((k: K, v: V) => mapper.call(context, k, v, this))
        .flip()
    );
  }
}

export const IndexedCollection = <T>(
  value: Iterable<T> | ArrayLike<T>
): IndexedCollectionImpl<T> =>
  (isIndexed<T>(value) ? value : IndexedSeq(value)) as IndexedCollectionImpl<T>;

/**
 * Interface representing all ordered collections.
 * This includes `List`, `Stack`, `Map`, `OrderedMap`, `Set`, and `OrderedSet`.
 * `isOrdered()` returns true for these types.
 */
interface OrderedCollection<T> {
  toArray(): Array<T>;
  [Symbol.iterator](): IterableIterator<T>;
}

export class IndexedCollectionImpl<T>
  extends CollectionImpl<number, T>
  implements OrderedCollection<T>
{
  static {
    (this.prototype as unknown as Record<string, unknown>)[IS_INDEXED_SYMBOL] =
      true;
    (this.prototype as unknown as Record<string, unknown>)[IS_ORDERED_SYMBOL] =
      true;
  }

  declare toArray: () => T[];

  declare [Symbol.iterator]: () => IterableIterator<T>;

  override toKeyedSeq() {
    return new ToKeyedSequence(this, false);
  }

  findIndex(
    predicate: (value: T, key: number, iter: this) => boolean,
    context?: unknown
  ) {
    const entry = this.findEntry(predicate, context);
    return entry ? (entry as [number, T])[0] : -1;
  }

  indexOf(searchValue: T) {
    const key = this.keyOf(searchValue);
    return key === undefined ? -1 : key;
  }

  lastIndexOf(searchValue: T) {
    const key = this.lastKeyOf(searchValue);
    return key === undefined ? -1 : key;
  }

  splice(index?: number, removeNum: any = NOT_SET, ...values: T[]) {
    if (index === undefined) {
      return this;
    }
    const hasRemoveNum = removeNum !== NOT_SET;
    removeNum = hasRemoveNum ? Math.max(removeNum || 0, 0) : 0;
    if (hasRemoveNum && !removeNum && values.length === 0) {
      return this;
    }
    index = resolveBegin(index, index < 0 ? this.count() : this.size);
    const spliced = this.slice(0, index) as any;
    return reify(
      this,
      !hasRemoveNum
        ? spliced
        : spliced.concat(values, this.slice(index + removeNum))
    );
  }

  findLastIndex(
    predicate: (value: T, key: number, iter: this) => boolean,
    context?: unknown
  ) {
    const entry = this.findLastEntry(predicate, context);
    return entry ? (entry as [number, T])[0] : -1;
  }

  override first(notSetValue?: T) {
    return this.get(0, notSetValue);
  }

  override get(index: number, notSetValue?: T) {
    index = wrapIndex(this as any, index);
    return index < 0 ||
      this.size === Infinity ||
      (this.size !== undefined && index > this.size)
      ? notSetValue
      : this.find((_: T, key: number) => key === index, undefined, notSetValue);
  }

  override has(index: number) {
    index = wrapIndex(this as any, index);
    return (
      index >= 0 &&
      (this.size !== undefined
        ? this.size === Infinity || index < this.size
        : this.indexOf(index as unknown as T) !== -1)
    );
  }

  interpose(separator: T) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- captured for nested function expressions on the sequence object
    const collection = this;
    const interposedSequence = makeSequence(collection);
    interposedSequence.size = collection.size && collection.size * 2 - 1;
    interposedSequence.__iterateUncached = function (
      fn: any,
      reverse: boolean
    ) {
      let iterations = 0;
      let isFirst = true;
      collection.__iterate((v: any) => {
        if (!isFirst) {
          if (fn(separator, iterations++, this) === false) {
            return false;
          }
        }
        isFirst = false;
        return fn(v, iterations++, this);
      }, reverse);
      return iterations;
    };
    interposedSequence.__iteratorUncached = function (reverse: boolean) {
      const iterator = collection.__iterator(reverse);
      let iterations = 0;
      function* gen() {
        let isFirst = true;
        for (const [, value] of iterator) {
          if (!isFirst) {
            yield [iterations++, separator];
          }
          isFirst = false;
          yield [iterations++, value];
        }
      }
      return gen();
    };
    return reify(this, interposedSequence);
  }

  interleave(...collections: Array<Iterable<T>>) {
    const thisAndCollections = [this, ...collections];
    const zipped = zipWithFactory(
      this.toSeq(),
      IndexedSeq.of,
      thisAndCollections
    );
    const interleaved = zipped.flatten(true);
    if (zipped.size) {
      interleaved.size = zipped.size * thisAndCollections.length;
    }
    return reify(this, interleaved);
  }

  override keySeq(): any {
    return _late.Range(0, this.size);
  }

  override last(notSetValue?: T) {
    return this.get(-1, notSetValue);
  }

  zip(...collections: Array<Iterable<unknown>>) {
    return this.zipWith(defaultZipper, ...collections);
  }

  zipAll(...collections: Array<Iterable<unknown>>) {
    const thisAndCollections = [this, ...collections];
    return reify(
      this,
      zipWithFactory(this, defaultZipper, thisAndCollections, true)
    );
  }

  zipWith(
    zipper: (...args: unknown[]) => unknown,
    ...collections: Array<Iterable<unknown>>
  ) {
    const thisAndCollections = [this, ...collections];
    return reify(this, zipWithFactory(this, zipper, thisAndCollections));
  }
}

export const SetCollection = <T>(
  value: Iterable<T> | ArrayLike<T>
): SetCollectionImpl<T> =>
  (isCollection(value) && !isAssociative(value)
    ? value
    : SetSeq(value)) as SetCollectionImpl<T>;

export class SetCollectionImpl<T> extends CollectionImpl<T, T> {
  static {
    // In Set collections: has/contains check value presence (= includes), keys = values
    (this.prototype as unknown as Record<string, unknown>).has =
      CollectionImpl.prototype.includes;
    (this.prototype as unknown as Record<string, unknown>).contains =
      CollectionImpl.prototype.includes;
    (this.prototype as unknown as Record<string, unknown>).keys =
      SetCollectionImpl.prototype.values;
  }

  override get(value: T, notSetValue?: T) {
    return this.has(value) ? value : notSetValue;
  }

  override includes(value: T) {
    return this.has(value);
  }

  override keySeq() {
    return this.valueSeq();
  }
}

Collection.Keyed = KeyedCollection;
Collection.Indexed = IndexedCollection;
Collection.Set = SetCollection;

// Export prototype references needed by other modules
export const CollectionPrototype = CollectionImpl.prototype;
export const IndexedCollectionPrototype = IndexedCollectionImpl.prototype;
