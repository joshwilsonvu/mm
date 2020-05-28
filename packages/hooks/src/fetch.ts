import { useQuery } from "react-query";

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



