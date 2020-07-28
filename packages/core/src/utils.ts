

export function assignDefaults<T, U>(config: T, defaults: U) {
  return { ...defaults, ...config };
}