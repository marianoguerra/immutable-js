/**
 * Side-effect module that patches conversion and sort methods onto base-class
 * prototypes.  Imported once by Immutable.js after all concrete types have
 * been defined, breaking the circular dependency that previously required the
 * `_late` runtime registry in Collection.ts.
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

const asValues = (collection) =>
  isKeyed(collection) ? collection.valueSeq() : collection;

// --- CollectionImpl.prototype patches ---

CollectionImpl.prototype.toMap = function toMap() {
  return Map(this.toKeyedSeq());
};

CollectionImpl.prototype.toOrderedMap = function toOrderedMap() {
  return OrderedMap(this.toKeyedSeq());
};

CollectionImpl.prototype.toOrderedSet = function toOrderedSet() {
  return OrderedSet(asValues(this));
};

CollectionImpl.prototype.toSet = function toSet() {
  return Set(asValues(this));
};

CollectionImpl.prototype.toStack = function toStack() {
  return Stack(asValues(this));
};

CollectionImpl.prototype.toList = function toList() {
  return List(asValues(this));
};

CollectionImpl.prototype.countBy = function countBy(grouper, context) {
  const groups = Map().asMutable();
  this.__iterate((v, k) => {
    groups.update(grouper.call(context, v, k, this), 0, (a) => a + 1);
  });
  return groups.asImmutable();
};

CollectionImpl.prototype.groupBy = function groupBy(grouper, context) {
  const isKeyedIter = isKeyed(this);
  const groups = (isOrdered(this) ? OrderedMap() : Map()).asMutable();
  this.__iterate((v, k) => {
    groups.update(grouper.call(context, v, k, this), (a) => {
      a ??= [];
      a.push(isKeyedIter ? [k, v] : v);
      return a;
    });
  });
  return groups.map((arr) => reifyValues(this, arr)).asImmutable();
};

// --- IndexedCollectionImpl.prototype patches ---

IndexedCollectionImpl.prototype.keySeq = function keySeq() {
  return Range(0, this.size);
};

// --- MapImpl.prototype patches ---

MapImpl.prototype.sort = function sort(comparator) {
  return OrderedMap(sortFactory(this, comparator));
};

MapImpl.prototype.sortBy = function sortBy(mapper, comparator) {
  return OrderedMap(sortFactory(this, comparator, mapper));
};

// --- SetImpl.prototype patches ---

SetImpl.prototype.sort = function sort(comparator) {
  return OrderedSet(sortFactory(this, comparator));
};

SetImpl.prototype.sortBy = function sortBy(mapper, comparator) {
  return OrderedSet(sortFactory(this, comparator, mapper));
};
