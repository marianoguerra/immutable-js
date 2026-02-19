type Constructor<T = object> = new (...args: unknown[]) => T;

/**
 * Contributes additional methods to a constructor
 */
export default function mixin<C extends Constructor>(
  ctor: C,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  methods: Record<string, Function>
): C {
  for (const key of Reflect.ownKeys(methods)) {
    // @ts-expect-error how to handle symbol ?
    ctor.prototype[key] = methods[key];
  }
  return ctor;
}
