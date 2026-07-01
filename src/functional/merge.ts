/* eslint-disable @typescript-eslint/no-explicit-any -- this module merges
 * immutable collections, plain arrays and plain objects interchangeably */
import { IndexedCollection, KeyedCollection } from '../Collection';
import { Seq } from '../Seq';
import { isImmutable, isIndexed, isKeyed } from '../predicates';
import shallowCopy from '../utils/shallowCopy';
import { isDataStructure } from '../utils/typeChecks';

type Merger = (oldValue: any, newValue: any, key: any) => unknown;

export const merge = <C>(collection: C, ...sources: Array<unknown>): C =>
  mergeWithSources(collection, sources);

export const mergeWith = <C>(
  merger: Merger,
  collection: C,
  ...sources: Array<unknown>
): C => mergeWithSources(collection, sources, merger);

export const mergeDeepWithSources = <C>(
  collection: C,
  sources: Array<unknown>,
  merger?: Merger
): C => mergeWithSources(collection, sources, deepMergerWith(merger));

export const mergeDeep = <C>(collection: C, ...sources: Array<unknown>): C =>
  mergeDeepWithSources(collection, sources);

export const mergeDeepWith = <C>(
  merger: Merger,
  collection: C,
  ...sources: Array<unknown>
): C => mergeDeepWithSources(collection, sources, merger);

export function mergeWithSources<C>(
  collection: C,
  sources: Array<unknown>,
  merger?: Merger
): C {
  if (!isDataStructure(collection)) {
    throw new TypeError(
      `Cannot merge into non-data-structure value: ${collection}`
    );
  }
  if (isImmutable(collection)) {
    return typeof merger === 'function' && (collection as any).mergeWith
      ? (collection as any).mergeWith(merger, ...sources)
      : (collection as any).merge
        ? (collection as any).merge(...sources)
        : (collection as any).concat(...sources);
  }
  const isArray = Array.isArray(collection);
  let merged: any = collection;
  const Collection = isArray ? IndexedCollection : KeyedCollection;
  const mergeItem = isArray
    ? (value: unknown) => {
        // Copy on write
        if (merged === collection) {
          merged = shallowCopy(merged);
        }
        merged.push(value);
      }
    : (value: unknown, key: any) => {
        const hasVal = Object.hasOwn(merged, key);
        const nextVal =
          hasVal && merger ? merger(merged[key], value, key) : value;
        if (!hasVal || nextVal !== merged[key]) {
          // Copy on write
          if (merged === collection) {
            merged = shallowCopy(merged);
          }
          merged[key] = nextVal;
        }
      };
  for (const source of sources) {
    (Collection as any)(source).forEach(mergeItem);
  }
  return merged;
}

function deepMergerWith(merger?: Merger): Merger {
  function deepMerger(oldValue: any, newValue: any, key: any): unknown {
    return isDataStructure(oldValue) &&
      isDataStructure(newValue) &&
      areMergeable(oldValue, newValue)
      ? mergeWithSources(oldValue, [newValue], deepMerger)
      : merger
        ? merger(oldValue, newValue, key)
        : newValue;
  }
  return deepMerger;
}

/**
 * It's unclear what the desired behavior is for merging two collections that
 * fall into separate categories between keyed, indexed, or set-like, so we only
 * consider them mergeable if they fall into the same category.
 */
function areMergeable(
  oldDataStructure: unknown,
  newDataStructure: unknown
): boolean {
  const oldSeq = Seq(oldDataStructure);
  const newSeq = Seq(newDataStructure);
  // This logic assumes that a sequence can only fall into one of the three
  // categories mentioned above (since there's no `isSetLike()` method).
  return (
    isIndexed(oldSeq) === isIndexed(newSeq) &&
    isKeyed(oldSeq) === isKeyed(newSeq)
  );
}
