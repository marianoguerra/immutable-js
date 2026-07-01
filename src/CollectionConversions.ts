/* eslint-disable @typescript-eslint/no-explicit-any -- patches methods onto
 * prototypes whose concrete types live in still-untyped modules */
/**
 * Patches conversion and sort methods onto base-class prototypes.
 * Called once by Immutable.js after all concrete types have been defined,
 * breaking the circular dependency that previously required the `_late`
 * runtime registry in Collection.ts.
 */

import {
  CollectionImpl,
  IndexedCollectionImpl,
  reifyValues,
} from './Collection';
import { List } from './List';
import { Map, MapImpl } from './Map';
import { sortFactory } from './Operations';
import { OrderedMap } from './OrderedMap';
import { OrderedSet } from './OrderedSet';
import { Range } from './Range';
import { Set, SetImpl } from './Set';
import { Stack } from './Stack';
import { isKeyed, isOrdered } from './predicates';

const asValues = (collection: any) =>
  isKeyed(collection) ? collection.valueSeq() : collection;

export function initCollectionConversions(): void {
  // --- CollectionImpl.prototype patches ---

  CollectionImpl.prototype.toMap = function toMap(this: any) {
    return Map(this.toKeyedSeq());
  };

  CollectionImpl.prototype.toOrderedMap = function toOrderedMap(this: any) {
    return OrderedMap(this.toKeyedSeq());
  };

  CollectionImpl.prototype.toOrderedSet = function toOrderedSet(this: any) {
    return OrderedSet(asValues(this));
  };

  CollectionImpl.prototype.toSet = function toSet(this: any) {
    return Set(asValues(this));
  };

  CollectionImpl.prototype.toStack = function toStack(this: any) {
    return Stack(asValues(this));
  };

  CollectionImpl.prototype.toList = function toList(this: any) {
    return List(asValues(this));
  };

  CollectionImpl.prototype.countBy = function countBy(
    this: any,
    grouper: (value: any, key: any, iter: any) => unknown,
    context?: unknown
  ) {
    const groups = Map().asMutable();
    this.__iterate((v: unknown, k: unknown) => {
      groups.update(grouper.call(context, v, k, this), 0, (a: number) => a + 1);
    });
    return groups.asImmutable();
  };

  CollectionImpl.prototype.groupBy = function groupBy(
    this: any,
    grouper: (value: any, key: any, iter: any) => unknown,
    context?: unknown
  ) {
    const isKeyedIter = isKeyed(this);
    const groups = (isOrdered(this) ? OrderedMap() : Map()).asMutable();
    this.__iterate((v: unknown, k: unknown) => {
      groups.update(grouper.call(context, v, k, this), (a: Array<unknown>) => {
        a ??= [];
        a.push(isKeyedIter ? [k, v] : v);
        return a;
      });
    });
    return groups
      .map((arr: Array<unknown>) => reifyValues(this, arr))
      .asImmutable();
  };

  // --- IndexedCollectionImpl.prototype patches ---

  IndexedCollectionImpl.prototype.keySeq = function keySeq(this: any) {
    return Range(0, this.size);
  };

  // --- MapImpl / SetImpl sort patches (identical up to the ordered type) ---

  const patchSort = (
    Impl: { prototype: any },
    OrderedCtor: (values: unknown) => unknown
  ) => {
    Impl.prototype.sort = function sort(this: any, comparator?: any) {
      return OrderedCtor(sortFactory(this, comparator));
    };
    Impl.prototype.sortBy = function sortBy(
      this: any,
      mapper: any,
      comparator?: any
    ) {
      return OrderedCtor(sortFactory(this, comparator, mapper));
    };
  };

  patchSort(MapImpl, OrderedMap);
  patchSort(SetImpl, OrderedSet);
}
