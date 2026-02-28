import { makeEntryIterator } from './Iterator';
import { IndexedSeqImpl } from './Seq';
import { wholeSlice, resolveBegin, resolveEnd } from './TrieUtils';
import { is } from './is';
import deepEqual from './utils/deepEqual';

/**
 * Returns a lazy Seq of `value` repeated `times` times. When `times` is
 * undefined, returns an infinite sequence of `value`.
 */
export const Repeat = (value, times) => {
  const size = times === undefined ? Infinity : Math.max(0, times);
  return new RepeatImpl(value, size);
};

export class RepeatImpl extends IndexedSeqImpl {
  constructor(value, size) {
    super();

    this._value = value;
    this.size = size;
  }

  toString() {
    if (this.size === 0) {
      return 'Repeat []';
    }
    return `Repeat [ ${this._value} ${this.size} times ]`;
  }

  get(index, notSetValue) {
    return this.has(index) ? this._value : notSetValue;
  }

  includes(searchValue) {
    return is(this._value, searchValue);
  }

  slice(begin, end) {
    const size = this.size;
    return wholeSlice(begin, end, size)
      ? this
      : new RepeatImpl(
          this._value,
          resolveEnd(end, size) - resolveBegin(begin, size)
        );
  }

  reverse() {
    return this;
  }

  indexOf(searchValue) {
    if (is(this._value, searchValue)) {
      return 0;
    }
    return -1;
  }

  lastIndexOf(searchValue) {
    if (is(this._value, searchValue)) {
      return this.size;
    }
    return -1;
  }

  __iterateUncached(fn, reverse) {
    const size = this.size;
    let i = 0;
    while (i !== size) {
      if (fn(this._value, reverse ? size - ++i : i++, this) === false) {
        break;
      }
    }
    return i;
  }

  __iteratorUncached(reverse) {
    const size = this.size;
    const val = this._value;
    let i = 0;
    return makeEntryIterator((entry) => {
      if (i === size) {
        return false;
      }
      entry[0] = reverse ? size - ++i : i++;
      entry[1] = val;
      return true;
    });
  }

  equals(other) {
    return other instanceof RepeatImpl
      ? this.size === other.size && is(this._value, other._value)
      : deepEqual(this, other);
  }
}
