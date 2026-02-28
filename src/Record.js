import { KeyedCollection } from './Collection';
import { ITERATE_ENTRIES } from './Iterator';
import { List } from './List';
import { keyedSeqFromValue } from './Seq';
import { DELETE } from './TrieUtils';
import {
  asImmutable,
  asMutable,
  deleteIn,
  getIn,
  hasIn,
  merge,
  mergeWith,
  mergeDeep,
  mergeDeepWith,
  mergeDeepIn,
  mergeIn,
  setIn,
  toObject,
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
  static {
    this.prototype[IS_RECORD_SYMBOL] = true;
    this.prototype[DELETE] = this.prototype.remove;
    this.prototype.removeIn = this.prototype.deleteIn;
    this.prototype[Symbol.iterator] = this.prototype.entries;
    this.prototype[Symbol.toStringTag] = 'Immutable.Record';
    this.prototype.toJSON = this.prototype.toObject;
  }

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

  // methods.js wrappers
  deleteIn(keyPath) {
    return deleteIn.call(this, keyPath);
  }
  getIn(searchKeyPath, notSetValue) {
    return getIn.call(this, searchKeyPath, notSetValue);
  }
  hasIn(searchKeyPath) {
    return hasIn.call(this, searchKeyPath);
  }
  merge(...iters) {
    return merge.call(this, ...iters);
  }
  mergeWith(merger, ...iters) {
    return mergeWith.call(this, merger, ...iters);
  }
  mergeIn(keyPath, ...iters) {
    return mergeIn.call(this, keyPath, ...iters);
  }
  mergeDeep(...iters) {
    return mergeDeep.call(this, ...iters);
  }
  mergeDeepWith(merger, ...iters) {
    return mergeDeepWith.call(this, merger, ...iters);
  }
  mergeDeepIn(keyPath, ...iters) {
    return mergeDeepIn.call(this, keyPath, ...iters);
  }
  setIn(keyPath, v) {
    return setIn.call(this, keyPath, v);
  }
  update(key, notSetValue, updater) {
    return update.call(this, key, notSetValue, updater);
  }
  updateIn(keyPath, notSetValue, updater) {
    return updateIn.call(this, keyPath, notSetValue, updater);
  }
  withMutations(fn) {
    return withMutations.call(this, fn);
  }
  asMutable() {
    return asMutable.call(this);
  }
  asImmutable() {
    return asImmutable.call(this);
  }
  toObject() {
    return toObject.call(this);
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
