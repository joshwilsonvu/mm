import React, { useMemo, useRef } from "react";
import memoize from "fast-memoize";

/**
 * useMemo(), but for an array. Pass in an array and a (computationally expensive) mapping function, and
 * it will be memoized so that value equality across renders is preserved, just like useMemo().
 *
 * @param array the array to map over. Mutations won't trigger a rerender, so make sure to provide a new reference
 * @param mapFunc the mapping function. Like useMemo(), if it captures variables they should be in deps
 * @param deps an array of captured values in mapFunc, not including the array, or an empty array for a pure function
 */
export function useMemoArray<T, U>(
  array: T[],
  mapFunc: (value: T) => U,
  deps: React.DependencyList
): U[] {
  const ref = useRef<typeof mapFunc>(mapFunc);
  ref.current = mapFunc; // keep ref always up-to-date
  const func = useMemo(() => {
    function wrapper(value: T) {
      return ref.current(value);
    }
    return memoize(wrapper);
  }, deps); // eslint-disable-line
  return useMemo(() => array.map(func), [array, func]); // because func is memoized, this is much cheaper than raw .map()
}
