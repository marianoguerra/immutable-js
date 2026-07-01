import type { Seq } from '../type-definitions/immutable';
import {
  DONE,
  makeEntryIterator,
  makeIndexKeys,
  makeIterator,
} from './Iterator';
import { IndexedSeqImpl } from './Seq';
import { wholeSlice, resolveBegin, resolveEnd } from './TrieUtils';
import { is } from './is';
import deepEqual from './utils/deepEqual';

/**
 * Returns a lazy Seq of `value` repeated `times` times. When `times` is
 * undefined, returns an infinite sequence of `value`.
 */
export const Repeat = <T>(value: T, times?: number): RepeatImpl<T> => {
  const size = times === undefined ? Infinity : Math.max(0, times);
  return new RepeatImpl(value, size);
};

export class RepeatImpl<T> extends IndexedSeqImpl implements Seq.Indexed<T> {
  private _value: T;

  constructor(value: T, size: number) {
    super();

    this._value = value;
    this.size = size;
  }

  override toString(): string {
    if (this.size === 0) {
      return 'Repeat []';
    }
    return `Repeat [ ${this._value} ${this.size} times ]`;
  }

  override get<NSV>(index: number, notSetValue: NSV): T | NSV;
  override get(index: number): T | undefined;
  override get<NSV>(index: number, notSetValue?: NSV): T | NSV | undefined {
    return this.has(index) ? this._value : notSetValue;
  }

  override includes(searchValue: T): boolean {
    return is(this._value, searchValue);
  }

  // @ts-expect-error: Repeat.slice returns RepeatImpl, not polymorphic this
  override slice(
    begin?: number | undefined,
    end?: number | undefined
  ): RepeatImpl<T> {
    const size = this.size;
    return wholeSlice(begin, end, size)
      ? this
      : new RepeatImpl(
          this._value,
          resolveEnd(end, size) - resolveBegin(begin, size)
        );
  }

  override reverse(): this {
    return this;
  }

  override indexOf(searchValue: T): number {
    if (is(this._value, searchValue)) {
      return 0;
    }
    return -1;
  }

  override lastIndexOf(searchValue: T): number {
    if (is(this._value, searchValue)) {
      return this.size;
    }
    return -1;
  }

  __iterateUncached(
    fn: (value: T, key: number, iter: this) => boolean | void,
    reverse: boolean = false
  ): number {
    const size = this.size;
    let i = 0;
    while (i !== size) {
      if (fn(this._value, reverse ? size - ++i : i++, this) === false) {
        break;
      }
    }
    return i;
  }

  __iteratorUncached(reverse: boolean = false): IterableIterator<[number, T]> {
    const size = this.size;
    const val = this._value;
    let i = 0;
    return makeEntryIterator<number, T>((entry) => {
      if (i === size) {
        return false;
      }
      entry[0] = reverse ? size - ++i : i++;
      entry[1] = val;
      return true;
    });
  }

  override values(): IterableIterator<T> {
    const size = this.size;
    const val = this._value;
    let i = 0;
    const result: IteratorResult<T> = {
      done: false,
      value: undefined as unknown as T,
    };
    return makeIterator(() => {
      if (i === size) return DONE as IteratorResult<T>;
      i++;
      result.value = val;
      return result;
    });
  }

  override keys(): IterableIterator<number> {
    return makeIndexKeys(this.size);
  }

  override equals(other: unknown): boolean {
    return other instanceof RepeatImpl
      ? this.size === other.size && is(this._value, other._value)
      : deepEqual(this, other);
  }

  static {
    this.prototype[Symbol.iterator] = this.prototype.values;
  }
}
