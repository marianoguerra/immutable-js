import type { Record } from '../../type-definitions/immutable';
import type { CollectionImpl } from '../Collection';
import { isImmutable } from '../predicates';

export function isArrayLike(value: unknown): value is ArrayLike<unknown> {
  if (Array.isArray(value) || typeof value === 'string') {
    return true;
  }

  // @ts-expect-error "Type 'unknown' is not assignable to type 'boolean'" : convert to Boolean
  return (
    value &&
    typeof value === 'object' &&
    // @ts-expect-error check that `'length' in value &&`
    Number.isInteger(value.length) &&
    // @ts-expect-error check that `'length' in value &&`
    value.length >= 0 &&
    // @ts-expect-error check that `'length' in value &&`
    (value.length === 0
      ? // Only {length: 0} is considered Array-like.
        Object.keys(value).length === 1
      : // An object is only Array-like if it has a property where the last value
        // in the array-like may be found (which could be undefined).
        // @ts-expect-error check that `'length' in value &&`
        Object.hasOwn(value, value.length - 1))
  );
}

export function isPlainObject(value: unknown): value is object {
  // The base prototype's toString deals with Argument objects and native namespaces like Math
  if (
    !value ||
    typeof value !== 'object' ||
    Object.prototype.toString.call(value) !== '[object Object]'
  ) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  if (proto === null) {
    return true;
  }

  // Iteratively going up the prototype chain is needed for cross-realm environments (differing contexts, iframes, etc)
  let parentProto = proto;
  let nextProto = Object.getPrototypeOf(proto);
  while (nextProto !== null) {
    parentProto = nextProto;
    nextProto = Object.getPrototypeOf(parentProto);
  }
  return parentProto === proto;
}

/**
 * Returns true if the value is a potentially-persistent data structure, either
 * provided by Immutable.js or a plain Array or Object.
 */
export const isDataStructure = (
  value: unknown
): value is
  | CollectionImpl<unknown, unknown>
  | Record<object>
  | Array<unknown>
  | object =>
  typeof value === 'object' &&
  (isImmutable(value) || Array.isArray(value) || isPlainObject(value));
