import { IndexedCollectionImpl, IndexedCollection } from './Collection';
import { hasIterator } from './Iterator';
import {
  DELETE,
  SHIFT,
  SIZE,
  MASK,
  OwnerID,
  MakeRef,
  SetRef,
  wrapIndex,
  wholeSlice,
  resolveBegin,
  resolveEnd,
} from './TrieUtils';
import {
  asImmutable,
  asMutable,
  deleteIn,
  mergeDeepIn,
  mergeIn,
  setIn,
  update,
  updateIn,
  wasAltered,
  withMutations,
} from './methods';
import { IS_LIST_SYMBOL, isList } from './predicates';
import { assertNotInfinite } from './utils/assertions';

export const List = (value) => {
  const empty = emptyList();
  if (value === undefined || value === null) {
    return empty;
  }
  if (isList(value)) {
    return value;
  }
  const iter = IndexedCollection(value);
  const size = iter.size;
  if (size === 0) {
    return empty;
  }
  assertNotInfinite(size);
  if (size > 0 && size < SIZE) {
    return makeList(0, size, SHIFT, null, new VNode(iter.toArray()));
  }
  return empty.withMutations((list) => {
    list.setSize(size);
    iter.forEach((v, i) => list.set(i, v));
  });
};

List.of = (...values) => List(values);

export class ListImpl extends IndexedCollectionImpl {
  static {
    this.prototype[IS_LIST_SYMBOL] = true;
    this.prototype[DELETE] = this.prototype.remove;
    this.prototype.merge = this.prototype.concat;
    this.prototype.removeIn = this.prototype.deleteIn;
    this.prototype[Symbol.toStringTag] = 'Immutable.List';
  }

  constructor(origin, capacity, level, root, tail, ownerID, hash) {
    super();
    this.size = capacity - origin;
    this._origin = origin;
    this._capacity = capacity;
    this._level = level;
    this._root = root;
    this._tail = tail;
    this.__ownerID = ownerID;
    this.__hash = hash;
    this.__altered = false;
  }

  create(value) {
    return List(value);
  }

  toString() {
    return this.__toString('List [', ']');
  }

  get(index, notSetValue) {
    index = wrapIndex(this, index);
    if (index >= 0 && index < this.size) {
      index += this._origin;
      const node = listNodeFor(this, index);
      return node && node.array[index & MASK];
    }
    return notSetValue;
  }

  set(index, value) {
    return updateList(this, index, value);
  }

  remove(index) {
    return !this.has(index)
      ? this
      : index === 0
        ? this.shift()
        : index === this.size - 1
          ? this.pop()
          : this.splice(index, 1);
  }

  insert(index, value) {
    return this.splice(index, 0, value);
  }

  clear() {
    if (this.size === 0) {
      return this;
    }
    if (this.__ownerID) {
      this.size = this._origin = this._capacity = 0;
      this._level = SHIFT;
      this._root = this._tail = this.__hash = undefined;
      this.__altered = true;
      return this;
    }
    return emptyList();
  }

  push(...values) {
    const oldSize = this.size;
    return this.withMutations((list) => {
      setListBounds(list, 0, oldSize + values.length);
      for (let ii = 0; ii < values.length; ii++) {
        list.set(oldSize + ii, values[ii]);
      }
    });
  }

  pop() {
    return setListBounds(this, 0, -1);
  }

  unshift(...values) {
    return this.withMutations((list) => {
      setListBounds(list, -values.length);
      for (let ii = 0; ii < values.length; ii++) {
        list.set(ii, values[ii]);
      }
    });
  }

  shift() {
    return setListBounds(this, 1);
  }

  shuffle(random = Math.random) {
    return this.withMutations((mutable) => {
      // implementation of the Fisher-Yates shuffle: https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
      let current = mutable.size;
      let destination;
      let tmp;

      while (current) {
        destination = Math.floor(random() * current--);

        tmp = mutable.get(destination);
        mutable.set(destination, mutable.get(current));
        mutable.set(current, tmp);
      }
    });
  }

  concat(...collections) {
    const seqs = [];
    for (const collection of collections) {
      const seq = IndexedCollection(
        typeof collection !== 'string' && hasIterator(collection)
          ? collection
          : [collection]
      );
      if (seq.size !== 0) {
        seqs.push(seq);
      }
    }
    if (seqs.length === 0) {
      return this;
    }
    if (this.size === 0 && !this.__ownerID && seqs.length === 1) {
      return List(seqs[0]);
    }
    return this.withMutations((list) => {
      seqs.forEach((seq) => seq.forEach((value) => list.push(value)));
    });
  }

