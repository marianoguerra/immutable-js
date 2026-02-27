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
export function isCollection(
  maybeCollection: unknown
): maybeCollection is CollectionImpl<unknown, unknown> {
  return (
    typeof maybeCollection === 'object' &&
    maybeCollection !== null &&
    IS_COLLECTION_SYMBOL in maybeCollection
  );
}

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
export function isKeyed(
  maybeKeyed: unknown
): maybeKeyed is KeyedCollectionImpl<unknown, unknown> {
  return (
    typeof maybeKeyed === 'object' &&
    maybeKeyed !== null &&
    IS_KEYED_SYMBOL in maybeKeyed
  );
}

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
export function isIndexed<T>(
  maybeIndexed: unknown
): maybeIndexed is IndexedCollectionImpl<T> {
  return (
    typeof maybeIndexed === 'object' &&
    maybeIndexed !== null &&
    IS_INDEXED_SYMBOL in maybeIndexed
  );
}

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
export function isAssociative(
  maybeAssociative: unknown
): maybeAssociative is
  | KeyedCollectionImpl<unknown, unknown>
  | IndexedCollectionImpl<unknown> {
  return isKeyed(maybeAssociative) || isIndexed(maybeAssociative);
}

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
export function isOrdered<I>(
  maybeOrdered: Iterable<I>
): maybeOrdered is OrderedCollection<I>;
export function isOrdered(
  maybeOrdered: unknown
): maybeOrdered is OrderedCollection<unknown>;
export function isOrdered(
  maybeOrdered: unknown
): maybeOrdered is OrderedCollection<unknown> {
  return (
    typeof maybeOrdered === 'object' &&
    maybeOrdered !== null &&
    IS_ORDERED_SYMBOL in maybeOrdered
  );
}

/**
 * True if `maybeSeq` is a Seq.
 */
export function isSeq(
  maybeSeq: unknown
): maybeSeq is
  | Seq.Indexed<unknown>
  | Seq.Keyed<unknown, unknown>
  | Seq.Set<unknown> {
  return (
    typeof maybeSeq === 'object' &&
    maybeSeq !== null &&
    IS_SEQ_SYMBOL in maybeSeq
  );
}

/**
 * True if `maybeList` is a List.
 */
export function isList(maybeList: unknown): maybeList is List<unknown> {
  return (
    typeof maybeList === 'object' &&
    maybeList !== null &&
    IS_LIST_SYMBOL in maybeList
  );
}

/**
 * True if `maybeMap` is a Map.
 *
 * Also true for OrderedMaps.
 */
export function isMap(maybeMap: unknown): maybeMap is Map<unknown, unknown> {
  return (
    typeof maybeMap === 'object' &&
    maybeMap !== null &&
    IS_MAP_SYMBOL in maybeMap
  );
}

/**
 * True if `maybeSet` is a Set.
 *
 * Also true for OrderedSets.
 */
export function isSet(maybeSet: unknown): maybeSet is Set<unknown> {
  return (
    typeof maybeSet === 'object' &&
    maybeSet !== null &&
    IS_SET_SYMBOL in maybeSet
  );
}

/**
 * True if `maybeStack` is a Stack.
 */
export function isStack(maybeStack: unknown): maybeStack is Stack<unknown> {
  return (
    typeof maybeStack === 'object' &&
    maybeStack !== null &&
    IS_STACK_SYMBOL in maybeStack
  );
}

/**
 * True if `maybeRecord` is a Record.
 */
export function isRecord(maybeRecord: unknown): maybeRecord is Record<object> {
  return (
    typeof maybeRecord === 'object' &&
    maybeRecord !== null &&
    IS_RECORD_SYMBOL in maybeRecord
  );
}

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
export function isImmutable(
  maybeImmutable: unknown
): maybeImmutable is CollectionImpl<unknown, unknown> | Record<object> {
  return isCollection(maybeImmutable) || isRecord(maybeImmutable);
}

/**
 * True if `maybeOrderedMap` is an OrderedMap.
 */
export function isOrderedMap(
  maybeOrderedMap: unknown
): maybeOrderedMap is OrderedMap<unknown, unknown> {
  return isMap(maybeOrderedMap) && isOrdered(maybeOrderedMap);
}

/**
 * True if `maybeOrderedSet` is an OrderedSet.
 */
export function isOrderedSet(
  maybeOrderedSet: unknown
): maybeOrderedSet is OrderedSet<unknown> {
  return isSet(maybeOrderedSet) && isOrdered(maybeOrderedSet);
}

/**
 * True if `maybeValue` is a JavaScript Object which has *both* `equals()`
 * and `hashCode()` methods.
 *
 * Any two instances of *value objects* can be compared for value equality with
 * `Immutable.is()` and can be used as keys in a `Map` or members in a `Set`.
 */
export function isValueObject(maybeValue: unknown): maybeValue is ValueObject {
  return Boolean(
    maybeValue &&
    // @ts-expect-error: maybeValue is typed as `{}`
    typeof maybeValue.equals === 'function' &&
    // @ts-expect-error: maybeValue is typed as `{}`
    typeof maybeValue.hashCode === 'function'
  );
}
