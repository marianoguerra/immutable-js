import type {
  List,
  Map,
  OrderedCollection,
  OrderedMap,
  OrderedSet,
  Record,
  Seq,
  Set,
  Stack,
} from '../type-definitions/immutable';
import type {
  CollectionImpl,
  IndexedCollectionImpl,
  KeyedCollectionImpl,
} from './Collection';
import type ValueObject from './ValueObject';

// Note: value is unchanged to not break immutable-devtools.
export const IS_COLLECTION_SYMBOL = '@@__IMMUTABLE_ITERABLE__@@';

export const IS_KEYED_SYMBOL = '@@__IMMUTABLE_KEYED__@@';

export const IS_INDEXED_SYMBOL = '@@__IMMUTABLE_INDEXED__@@';

export const IS_ORDERED_SYMBOL = '@@__IMMUTABLE_ORDERED__@@';

export const IS_SEQ_SYMBOL = '@@__IMMUTABLE_SEQ__@@';

export const IS_LIST_SYMBOL = '@@__IMMUTABLE_LIST__@@';

export const IS_MAP_SYMBOL = '@@__IMMUTABLE_MAP__@@';

export const IS_SET_SYMBOL = '@@__IMMUTABLE_SET__@@';

export const IS_STACK_SYMBOL = '@@__IMMUTABLE_STACK__@@';

export const IS_RECORD_SYMBOL = '@@__IMMUTABLE_RECORD__@@';

function hasSymbol(
  v: unknown,
  symbol: string
): v is { [key: string]: unknown } {
  return typeof v === 'object' && v !== null && symbol in v;
}

/**
 * True if `maybeCollection` is a Collection, or any of its subclasses.
 *
 * ```js
 * import { isCollection, Map, List, Stack } from 'immutable';
 *
 * isCollection([]); // false
 * isCollection({}); // false
 * isCollection(Map()); // true
 * isCollection(List()); // true
 * isCollection(Stack()); // true
 * ```
 */
export const isCollection = (
  v: unknown
): v is CollectionImpl<unknown, unknown> => hasSymbol(v, IS_COLLECTION_SYMBOL);

/**
 * True if `maybeKeyed` is a Collection.Keyed, or any of its subclasses.
 *
 * ```js
 * import { isKeyed, Map, List, Stack } from 'immutable';
 *
 * isKeyed([]); // false
 * isKeyed({}); // false
 * isKeyed(Map()); // true
 * isKeyed(List()); // false
 * isKeyed(Stack()); // false
 * ```
 */
export const isKeyed = (
  v: unknown
): v is KeyedCollectionImpl<unknown, unknown> => hasSymbol(v, IS_KEYED_SYMBOL);

/**
 * True if `maybeIndexed` is a Collection.Indexed, or any of its subclasses.
 *
 * ```js
 * import { isIndexed, Map, List, Stack, Set } from 'immutable';
 *
 * isIndexed([]); // false
 * isIndexed({}); // false
 * isIndexed(Map()); // false
 * isIndexed(List()); // true
 * isIndexed(Stack()); // true
 * isIndexed(Set()); // false
 * ```
 */
export const isIndexed = <T>(v: unknown): v is IndexedCollectionImpl<T> =>
  hasSymbol(v, IS_INDEXED_SYMBOL);

/**
 * True if `maybeAssociative` is either a Keyed or Indexed Collection.
 *
 * ```js
 * import { isAssociative, Map, List, Stack, Set } from 'immutable';
 *
 * isAssociative([]); // false
 * isAssociative({}); // false
 * isAssociative(Map()); // true
 * isAssociative(List()); // true
 * isAssociative(Stack()); // true
 * isAssociative(Set()); // false
 * ```
 */
export const isAssociative = (
  v: unknown
): v is
  | KeyedCollectionImpl<unknown, unknown>
  | IndexedCollectionImpl<unknown> => isKeyed(v) || isIndexed(v);

/**
 * True if `maybeOrdered` is a Collection where iteration order is well
 * defined. True for Collection.Indexed as well as OrderedMap and OrderedSet.
 *
 * ```js
 * import { isOrdered, Map, OrderedMap, List, Set } from 'immutable';
 *
 * isOrdered([]); // false
 * isOrdered({}); // false
 * isOrdered(Map()); // false
 * isOrdered(OrderedMap()); // true
 * isOrdered(List()); // true
 * isOrdered(Set()); // false
 * ```
 */
export const isOrdered = (v: unknown): v is OrderedCollection<unknown> =>
  hasSymbol(v, IS_ORDERED_SYMBOL);

/**
 * True if `maybeSeq` is a Seq.
 */
export const isSeq = (
  v: unknown
): v is Seq.Indexed<unknown> | Seq.Keyed<unknown, unknown> | Seq.Set<unknown> =>
  hasSymbol(v, IS_SEQ_SYMBOL);

/**
 * True if `maybeList` is a List.
 */
export const isList = (v: unknown): v is List<unknown> =>
  hasSymbol(v, IS_LIST_SYMBOL);

/**
 * True if `maybeMap` is a Map.
 *
 * Also true for OrderedMaps.
 */
export const isMap = (v: unknown): v is Map<unknown, unknown> =>
  hasSymbol(v, IS_MAP_SYMBOL);

/**
 * True if `maybeSet` is a Set.
 *
 * Also true for OrderedSets.
 */
export const isSet = (v: unknown): v is Set<unknown> =>
  hasSymbol(v, IS_SET_SYMBOL);

/**
 * True if `maybeStack` is a Stack.
 */
export const isStack = (v: unknown): v is Stack<unknown> =>
  hasSymbol(v, IS_STACK_SYMBOL);

/**
 * True if `maybeRecord` is a Record.
 */
export const isRecord = (v: unknown): v is Record<object> =>
  hasSymbol(v, IS_RECORD_SYMBOL);

/**
 * True if `maybeImmutable` is an Immutable Collection or Record.
 *
 * Note: Still returns true even if the collections is within a `withMutations()`.
 *
 * ```js
 * import { isImmutable, Map, List, Stack } from 'immutable';
 * isImmutable([]); // false
 * isImmutable({}); // false
 * isImmutable(Map()); // true
 * isImmutable(List()); // true
 * isImmutable(Stack()); // true
 * isImmutable(Map().asMutable()); // true
 * ```
 */
export const isImmutable = (
  v: unknown
): v is CollectionImpl<unknown, unknown> | Record<object> =>
  isCollection(v) || isRecord(v);

/**
 * True if `maybeOrderedMap` is an OrderedMap.
 */
export const isOrderedMap = (v: unknown): v is OrderedMap<unknown, unknown> =>
  isMap(v) && isOrdered(v);

/**
 * True if `maybeOrderedSet` is an OrderedSet.
 */
export const isOrderedSet = (v: unknown): v is OrderedSet<unknown> =>
  isSet(v) && isOrdered(v);

/**
 * True if `maybeValue` is a JavaScript Object which has *both* `equals()`
 * and `hashCode()` methods.
 *
 * Any two instances of *value objects* can be compared for value equality with
 * `Immutable.is()` and can be used as keys in a `Map` or members in a `Set`.
 */
export const isValueObject = (v: unknown): v is ValueObject =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as ValueObject).equals === 'function' &&
  typeof (v as ValueObject).hashCode === 'function';