  setSize(size) {
    return setListBounds(this, 0, size);
  }

  map(mapper, context) {
    return this.withMutations((list) => {
      for (let i = 0; i < this.size; i++) {
        list.set(i, mapper.call(context, list.get(i), i, this));
      }
    });
  }

  slice(begin, end) {
    const size = this.size;
    if (wholeSlice(begin, end, size)) {
      return this;
    }
    return setListBounds(
      this,
      resolveBegin(begin, size),
      resolveEnd(end, size)
    );
  }

  __iterator(reverse) {
    let index = reverse ? this.size : 0;
    const iter = iterateList(this, reverse);
    function* gen() {
      for (const value of iter) {
        yield [reverse ? --index : index++, value];
      }
    }
    return gen();
  }

  __iterate(fn, reverse) {
    let index = reverse ? this.size : 0;
    for (const value of iterateList(this, reverse)) {
      if (fn(value, reverse ? --index : index++, this) === false) {
        break;
      }
    }
    return index;
  }

  // methods.js wrappers
  setIn(keyPath, v) {
    return setIn.call(this, keyPath, v);
  }
  deleteIn(keyPath) {
    return deleteIn.call(this, keyPath);
  }
  update(key, notSetValue, updater) {
    return update.call(this, key, notSetValue, updater);
  }
  updateIn(keyPath, notSetValue, updater) {
    return updateIn.call(this, keyPath, notSetValue, updater);
  }
  mergeIn(keyPath, ...iters) {
    return mergeIn.call(this, keyPath, ...iters);
  }
  mergeDeepIn(keyPath, ...iters) {
    return mergeDeepIn.call(this, keyPath, ...iters);
  }
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

  __ensureOwner(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    if (!ownerID) {
      if (this.size === 0) {
        return emptyList();
      }
      this.__ownerID = ownerID;
      this.__altered = false;
      return this;
    }
    return makeList(
      this._origin,
      this._capacity,
      this._level,
      this._root,
      this._tail,
      ownerID,
      this.__hash
    );
  }
}

List.isList = isList;

class VNode {
  constructor(array, ownerID) {
    this.array = array;
    this.ownerID = ownerID;
  }

  removeBefore(ownerID, level, index) {
    if (
      (index & ((1 << (level + SHIFT)) - 1)) === 0 ||
      this.array.length === 0
    ) {
      return this;
    }
    const originIndex = (index >>> level) & MASK;
    if (originIndex >= this.array.length) {
      return new VNode([], ownerID);
    }
    const removingFirst = originIndex === 0;
    let newChild;
    if (level > 0) {
      const oldChild = this.array[originIndex];
      newChild = oldChild?.removeBefore(ownerID, level - SHIFT, index);
      if (newChild === oldChild && removingFirst) {
        return this;
      }
    }
    if (removingFirst && !newChild) {
      return this;
    }
    const editable = editableVNode(this, ownerID);
    if (!removingFirst) {
      for (let ii = 0; ii < originIndex; ii++) {
        editable.array[ii] = undefined;
      }
    }
    if (newChild) {
      editable.array[originIndex] = newChild;
    }
    return editable;
  }

  removeAfter(ownerID, level, index) {
    if (
      index === (level ? 1 << (level + SHIFT) : SIZE) ||
      this.array.length === 0
    ) {
      return this;
    }
    const sizeIndex = ((index - 1) >>> level) & MASK;
    if (sizeIndex >= this.array.length) {
      return this;
    }

    let newChild;
    if (level > 0) {
      const oldChild = this.array[sizeIndex];
      newChild = oldChild?.removeAfter(ownerID, level - SHIFT, index);
      if (newChild === oldChild && sizeIndex === this.array.length - 1) {
        return this;
      }
    }

    const editable = editableVNode(this, ownerID);
    editable.array.splice(sizeIndex + 1);
    if (newChild) {
      editable.array[sizeIndex] = newChild;
    }
    return editable;
  }
}

