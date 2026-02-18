import { emptyMap } from '../Map';
import { mergeWithSources, mergeDeepWithSources } from '../functional/merge';
import { updateIn } from '../functional/updateIn';

function mergeInWith(mergeFn) {
  return function (keyPath, ...iters) {
    return updateIn(this, keyPath, emptyMap(), (m) => mergeFn(m, iters));
  };
}

export const mergeIn = mergeInWith(mergeWithSources);
export const mergeDeepIn = mergeInWith(mergeDeepWithSources);
