import { IndexedCollection, IndexedCollectionImpl } from './Collection';
import { getValueFromType } from './Iterator';
import { ArraySeq } from './Seq';
import { wholeSlice, resolveBegin, resolveEnd, wrapIndex } from './TrieUtils';
import { asImmutable, asMutable, wasAltered, withMutations } from './methods';
import { IS_STACK_SYMBOL, isStack } from './predicates';
import { assertNotInfinite } from './utils/assertions';

export const Stack = (value) =>
  value === undefined || value === null
    ? emptyStack()
    : isStack(value)
      ? value
      : emptyStack().pushAll(value);

Stack.of = (...values) => Stack(values);

export class StackImpl extends IndexedCollectionImpl {
  static {
    this.prototype[IS_STACK_SYMBOL] = true;
    this.prototype.shift = this.prototype.pop;
    this.prototype.unshift = this.prototype.push;
    this.prototype.unshiftAll = this.prototype.pushAll;
    this.prototype[Symbol.toStringTag] = 'Immutable.Stack';
  }

  constructor(size, head, ownerID, hash) {
    super();
    this.size = size;
    this._head = head;
    this.__ownerID = ownerID;
    this.__hash = hash;
    this.__altered = false;
  }

  create(value) {
    return Stack(value);
  }

  toString() {
    return this.__toString('Stack [', ']');
  }

  get(index, notSetValue) {
    let head = this._head;
    index = wrapIndex(this, index);
    while (head && index--) {
      head = head.next;
    }
    return head ? head.value : notSetValue;
  }

  peek() {
    return this._head?.value;
  }

  push(...values) {
    if (values.length === 0) {
      return this;
    }
    const newSize = this.size + values.length;
    let head = this._head;
    for (let ii = values.length - 1; ii >= 0; ii--) {
      head = {
        value: values[ii],
        next: head,
      };
    }
    return returnStack(this, newSize, head);
  }

  pushAll(iter) {
    iter = IndexedCollection(iter);
    if (iter.size === 0) {
      return this;
    }
    if (this.size === 0 && isStack(iter)) {
      return iter;
    }
    assertNotInfinite(iter.size);
    let newSize = this.size;
    let head = this._head;
    iter.__iterate((value) => {
      newSize++;
      head = {
        value,
        next: head,
      };
    }, /* reverse */ true);
    return returnStack(this, newSize, head);
  }

  pop() {
    return this.slice(1);
  }

  clear() {
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

  slice(begin, end) {
    if (wholeSlice(begin, end, this.size)) {
      return this;
    }
    let resolvedBegin = resolveBegin(begin, this.size);
    const resolvedEnd = resolveEnd(end, this.size);
    if (resolvedEnd !== this.size) {
      // super.slice(begin, end);
      return IndexedCollectionImpl.prototype.slice.call(this, begin, end);
    }
    const newSize = this.size - resolvedBegin;
    let head = this._head;
    while (resolvedBegin--) {
      head = head.next;
    }
    return returnStack(this, newSize, head);
  }

  __ensureOwner(ownerID) {
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

  __iterate(fn, reverse) {
    if (reverse) {
      return new ArraySeq(this.toArray()).__iterate(
        (v, k) => fn(v, k, this),
        reverse
      );
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

  // methods.js wrappers
  withMutations(fn) {
    return withMutations.call(this, fn);
  }
  wasAltered() {
    return wasAltered.call(this);
  }
  asImmutable() {
    return asImmutable.call(this);
  }
  asMutable() {
    return asMutable.call(this);
  }

  __iterator(type, reverse) {
    if (reverse) {
      return new ArraySeq(this.toArray()).__iterator(type, reverse);
    }
    let iterations = 0;
    let node = this._head;
    function* gen() {
      while (node) {
        const { value, next } = node;
        node = next;
        yield getValueFromType(type, iterations++, value);
      }
    }
    return gen();
  }
}

Stack.isStack = isStack;

function returnStack(stack, newSize, head) {
  if (stack.__ownerID) {
    stack.size = newSize;
    stack._head = head;
    stack.__hash = undefined;
    stack.__altered = true;
    return stack;
  }
  return makeStack(newSize, head);
}

const makeStack = (size, head, ownerID, hash) =>
  new StackImpl(size, head, ownerID, hash);

let EMPTY_STACK;
const emptyStack = () => EMPTY_STACK || (EMPTY_STACK = makeStack(0));
