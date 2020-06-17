import { useEffect, useRef } from "react";

/**
 * setInterval, but as a React hook. Run a function periodically.
 * When a new callback or delay is passed in, the interval will automatically adjust to accomodate it.
 *
 * @param callback any function to execute periodically
 * @param delayMs how often in milliseconds to call callback
 */
export function useInterval(callback: () => any, delayMs: number | null) {
  const savedCallback = useRef<typeof callback>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current!();
    }
    if (delayMs) {
      let id = setInterval(tick, delayMs);
      return () => clearInterval(id);
    }
  }, [delayMs]);
}

/**
 * useInterval, but with time precision suitable for things like clocks.
 *
 * @param callback
 * @param delayMs
 */
export function usePreciseInterval(
  callback: () => any,
  delayMs: number | null
) {
  const savedCallback = useRef<typeof callback>();

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current!();
    }
    if (delayMs) {
      let clear = setPreciseInterval(tick, delayMs);
      return clear;
    }
  }, [delayMs]);
}

// setInterval(), but uses dates so that the interval doesn't drift over time
function setPreciseInterval(callback: () => any, delayMs: number) {
  let target = Date.now() + delayMs;
  let id: ReturnType<typeof setTimeout>;

  function advance() {
    callback();
    target = target + delayMs;
    id = setTimeout(advance, target - Date.now());
  }
  id = setTimeout(advance, delayMs);
  return () => clearTimeout(id);
}
