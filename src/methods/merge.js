import { KeyedCollection } from '../Collection';
import { NOT_SET } from '../TrieUtils';
import { update } from '../functional/update';
import { isRecord } from '../predicates/isRecord';

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
          update(collection, key, NOT_SET, (oldVal) =>
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
