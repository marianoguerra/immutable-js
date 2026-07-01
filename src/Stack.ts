import type { CollectionImpl } from './Collection';
import { IndexedCollection, IndexedCollectionImpl } from './Collection';
import {
  DONE,
  makeEntryIterator,
  makeIndexKeys,
  makeIterator,
} from './Iterator';
import type { OwnerID } from './TrieUtils';
import { wholeSlice, resolveBegin, resolveEnd, wrapIndex } from './TrieUtils';
import { mixin, wasAltered, mutatorMethods } from './methods';
import { IS_STACK_SYMBOL, isStack } from './predicates';
import { assertNotInfinite } from './utils/assertions';

interface StackNode<T> {
  value: T;
  next: StackNode<T> | undefined;
}

export const Stack = <T>(value?: Iterable<T> | ArrayLike<T>): StackImpl<T> =>
  value === undefined || value === null
    ? emptyStack()
    : isStack(value)
      ? (value as unknown as StackImpl<T>)
      : emptyStack<T>().pushAll(value);

Stack.of = <T>(...values: Array<T>): StackImpl<T> => Stack(values);

export class StackImpl<T> extends IndexedCollectionImpl<T> {
  static {
    mixin(this, {
      ...mutatorMethods(),
      wasAltered,
      [IS_STACK_SYMBOL]: true,
      shift: this.prototype.pop,
      unshift: this.prototype.push,
      unshiftAll: this.prototype.pushAll,
      [Symbol.toStringTag]: 'Immutable.Stack',
      [Symbol.iterator]: this.prototype.values,
    });
  }

  _head: StackNode<T> | undefined;
  __ownerID: OwnerID | undefined;
  __altered: boolean;

  constructor(
    size: number,
    head?: StackNode<T>,
    ownerID?: OwnerID,
    hash?: number
  ) {
    super();
    this.size = size;
    this._head = head;
    this.__ownerID = ownerID;
    this.__hash = hash;
    this.__altered = false;
  }

  create(value: unknown): StackImpl<unknown> {
    return Stack(value as Iterable<unknown>);
  }

  override toString(): string {
    return this.__toString('Stack [', ']');
  }

  override get<NSV>(index: number, notSetValue: NSV): T | NSV;
  override get(index: number): T | undefined;
  override get<NSV>(index: number, notSetValue?: NSV): T | NSV | undefined {
    let head = this._head;
    index = wrapIndex(
      this as unknown as CollectionImpl<unknown, unknown>,
      index
    );
    while (head && index--) {
      head = head.next;
    }
    return head ? head.value : notSetValue;
  }

  peek(): T | undefined {
    return this._head?.value;
  }

  push(...values: Array<T>): StackImpl<T> {
    if (values.length === 0) {
      return this;
    }
    const newSize = this.size + values.length;
    let head = this._head;
    for (let ii = values.length - 1; ii >= 0; ii--) {
      head = {
        value: values[ii] as T,
        next: head,
      };
    }
    return returnStack(this, newSize, head);
  }

  pushAll(iter: Iterable<T> | ArrayLike<T>): StackImpl<T> {
    const collection = IndexedCollection(iter);
    if (collection.size === 0) {
      return this;
    }
    if (this.size === 0 && isStack(collection)) {
      return collection as unknown as StackImpl<T>;
    }
    assertNotInfinite(collection.size);
    let newSize = this.size;
    let head = this._head;
    collection.__iterate((value) => {
      newSize++;
      head = {
        value: value as T,
        next: head,
      };
    }, /* reverse */ true);
    return returnStack(this, newSize, head);
  }

  pop(): StackImpl<T> {
    return this.slice(1);
  }

  clear(): StackImpl<T> {
    if (this.size === 0) {
      return this;
    }
    if (this.__ownerID) {
      this.size = 0;
      this._head = undefined;
      this.__hash = undefined;
      this.__altered = true;
      return this;
    }
    return emptyStack();
  }

  override slice(begin?: number, end?: number): StackImpl<T> {
    if (wholeSlice(begin, end, this.size)) {
      return this;
    }
    let resolvedBegin = resolveBegin(begin, this.size);
    const resolvedEnd = resolveEnd(end, this.size);
    if (resolvedEnd !== this.size) {
      // super.slice(begin, end);
      return IndexedCollectionImpl.prototype.slice.call(
        this,
        begin,
        end
      ) as StackImpl<T>;
    }
    const newSize = this.size - resolvedBegin;
    let head = this._head;
    while (resolvedBegin--) {
      head = head?.next;
    }
    return returnStack(this, newSize, head);
  }

  __ensureOwner(ownerID?: OwnerID): StackImpl<T> {
    if (ownerID === this.__ownerID) {
      return this;
    }
    if (!ownerID) {
      if (this.size === 0) {
        return emptyStack();
      }
      this.__ownerID = ownerID;
      this.__altered = false;
      return this;
    }
    return makeStack(this.size, this._head, ownerID, this.__hash);
  }

  override __iterate(
    fn: (value: T, index: number, iter: this) => boolean | void,
    reverse: boolean = false
  ): number {
    if (reverse) {
      const arr = this.toArray();
      const size = arr.length;
      let i = 0;
      while (i !== size) {
        if (fn(arr[size - ++i] as T, size - i, this) === false) {
          break;
        }
      }
      return i;
    }
    let iterations = 0;
    let node = this._head;
    while (node) {
      if (fn(node.value, iterations++, this) === false) {
        break;
      }
      node = node.next;
    }
    return iterations;
  }

  override __iterator(reverse: boolean = false): IterableIterator<[number, T]> {
    if (reverse) {
      const arr = this.toArray();
      const size = arr.length;
      let i = 0;
      return makeEntryIterator<number, T>((entry) => {
        if (i === size) {
          return false;
        }
        const ii = size - ++i;
        entry[0] = ii;
        entry[1] = arr[ii] as T;
        return true;
      });
    }
    let iterations = 0;
    let node = this._head;
    return makeEntryIterator<number, T>((entry) => {
      if (!node) {
        return false;
      }
      entry[0] = iterations++;
      entry[1] = node.value;
      node = node.next;
      return true;
    });
  }

  override values(): IterableIterator<T> {
    let node = this._head;
    const result: IteratorResult<T> = {
      done: false,
      value: undefined as unknown as T,
    };
    return makeIterator(() => {
      if (!node) return DONE as IteratorResult<T>;
      result.value = node.value;
      node = node.next;
      return result;
    });
  }

  override keys(): IterableIterator<number> {
    return makeIndexKeys(this.size);
  }
}

Stack.isStack = isStack;

function returnStack<T>(
  stack: StackImpl<T>,
  newSize: number,
  head: StackNode<T> | undefined
): StackImpl<T> {
  if (stack.__ownerID) {
    stack.size = newSize;
    stack._head = head;
    stack.__hash = undefined;
    stack.__altered = true;
    return stack;
  }
  return makeStack(newSize, head);
}

const makeStack = <T>(
  size: number,
  head?: StackNode<T>,
  ownerID?: OwnerID,
  hash?: number
): StackImpl<T> => new StackImpl(size, head, ownerID, hash);

let EMPTY_STACK: StackImpl<unknown> | undefined;
const emptyStack = <T>(): StackImpl<T> =>
  (EMPTY_STACK || (EMPTY_STACK = makeStack(0))) as StackImpl<T>;
