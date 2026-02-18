import { update as _update } from '../functional/update';

export function update(key, notSetValue, updater) {
  return typeof key === 'function'
    ? key(this)
    : _update(this, key, notSetValue, updater);
}
