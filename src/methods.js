import { KeyedCollection } from './Collection';
import { emptyMap } from './Map';
import { OwnerID, NOT_SET } from './TrieUtils';
import { getIn as _getIn } from './functional/getIn';
import { hasIn as _hasIn } from './functional/hasIn';
import { mergeDeepWithSources, mergeWithSources } from './functional/merge';
import { removeIn } from './functional/removeIn';
import { setIn as _setIn } from './functional/setIn';
import { update as _update } from './functional/update';
import { updateIn as _updateIn } from './functional/updateIn';
import { isRecord } from './predicates';
import { assertNotInfinite } from './utils/assertions';

export function asImmutable() {
  return this.__ensureOwner();
}

export function asMutable() {
  return this.__ownerID ? this : this.__ensureOwner(new OwnerID());
}

export function wasAltered() {
  return this.__altered;
}

export function withMutations(fn) {
  const mutable = this.asMutable();
  fn(mutable);
  return mutable.wasAltered() ? mutable.__ensureOwner(this.__ownerID) : this;
}

export function getIn(searchKeyPath, notSetValue) {
  return _getIn(this, searchKeyPath, notSetValue);
}

export function hasIn(searchKeyPath) {
  return _hasIn(this, searchKeyPath);
}

export function deleteIn(keyPath) {
  return removeIn(this, keyPath);
}

export function setIn(keyPath, v) {
  return _setIn(this, keyPath, v);
}

export function update(key, notSetValue, updater) {
  return typeof key === 'function'
    ? key(this)
    : _update(this, key, notSetValue, updater);
}

export function updateIn(keyPath, notSetValue, updater) {
  return _updateIn(this, keyPath, notSetValue, updater);
}

export function toObject() {
  assertNotInfinite(this.size);
  const object = {};
  this.__iterate((v, k) => {
    object[k] = v;
  });
  return object;
}

export function merge(...iters) {
  return mergeIntoKeyedWith(this, iters);
}

export function mergeWith(merger, ...iters) {
  if (typeof merger !== 'function') {
    throw new TypeError(`Invalid merger function: ${merger}`);
  }
  return mergeIntoKeyedWith(this, iters, merger);
}

function mergeIntoKeyedWith(collection, collections, merger) {
  const iters = [];
  for (const item of collections) {
    const collection = KeyedCollection(item);
    if (collection.size !== 0) {
      iters.push(collection);
    }
  }
  if (iters.length === 0) {
    return collection;
  }
  if (
    collection.toSeq().size === 0 &&
    !collection.__ownerID &&
    iters.length === 1
  ) {
    return isRecord(collection)
      ? collection // Record is empty and will not be updated: return the same instance
      : collection.create(iters[0]);
  }
  return collection.withMutations((collection) => {
    const mergeIntoCollection = merger
      ? (value, key) => {
          _update(collection, key, NOT_SET, (oldVal) =>
            oldVal === NOT_SET ? value : merger(oldVal, value, key)
          );
        }
      : (value, key) => {
          collection.set(key, value);
        };
    for (const iter of iters) {
      iter.forEach(mergeIntoCollection);
    }
  });
}

export function mergeDeep(...iters) {
  return mergeDeepWithSources(this, iters);
}

export function mergeDeepWith(merger, ...iters) {
  return mergeDeepWithSources(this, iters, merger);
}

export function mergeIn(keyPath, ...iters) {
  return _updateIn(this, keyPath, emptyMap(), (m) =>
    mergeWithSources(m, iters)
  );
}

export function mergeDeepIn(keyPath, ...iters) {
  return _updateIn(this, keyPath, emptyMap(), (m) =>
    mergeDeepWithSources(m, iters)
  );
}
