/* eslint-disable @typescript-eslint/no-explicit-any -- these are mixin
 * methods whose `this` is whichever collection class they are mixed into */
import type { KeyPath } from '../type-definitions/immutable';
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

// The mutable-ownership surface every collection with withMutations support
// implements.
interface Mutable {
  __ownerID?: OwnerID;
  __altered: boolean;
  __ensureOwner(ownerID?: OwnerID): Mutable;
  asMutable(): Mutable;
  wasAltered(): boolean;
}

export function asImmutable(this: Mutable): Mutable {
  return this.__ensureOwner();
}

export function asMutable(this: Mutable): Mutable {
  return this.__ownerID ? this : this.__ensureOwner(new OwnerID());
}

export function wasAltered(this: Mutable): boolean {
  return this.__altered;
}

export function withMutations(
  this: Mutable,
  fn: (mutable: Mutable) => unknown
): Mutable {
  const mutable = this.asMutable();
  fn(mutable);
  return mutable.wasAltered() ? mutable.__ensureOwner(this.__ownerID) : this;
}

export function getIn(
  this: any,
  searchKeyPath: KeyPath<unknown>,
  notSetValue?: unknown
): unknown {
  return _getIn(this, searchKeyPath, notSetValue);
}

export function hasIn(this: any, searchKeyPath: KeyPath<unknown>): boolean {
  return _hasIn(this, searchKeyPath);
}

export function deleteIn(this: any, keyPath: KeyPath<PropertyKey>): unknown {
  return removeIn(this, keyPath);
}

export function setIn(
  this: any,
  keyPath: KeyPath<PropertyKey>,
  v: unknown
): unknown {
  return _setIn(this, keyPath, v);
}

export function update(
  this: any,
  key: unknown,
  notSetValue?: unknown,
  updater?: (value: unknown) => unknown
): unknown {
  return typeof key === 'function'
    ? key(this)
    : (_update as any)(this, key, notSetValue, updater);
}

export function updateIn(
  this: any,
  keyPath: KeyPath<PropertyKey>,
  notSetValue: unknown,
  updater?: (value: unknown) => unknown
): unknown {
  return (_updateIn as any)(this, keyPath, notSetValue, updater);
}

export function toObject(this: any): { [key: string]: unknown } {
  assertNotInfinite(this.size);
  const object: { [key: string]: unknown } = {};
  this.__iterate((v: unknown, k: any) => {
    object[k] = v;
  });
  return object;
}

type Merger = (oldValue: any, newValue: any, key: any) => unknown;

export function merge(this: any, ...iters: Array<unknown>): unknown {
  return mergeIntoKeyedWith(this, iters);
}

export function mergeWith(
  this: any,
  merger: Merger,
  ...iters: Array<unknown>
): unknown {
  if (typeof merger !== 'function') {
    throw new TypeError(`Invalid merger function: ${merger}`);
  }
  return mergeIntoKeyedWith(this, iters, merger);
}

function mergeIntoKeyedWith(
  collection: any,
  collections: Array<unknown>,
  merger?: Merger
): unknown {
  const iters: Array<any> = [];
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
  return collection.withMutations((collection: any) => {
    const mergeIntoCollection = merger
      ? (value: unknown, key: unknown) => {
          _update(collection, key, NOT_SET, (oldVal) =>
            oldVal === NOT_SET ? value : merger(oldVal, value, key)
          );
        }
      : (value: unknown, key: unknown) => {
          collection.set(key, value);
        };
    for (const iter of iters) {
      iter.forEach(mergeIntoCollection);
    }
  });
}

export function mergeDeep(this: any, ...iters: Array<unknown>): unknown {
  return mergeDeepWithSources(this, iters);
}

export function mergeDeepWith(
  this: any,
  merger: Merger,
  ...iters: Array<unknown>
): unknown {
  return mergeDeepWithSources(this, iters, merger);
}

export function mergeIn(
  this: any,
  keyPath: KeyPath<PropertyKey>,
  ...iters: Array<unknown>
): unknown {
  return (_updateIn as any)(this, keyPath, emptyMap(), (m: unknown) =>
    mergeWithSources(m, iters)
  );
}

export function mergeDeepIn(
  this: any,
  keyPath: KeyPath<PropertyKey>,
  ...iters: Array<unknown>
): unknown {
  return (_updateIn as any)(this, keyPath, emptyMap(), (m: unknown) =>
    mergeDeepWithSources(m, iters)
  );
}

export function mixin(Class: { prototype: object }, methods: object): void {
  Object.assign(Class.prototype, methods);
}

// Shared method groups, spread into each collection's mixin() call. These
// are functions rather than plain objects because this module and the
// collection modules import each other: the collections' static blocks can
// run while this module is still mid-evaluation, where a `const` object
// would still be uninitialized but hoisted function declarations already
// work.

// wasAltered is intentionally not included: SetImpl defines its own
// wasAltered class method (delegating to its inner _map), and mixing one in
// would clobber it — collections that use the shared implementation list
// wasAltered explicitly alongside this group.
export function mutatorMethods() {
  return {
    asImmutable,
    asMutable,
    withMutations,
  };
}

export function deepPathMethods() {
  return {
    deleteIn,
    removeIn: deleteIn,
    mergeDeepIn,
    mergeIn,
    setIn,
    update,
    updateIn,
  };
}

export function keyedMergeMethods() {
  return {
    merge,
    mergeWith,
    mergeDeep,
    mergeDeepWith,
  };
}
