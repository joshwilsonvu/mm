import { useQuery } from "react-query";

type UrlWithOptions = {
  url: string,
} & Parameters<typeof fetch>[1];

/**
 * Fetches JSON from a url. The result is available immediately in your component, thanks
 * to React Suspense. Passing a new url fetches new content.
 * @param url the array of { url: string, ...fetchOptions } to fetch JSON from.
 *            A single string is equivalent to [{ url: url }]. See fetch options here:
 *            https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 * @param refetchIntervalMs if set, refetches this often in milliseconds
 */
export function useFetchJson(
  url: string | UrlWithOptions[],
  refetchIntervalMs?: number
): AnyJson {
  const urls = typeof url === "string" ? [{ url }] : url;
  return useQuery(
    JSON.stringify(urls),
    () => fetchMany(urls, "json"),
    {
      suspense: true,
      refetchInterval: refetchIntervalMs || false,
    }
  ).data!;
}

/**
 * Fetches plain text from a url. The result is available immediately in your component, thanks
 * to React Suspense. Passing a new url fetches new content.
 * @param url the array of { url: string, ...fetchOptions } to fetch text from.
 *            A single string is equivalent to [{ url: url }]. See fetch options here:
 *            https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 * @param refetchIntervalMs if set, refetches this often in milliseconds
 */
export function useFetchText(
  url: string | UrlWithOptions[],
  refetchIntervalMs?: number,
) {
  const urls = typeof url === "string" ? [{ url }] : url;
  return useQuery(
    JSON.stringify(urls),
    () => fetchMany(urls, "text"),
    {
      suspense: true,
      refetchInterval: refetchIntervalMs || false,
    }
  ).data as string[];
}

export { useQuery }; // might as well make it available


function fetchMany(
  urls: UrlWithOptions[],
  method: "json" | "text"
): Promise<AnyJson[]> {
  const promises = urls.map((u) => fetchOne(u, method));
  const all = Promise.all(promises);
  (all as any).cancel = () => promises.forEach((p) => (p as any).cancel());
  return all;
}

function fetchOne(
  url: UrlWithOptions,
  method: "json" | "text"
) {
  // Create a new AbortController signal and abort() for this request
  const { signal, abort } = new AbortController();
  const { url: u, ...options } = url;
  const promise: Promise<AnyJson> = fetch(new URL(u).toString(), {
    signal,
    ...options,
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(
          `fetch to ${res.url} failed with ${res.status} ${res.statusText}`
        );
      }
      return res;
    })
    .then((res) => res[method]());
  // Cancel the request if React Query calls the `promise.cancel` method
  (promise as any).cancel = abort;
  return promise;
}

export type AnyJson = boolean | number | string | null | JsonArray | JsonMap;
interface JsonMap {
  [key: string]: AnyJson;
}
interface JsonArray extends Array<AnyJson> {}