function* iterateList(list, reverse) {
  const left = list._origin;
  const right = list._capacity;
  const tailPos = getTailOffset(right);
  const tail = list._tail;

  yield* iterateNodeOrLeaf(list._root, list._level, 0);

  function* iterateNodeOrLeaf(node, level, offset) {
    if (level === 0) {
      yield* iterateLeaf(node, offset);
    } else {
      yield* iterateNode(node, level, offset);
    }
  }

  function* iterateLeaf(node, offset) {
    const array = offset === tailPos ? tail?.array : node?.array;
    let from = offset > left ? 0 : left - offset;
    let to = right - offset;
    if (to > SIZE) {
      to = SIZE;
    }
    while (from !== to) {
      const idx = reverse ? --to : from++;
      yield array?.[idx];
    }
  }

  function* iterateNode(node, level, offset) {
    const array = node?.array;
    let from = offset > left ? 0 : (left - offset) >> level;
    let to = ((right - offset) >> level) + 1;
    if (to > SIZE) {
      to = SIZE;
    }
    while (from !== to) {
      const idx = reverse ? --to : from++;
      yield* iterateNodeOrLeaf(
        array?.[idx],
        level - SHIFT,
        offset + (idx << level)
      );
    }
  }
}

const makeList = (origin, capacity, level, root, tail, ownerID, hash) =>
  new ListImpl(origin, capacity, level, root, tail, ownerID, hash);

export const emptyList = () => makeList(0, 0, SHIFT);

function updateList(list, index, value) {
  index = wrapIndex(list, index);

  if (Number.isNaN(index)) {
    return list;
  }

  if (index >= list.size || index < 0) {
    return list.withMutations((list) => {
      if (index < 0) {
        setListBounds(list, index).set(0, value);
      } else {
        setListBounds(list, 0, index + 1).set(index, value);
      }
    });
  }

  index += list._origin;

  let newTail = list._tail;
  let newRoot = list._root;
  const didAlter = MakeRef();
  if (index >= getTailOffset(list._capacity)) {
    newTail = updateVNode(newTail, list.__ownerID, 0, index, value, didAlter);
  } else {
    newRoot = updateVNode(
      newRoot,
      list.__ownerID,
      list._level,
      index,
      value,
      didAlter
    );
  }

  if (!didAlter.value) {
    return list;
  }

  if (list.__ownerID) {
    list._root = newRoot;
    list._tail = newTail;
    list.__hash = undefined;
    list.__altered = true;
    return list;
  }
  return makeList(list._origin, list._capacity, list._level, newRoot, newTail);
}

function updateVNode(node, ownerID, level, index, value, didAlter) {
  const idx = (index >>> level) & MASK;
  const nodeHas = node && idx < node.array.length;
  if (!nodeHas && value === undefined) {
    return node;
  }

  let newNode;

  if (level > 0) {
    const lowerNode = node && node.array[idx];
    const newLowerNode = updateVNode(
      lowerNode,
      ownerID,
      level - SHIFT,
      index,
      value,
      didAlter
    );
    if (newLowerNode === lowerNode) {
      return node;
    }
    newNode = editableVNode(node, ownerID);
    newNode.array[idx] = newLowerNode;
    return newNode;
  }

  if (nodeHas && node.array[idx] === value) {
    return node;
  }

  if (didAlter) {
    SetRef(didAlter);
  }

  newNode = editableVNode(node, ownerID);
  if (value === undefined && idx === newNode.array.length - 1) {
    newNode.array.pop();
  } else {
    newNode.array[idx] = value;
  }
  return newNode;
}

function editableVNode(node, ownerID) {
  if (ownerID && ownerID === node?.ownerID) {
    return node;
  }
  return new VNode(node?.array.slice() ?? [], ownerID);
}

function listNodeFor(list, rawIndex) {
  if (rawIndex >= getTailOffset(list._capacity)) {
    return list._tail;
  }
  if (rawIndex < 1 << (list._level + SHIFT)) {
    let node = list._root;
    let level = list._level;
    while (node && level > 0) {
      node = node.array[(rawIndex >>> level) & MASK];
      level -= SHIFT;
    }
    return node;
  }
}

