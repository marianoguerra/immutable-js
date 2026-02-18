import arrCopy from './arrCopy';

export default function shallowCopy<I>(from: Array<I>): Array<I>;
export default function shallowCopy<O extends object>(from: O): O;
export default function shallowCopy<I, O extends object>(
  from: Array<I> | O
): Array<I> | O {
  if (Array.isArray(from)) {
    return arrCopy(from);
  }
  return Object.assign({}, from) as O;
}
