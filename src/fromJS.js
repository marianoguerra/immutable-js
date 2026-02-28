import { hasIterator } from './Iterator';
import { Seq } from './Seq';
import { isImmutable, isIndexed, isKeyed } from './predicates';
import { isArrayLike, isPlainObject as isPlainObj } from './utils/typeChecks';

export const fromJS = (value, converter) =>
  fromJSWith(
    [],
    converter ?? defaultConverter,
    value,
    '',
    converter?.length > 2 ? [] : undefined,
    { '': value }
  );

function fromJSWith(stack, converter, value, key, keyPath, parentValue) {
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
      Seq(value).map((v, k) =>
        fromJSWith(stack, converter, v, k, keyPath, value)
      ),
      keyPath && keyPath.slice()
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
const defaultConverter = (k, v) =>
  isIndexed(v) ? v.toList() : isKeyed(v) ? v.toMap() : v.toSet();
