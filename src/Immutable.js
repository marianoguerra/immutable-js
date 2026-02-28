/* eslint-disable import/order */
import { Seq } from './Seq';
import { OrderedMap } from './OrderedMap';
import { List } from './List';
import { Map } from './Map';
import { Stack } from './Stack';
import { OrderedSet } from './OrderedSet';
import { PairSorting } from './PairSorting';
import { Set } from './Set';
import { Record } from './Record';
import { Range } from './Range';
import { Repeat } from './Repeat';
import { is } from './is';
import { fromJS } from './fromJS';

import { isPlainObject } from './utils/typeChecks';

// Functional predicates
import {
  isImmutable,
  isCollection,
  isKeyed,
  isIndexed,
  isAssociative,
  isOrdered,
  isValueObject,
  isSeq,
  isList,
  isMap,
  isOrderedMap,
  isStack,
  isSet,
  isOrderedSet,
  isRecord,
} from './predicates';

import { Collection, _late } from './Collection';
import {
  concatFactory,
  countByFactory,
  filterFactory,
  flatMapFactory,
  flattenFactory,
  flipFactory,
  FromEntriesSequence,
  groupByFactory,
  interposeFactory,
  mapFactory,
  maxFactory,
  partitionFactory,
  reverseFactory,
  skipWhileFactory,
  sliceFactory,
  sortFactory,
  takeWhileFactory,
  ToIndexedSequence,
  ToKeyedSequence,
  ToSetSequence,
  zipWithFactory,
} from './Operations';
import {
  getIn as methodGetIn,
  hasIn as methodHasIn,
  toObject,
} from './methods';
import { hash } from './Hash';

// Populate late-binding references now that all modules are loaded.
Object.assign(_late, {
  concatFactory,
  countByFactory,
  filterFactory,
  flatMapFactory,
  flattenFactory,
  flipFactory,
  FromEntriesSequence,
  groupByFactory,
  interposeFactory,
  mapFactory,
  maxFactory,
  partitionFactory,
  reverseFactory,
  skipWhileFactory,
  sliceFactory,
  sortFactory,
  takeWhileFactory,
  ToIndexedSequence,
  ToKeyedSequence,
  ToSetSequence,
  zipWithFactory,
  getIn: methodGetIn,
  hasIn: methodHasIn,
  toObject,
  Map,
  List,
  Set,
  Stack,
  OrderedMap,
  OrderedSet,
  Range,
});

// Functional read/write API
import { get } from './functional/get';
import { getIn } from './functional/getIn';
import { has } from './functional/has';
import { hasIn } from './functional/hasIn';
import { merge, mergeDeep, mergeWith, mergeDeepWith } from './functional/merge';
import { remove } from './functional/remove';
import { removeIn } from './functional/removeIn';
import { set } from './functional/set';
import { setIn } from './functional/setIn';
import { update } from './functional/update';
import { updateIn } from './functional/updateIn';

import pkg from '../package.json' with { type: 'json' };
const { version } = pkg;

export {
  version,
  Collection,
  Seq,
  Map,
  OrderedMap,
  List,
  Stack,
  Set,
  OrderedSet,
  PairSorting,
  Record,
  Range,
  Repeat,
  is,
  fromJS,
  hash,
  isImmutable,
  isCollection,
  isKeyed,
  isIndexed,
  isAssociative,
  isOrdered,
  isPlainObject,
  isValueObject,
  isSeq,
  isList,
  isMap,
  isOrderedMap,
  isStack,
  isSet,
  isOrderedSet,
  isRecord,
  get,
  getIn,
  has,
  hasIn,
  merge,
  mergeDeep,
  mergeWith,
  mergeDeepWith,
  remove,
  removeIn,
  set,
  setIn,
  update,
  updateIn,
};