function setListBounds(list, begin, end) {
  // Sanitize begin & end using this shorthand for ToInt32(argument)
  // http://www.ecma-international.org/ecma-262/6.0/#sec-toint32
  if (begin !== undefined) {
    begin |= 0;
  }
  if (end !== undefined) {
    end |= 0;
  }
  const owner = list.__ownerID || new OwnerID();
  let oldOrigin = list._origin;
  let oldCapacity = list._capacity;
  let newOrigin = oldOrigin + begin;
  let newCapacity =
    end === undefined
      ? oldCapacity
      : end < 0
        ? oldCapacity + end
        : oldOrigin + end;
  if (newOrigin === oldOrigin && newCapacity === oldCapacity) {
    return list;
  }

  // If it's going to end after it starts, it's empty.
  if (newOrigin >= newCapacity) {
    return list.clear();
  }

  let newLevel = list._level;
  let newRoot = list._root;

  // New origin might need creating a higher root.
  let offsetShift = 0;
  while (newOrigin + offsetShift < 0) {
    newRoot = new VNode(
      newRoot?.array.length ? [undefined, newRoot] : [],
      owner
    );
    newLevel += SHIFT;
    offsetShift += 1 << newLevel;
  }
  if (offsetShift) {
    newOrigin += offsetShift;
    oldOrigin += offsetShift;
    newCapacity += offsetShift;
    oldCapacity += offsetShift;
  }

  const oldTailOffset = getTailOffset(oldCapacity);
  const newTailOffset = getTailOffset(newCapacity);

  // New size might need creating a higher root.
  while (newTailOffset >= 1 << (newLevel + SHIFT)) {
    newRoot = new VNode(newRoot?.array.length ? [newRoot] : [], owner);
    newLevel += SHIFT;
  }

  // Locate or create the new tail.
  const oldTail = list._tail;
  let newTail =
    newTailOffset < oldTailOffset
      ? listNodeFor(list, newCapacity - 1)
      : newTailOffset > oldTailOffset
        ? new VNode([], owner)
        : oldTail;

  // Merge Tail into tree.
  if (
    oldTail &&
    newTailOffset > oldTailOffset &&
    newOrigin < oldCapacity &&
    oldTail.array.length
  ) {
    newRoot = editableVNode(newRoot, owner);
    let node = newRoot;
    for (let level = newLevel; level > SHIFT; level -= SHIFT) {
      const idx = (oldTailOffset >>> level) & MASK;
      node = node.array[idx] = editableVNode(node.array[idx], owner);
    }
    node.array[(oldTailOffset >>> SHIFT) & MASK] = oldTail;
  }

  // If the size has been reduced, there's a chance the tail needs to be trimmed.
  if (newCapacity < oldCapacity) {
    newTail = newTail && newTail.removeAfter(owner, 0, newCapacity);
  }

  // If the new origin is within the tail, then we do not need a root.
  if (newOrigin >= newTailOffset) {
    newOrigin -= newTailOffset;
    newCapacity -= newTailOffset;
    newLevel = SHIFT;
    newRoot = null;
    newTail = newTail && newTail.removeBefore(owner, 0, newOrigin);

    // Otherwise, if the root has been trimmed, garbage collect.
  } else if (newOrigin > oldOrigin || newTailOffset < oldTailOffset) {
    offsetShift = 0;

    // Identify the new top root node of the subtree of the old root.
    while (newRoot) {
      const beginIndex = (newOrigin >>> newLevel) & MASK;
      if ((beginIndex !== newTailOffset >>> newLevel) & MASK) {
        break;
      }
      if (beginIndex) {
        offsetShift += (1 << newLevel) * beginIndex;
      }
      newLevel -= SHIFT;
      newRoot = newRoot.array[beginIndex];
    }

    // Trim the new sides of the new root.
    if (newRoot && newOrigin > oldOrigin) {
      newRoot = newRoot.removeBefore(owner, newLevel, newOrigin - offsetShift);
    }
    if (newRoot && newTailOffset < oldTailOffset) {
      newRoot = newRoot.removeAfter(
        owner,
        newLevel,
        newTailOffset - offsetShift
      );
    }
    if (offsetShift) {
      newOrigin -= offsetShift;
      newCapacity -= offsetShift;
    }
  }

  if (list.__ownerID) {
    list.size = newCapacity - newOrigin;
    list._origin = newOrigin;
    list._capacity = newCapacity;
    list._level = newLevel;
    list._root = newRoot;
    list._tail = newTail;
    list.__hash = undefined;
    list.__altered = true;
    return list;
  }
  return makeList(newOrigin, newCapacity, newLevel, newRoot, newTail);
}

const getTailOffset = (size) =>
  size < SIZE ? 0 : ((size - 1) >>> SHIFT) << SHIFT;
