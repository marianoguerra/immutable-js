import { hasIterator } from './Iterator';
import { Seq } from './Seq';
import { isImmutable, isIndexed, isKeyed } from './predicates';
import { isArrayLike, isPlainObject as isPlainObj } from './utils/typeChecks';

type Converter = (
  this: unknown,
  key: string | number,
  // The sequence type is the untyped Seq.js return value.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sequence: any,
  keyPath?: Array<string | number>
) => unknown;

export const fromJS = (value: unknown, converter?: Converter): unknown =>
  fromJSWith(
    [],
    converter ?? defaultConverter,
    value,
    '',
    // Only track the key path when the converter cares about it (a
    // 3+-parameter converter), as it costs an array per level otherwise.
    converter && converter.length > 2 ? [] : undefined,
    { '': value }
  );

function fromJSWith(
  stack: Array<unknown>,
  converter: Converter,
  value: unknown,
  key: string | number,
  keyPath: Array<string | number> | undefined,
  parentValue: unknown
): unknown {
  if (
    typeof value !== 'string' &&
    !isImmutable(value) &&
    (isArrayLike(value) || hasIterator(value) || isPlainObj(value))
  ) {
    if (stack.includes(value)) {
      throw new TypeError('Cannot convert circular structure to Immutable');
    }
    stack.push(value);
    if (keyPath && key !== '') {
      keyPath.push(key);
    }
    const converted = converter.call(
      parentValue,
      key,
      Seq(value).map((v: unknown, k: unknown) =>
        fromJSWith(stack, converter, v, k as string | number, keyPath, value)
      ),
      keyPath?.slice()
    );
    stack.pop();
    if (keyPath) {
      keyPath.pop();
    }
    return converted;
  }
  return value;
}

// Effectively the opposite of "Collection.toSeq()"
const defaultConverter: Converter = (k, v) =>
  isIndexed(v) ? v.toList() : isKeyed(v) ? v.toMap() : v.toSet();
