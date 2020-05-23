import { useEffect, useRef } from 'react';
import { useQuery } from "react-query";

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
export function usePreciseInterval(callback: () => any, delayMs: number | null) {
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
  }, [delayMs])
}

/**
 * Fetches JSON from a url. The result is available synchronously in your component, thanks
 * to React Suspense. Passing a new url fetches new content.
 * @param url the url to request JSON from
 * @param refetchIntervalMs if set, refetches this often in milliseconds
 * @param options the same options passed to fetch, see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 */
export function useFetchJson(url: string, refetchIntervalMs?: number, options?: Parameters<typeof fetch>[1]) {
  useQuery(url, () => {
    return fetch_(url, options, "text");
  }, {
    suspense: true,
    refetchInterval: refetchIntervalMs || false,
  });
}

/**
 * Fetches text from a url. The result is available synchronously in your component, thanks
 * to React Suspense. Passing a new url fetches new content.
 * @param url the url to request text from
 * @param refetchIntervalMs if set, refetches this often in milliseconds
 * @param options the same options passed to fetch, see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 */
export function useFetchText(url: string, refetchIntervalMs?: number, options?: Parameters<typeof fetch>[1]) {
  useQuery(url, () => {
    return fetch_(url, options, "text");
  }, {
    suspense: true,
    refetchInterval: refetchIntervalMs || false,
  });
}

function fetch_(url: string, options: Parameters<typeof fetch>[1], method: "json" | "text") {
  // Create a new AbortController signal and abort() for this request
  const { signal, abort } = new AbortController();
  const promise = fetch(new URL(url).toString(), {
    // Pass the signal to your request
    signal,
    ...options,
  }).then(res => res[method]());
  // Cancel the request if React Query calls the `promise.cancel` method
  (promise as any).cancel = abort;
  return promise;
}

// setInterval(), but uses dates so that the interval doesn't drift over time
function setPreciseInterval(callback: () => any, delayMs: number) {
  let target = Date.now() + delayMs;
  let id: ReturnType<typeof setTimeout>;

  function advance() {
    callback();
    target = target + delayMs;
    id = setTimeout(advance, target - Date.now())
  }
  id = setTimeout(advance, delayMs);
  return () => clearTimeout(id);
}

