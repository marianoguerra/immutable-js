/* eslint-disable @typescript-eslint/no-explicit-any -- the backing _map
 * comes from the still-untyped Map.js */
import {
  Collection,
  SetCollectionImpl,
  KeyedCollection,
  SetCollection,
} from './Collection';
import { emptyMap } from './Map';
import type { OwnerID } from './TrieUtils';
import { DELETE } from './TrieUtils';
import { mixin, mutatorMethods } from './methods';
import { IS_SET_SYMBOL, isOrdered, isSet } from './predicates';
import { assertNotInfinite } from './utils/assertions';

export const Set = <T>(value?: Iterable<T> | ArrayLike<T>): SetImpl<T> =>
  value === undefined || value === null
    ? emptySet()
    : isSet(value) && !isOrdered(value)
      ? (value as unknown as SetImpl<T>)
      : emptySet<T>().withMutations((set) => {
          const iter = SetCollection(value);
          assertNotInfinite(iter.size);
          iter.forEach((v) => set.add(v as T));
        });

Set.of = <T>(...values: Array<T>): SetImpl<T> => Set(values);

Set.fromKeys = (value: unknown): SetImpl<unknown> =>
  Set(KeyedCollection(value).keySeq());

Set.intersect = (sets: Iterable<unknown>): SetImpl<unknown> => {
  const setArray = Collection(sets).toArray();
  return setArray.length
    ? Set(setArray.pop() as Iterable<unknown>).intersect(...setArray)
    : emptySet();
};

Set.union = (sets: Iterable<unknown>): SetImpl<unknown> => {
  const setArray = Collection(sets).toArray();
  return setArray.length
    ? Set(setArray.pop() as Iterable<unknown>).union(...setArray)
    : emptySet();
};

export class SetImpl<T> extends SetCollectionImpl<T> {
  static {
    mixin(this, {
      // No wasAltered here: SetImpl defines its own wasAltered class method.
      ...mutatorMethods(),
      [IS_SET_SYMBOL]: true,
      [DELETE]: this.prototype.remove,
      merge: this.prototype.union,
      concat: this.prototype.union,
      [Symbol.toStringTag]: 'Immutable.Set',
    });
  }

  _map: any;
  __ownerID: OwnerID | undefined;

  // Provided by the mutatorMethods mixin in the static block above; declared
  // here so internal call sites type-check.
  declare withMutations: (fn: (mutable: SetImpl<T>) => unknown) => SetImpl<T>;

  constructor(map?: any, ownerID?: OwnerID) {
    super();
    this.size = map ? map.size : 0;
    this._map = map;
    this.__ownerID = ownerID;
  }

  create(value: unknown): SetImpl<unknown> {
    return Set(value as Iterable<unknown>);
  }

  override toString(): string {
    return this.__toString('Set {', '}');
  }

  override has(value: T): boolean {
    return this._map.has(value);
  }

  add(value: T): SetImpl<T> {
    return updateSet(this, this._map.set(value, value));
  }

  remove(value: T): SetImpl<T> {
    return updateSet(this, this._map.remove(value));
  }

  clear(): SetImpl<T> {
    return updateSet(this, this._map.clear());
  }

  override map(
    mapper: (value: T, key: T, iter: this) => T,
    context?: unknown
  ): SetImpl<T> {
    // keep track if the set is altered by the map function
    let didChanges = false;

    const newMap = updateSet(
      this,
      this._map.mapEntries(([, v]: [T, T]) => {
        const mapped = mapper.call(context as any, v, v, this);

        if (mapped !== v) {
          didChanges = true;
        }

        return [mapped, mapped];
      }, context)
    );

    return didChanges ? newMap : this;
  }

  union(...iters: Array<any>): SetImpl<T> {
    iters = iters.filter((x) => x.size !== 0);
    if (iters.length === 0) {
      return this;
    }
    // Only plain Set may take this shortcut: an OrderedSet must fall
    // through to withMutations to keep its subtype (the original code
    // used `this.constructor(iters[0])`, which preserved it).
    if (
      this.size === 0 &&
      !this.__ownerID &&
      iters.length === 1 &&
      !isOrdered(this)
    ) {
      return Set(iters[0]);
    }
    return this.withMutations((set: SetImpl<T>) => {
      for (const iter of iters) {
        if (typeof iter === 'string') {
          set.add(iter as unknown as T);
        } else {
          SetCollection(iter).forEach((value) => set.add(value as T));
        }
      }
    });
  }

  intersect(...iters: Array<unknown>): SetImpl<T> {
    return filterByIters(
      this,
      iters,
      (value, sets) => !sets.every((iter) => iter.includes(value))
    );
  }

  subtract(...iters: Array<unknown>): SetImpl<T> {
    return filterByIters(this, iters, (value, sets) =>
      sets.some((iter) => iter.includes(value))
    );
  }

  wasAltered(): boolean {
    return this._map.wasAltered();
  }

  override __iterator(reverse?: boolean): IterableIterator<[T, T]> {
    return this._map.__iterator(reverse);
  }

  __empty(): SetImpl<T> {
    return emptySet();
  }
  __make(map: any, ownerID?: OwnerID): SetImpl<T> {
    return makeSet(map, ownerID);
  }

  __ensureOwner(ownerID?: OwnerID): SetImpl<T> {
    if (ownerID === this.__ownerID) {
      return this;
    }
    const newMap = this._map.__ensureOwner(ownerID);
    if (!ownerID) {
      if (this.size === 0) {
        return this.__empty();
      }
      this.__ownerID = ownerID;
      this._map = newMap;
      return this;
    }
    return this.__make(newMap, ownerID);
  }
}

Set.isSet = isSet;

const makeSet = <T>(map?: any, ownerID?: OwnerID): SetImpl<T> =>
  new SetImpl(map, ownerID);

let EMPTY_SET: SetImpl<unknown> | undefined;
const emptySet = <T>(): SetImpl<T> =>
  (EMPTY_SET || (EMPTY_SET = makeSet(emptyMap()))) as SetImpl<T>;

function filterByIters<T>(
  set: SetImpl<T>,
  iters: Array<unknown>,
  shouldRemove: (value: T, sets: Array<any>) => boolean
): SetImpl<T> {
  if (iters.length === 0) {
    return set;
  }
  const sets = iters.map((iter) => SetCollection(iter as Iterable<unknown>));
  return set.withMutations((s: SetImpl<T>) => {
    set.forEach((value) => {
      if (shouldRemove(value as T, sets)) {
        s.remove(value as T);
      }
    });
  });
}

function updateSet<T>(set: SetImpl<T>, newMap: any): SetImpl<T> {
  if (set.__ownerID) {
    set.size = newMap.size;
    set._map = newMap;
    return set;
  }
  return newMap === set._map
    ? set
    : newMap.size === 0
      ? set.__empty()
      : set.__make(newMap);
}
