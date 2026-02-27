import { KeyedCollection } from './Collection';
import { CollectionPrototype } from './CollectionImpl';
import { ITERATE_ENTRIES } from './Iterator';
import { List } from './List';
import { keyedSeqFromValue } from './Seq';
import { DELETE } from './TrieUtils';
import {
  asImmutable,
  asMutable,
  deleteIn,
  getIn,
  merge,
  mergeWith,
  mergeDeep,
  mergeDeepWith,
  mergeDeepIn,
  mergeIn,
  setIn,
  update,
  updateIn,
  withMutations,
} from './methods';

import { IS_RECORD_SYMBOL, isImmutable, isRecord } from './predicates';
import { toJS } from './toJS';
import invariant from './utils/assertions';
import quoteString from './utils/quoteString';

function throwOnInvalidDefaultValues(defaultValues) {
  if (isRecord(defaultValues)) {
    throw new Error(
      'Can not call `Record` with an immutable Record as default values. Use a plain javascript object instead.'
    );
  }

  if (isImmutable(defaultValues)) {
    throw new Error(
      'Can not call `Record` with an immutable Collection as default values. Use a plain javascript object instead.'
    );
  }

  if (defaultValues === null || typeof defaultValues !== 'object') {
    throw new Error(
      'Can not call `Record` with a non-object as default values. Use a plain javascript object instead.'
    );
  }
}

export const Record = (defaultValues, name) => {
  let hasInitialized;

  throwOnInvalidDefaultValues(defaultValues);

  const RecordType = function Record(values) {
    if (values instanceof RecordType) {
      return values;
    }
    if (!(this instanceof RecordType)) {
      return new RecordType(values);
    }
    if (!hasInitialized) {
      hasInitialized = true;
      const keys = Object.keys(defaultValues);
      const indices = (RecordTypePrototype._indices = {});
      RecordTypePrototype._keys = keys;
      RecordTypePrototype._defaultValues = defaultValues;
      for (let i = 0; i < keys.length; i++) {
        const propName = keys[i];
        indices[propName] = i;
        if (RecordTypePrototype[propName]) {
          // eslint-disable-next-line no-console
          console.warn(
            `Cannot define ${recordName(this)} with property "${propName}" since that property name is part of the Record API.`
          );
        } else {
          setProp(RecordTypePrototype, propName);
        }
      }
    }
    this.__ownerID = undefined;
    this._values = List().withMutations((l) => {
      l.setSize(this._keys.length);
      KeyedCollection(values).forEach((v, k) => {
        l.set(this._indices[k], v === this._defaultValues[k] ? undefined : v);
      });
    });
    return this;
  };

  const RecordTypePrototype = (RecordType.prototype =
    Object.create(RecordPrototype));
  RecordTypePrototype.constructor = RecordType;
  RecordTypePrototype.create = RecordType;

  if (name) {
    RecordType.displayName = name;
  }

  return RecordType;
};

export class RecordImpl {
  toString() {
    const body = this._keys
      .map((k) => `${k}: ${quoteString(this.get(k))}`)
      .join(', ');
    return `${recordName(this)} { ${body} }`;
  }

  equals(other) {
    return (
      this === other ||
      (isRecord(other) && recordSeq(this).equals(recordSeq(other)))
    );
  }

  hashCode() {
    return recordSeq(this).hashCode();
  }

  has(k) {
    return Object.hasOwn(this._indices, k);
  }

  get(k, notSetValue) {
    if (!this.has(k)) {
      return notSetValue;
    }
    const index = this._indices[k];
    const value = this._values.get(index);
    return value === undefined ? this._defaultValues[k] : value;
  }

  set(k, v) {
    if (this.has(k)) {
      const newValues = this._values.set(
        this._indices[k],
        v === this._defaultValues[k] ? undefined : v
      );
      if (newValues !== this._values && !this.__ownerID) {
        return makeRecord(this, newValues);
      }
    }
    return this;
  }

  remove(k) {
    return this.set(k);
  }

  clear() {
    const newValues = this._values.clear().setSize(this._keys.length);

    return this.__ownerID ? this : makeRecord(this, newValues);
  }

  wasAltered() {
    return this._values.wasAltered();
  }

  toSeq() {
    return recordSeq(this);
  }

  toJS() {
    return toJS(this);
  }

  entries() {
    return this.__iterator(ITERATE_ENTRIES);
  }

  __iterator(type, reverse) {
    return recordSeq(this).__iterator(type, reverse);
  }

  __iterate(fn, reverse) {
    return recordSeq(this).__iterate(fn, reverse);
  }

  __ensureOwner(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    const newValues = this._values.__ensureOwner(ownerID);
    if (!ownerID) {
      this.__ownerID = ownerID;
      this._values = newValues;
      return this;
    }
    return makeRecord(this, newValues, ownerID);
  }
}

Record.isRecord = isRecord;

const recordName = (record) =>
  record.constructor.displayName || record.constructor.name || 'Record';

const recordSeq = (record) =>
  keyedSeqFromValue(record._keys.map((k) => [k, record.get(k)]));

Record.getDescriptiveName = recordName;
const RecordPrototype = RecordImpl.prototype;
RecordPrototype[IS_RECORD_SYMBOL] = true;
RecordPrototype[DELETE] = RecordPrototype.remove;
RecordPrototype.deleteIn = RecordPrototype.removeIn = deleteIn;
RecordPrototype.getIn = getIn;
RecordPrototype.hasIn = CollectionPrototype.hasIn;
RecordPrototype.merge = merge;
RecordPrototype.mergeWith = mergeWith;
RecordPrototype.mergeIn = mergeIn;
RecordPrototype.mergeDeep = mergeDeep;
RecordPrototype.mergeDeepWith = mergeDeepWith;
RecordPrototype.mergeDeepIn = mergeDeepIn;
RecordPrototype.setIn = setIn;
RecordPrototype.update = update;
RecordPrototype.updateIn = updateIn;
RecordPrototype.withMutations = withMutations;
RecordPrototype.asMutable = asMutable;
RecordPrototype.asImmutable = asImmutable;
RecordPrototype[Symbol.iterator] = RecordPrototype.entries;
RecordPrototype[Symbol.toStringTag] = 'Immutable.Record';
RecordPrototype.toJSON = RecordPrototype.toObject =
  CollectionPrototype.toObject;

function makeRecord(likeRecord, values, ownerID) {
  const record = Object.create(Object.getPrototypeOf(likeRecord));
  record._values = values;
  record.__ownerID = ownerID;
  return record;
}

function setProp(prototype, name) {
  Object.defineProperty(prototype, name, {
    get() {
      return this.get(name);
    },
    set(value) {
      invariant(this.__ownerID, 'Cannot set on an immutable record.');
      this.set(name, value);
    },
  });
}
