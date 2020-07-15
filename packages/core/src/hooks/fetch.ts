import { useQuery } from "react-query";

/**
 * Fetches JSON from a url. The result is available immediately in your component, thanks
 * to React Suspense. Passing a new url fetches new content.
 * @param url the url or array of urls to request JSON from
 * @param refetchIntervalMs if set, refetches this often in milliseconds
 * @param options the same options passed to fetch, see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 */
export function useFetchJson(
  url: string | string[],
  refetchIntervalMs?: number,
  options?: Parameters<typeof fetch>[1]
): AnyJson {
  return useQuery(
    [typeof url === "string" ? url : url.join(" "), options],
    () => fetch_(url, options, "json"),
    {
      suspense: true,
      refetchInterval: refetchIntervalMs || false,
    }
  ).data!;
}

/**
 * Fetches plain text from a url. The result is available immediately in your component, thanks
 * to React Suspense. Passing a new url fetches new content.
 * @param url the url or array of urls to request text from
 * @param refetchIntervalMs if set, refetches this often in milliseconds
 * @param options the same options passed to fetch, see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 */
export function useFetchText(
  url: string | string[],
  refetchIntervalMs?: number,
  options?: Parameters<typeof fetch>[1]
) {
  return useQuery(
    [typeof url === "string" ? url : url.join(" "), options],
    () => fetch_(url, options, "text"),
    {
      suspense: true,
      refetchInterval: refetchIntervalMs || false,
    }
  ).data as string | string[];
}

export { useQuery }; // might as well make it available

function fetch_(
  url: string | string[],
  options: Parameters<typeof fetch>[1],
  method: "json" | "text"
): Promise<AnyJson> {
  return Array.isArray(url) ? fetchMany(url, options, method) : fetchOne(url, options, method);
}

function fetchMany(urls: string[], options: Parameters<typeof fetch>[1], method: "json" | "text") {
  const promises = urls.map(u => fetchOne(u, options, method));
  const all = Promise.all(promises);
  (all as any).cancel = () => promises.forEach(p => (p as any).cancel());
  return all;
}

function fetchOne(url: string, options: Parameters<typeof fetch>[1], method: "json" | "text") {
  // Create a new AbortController signal and abort() for this request
  const { signal, abort } = new AbortController();
  const promise: Promise<AnyJson> = fetch(new URL(url).toString(), {
    // Pass the signal to your request
    signal,
    ...options,
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`fetch to ${res.url} failed with ${res.status} ${res.statusText}`);
    }
    return res;
  }).then((res) => res[method]());
  // Cancel the request if React Query calls the `promise.cancel` method
  (promise as any).cancel = abort;
  return promise;
}

export type AnyJson =  boolean | number | string | null | JsonArray | JsonMap;
interface JsonMap {  [key: string]: AnyJson; }
interface JsonArray extends Array<AnyJson> {}
