import { useQuery } from "react-query";

/**
 * Fetches JSON from a url. The result is available immediately in your component; no
 * need to `await`. Passing a new url fetches new content.
 * @param urls the URL or array of URLs to fetch JSON from.
 * @param refetchIntervalMs if set, refetches this often in milliseconds
 */
export function useFetchJson(url: string, refetchIntervalMs?: number): AnyJson;
export function useFetchJson(
  urls: string[],
  refetchIntervalMs?: number
): JsonArray;
export function useFetchJson(
  urls: string | string[],
  refetchIntervalMs?: number
): AnyJson {
  const { data } = useQuery(
    JSON.stringify(urls),
    () => fetchMany(urls, "json"),
    {
      suspense: true,
      refetchInterval: refetchIntervalMs || false,
    }
  );
  return Array.isArray(urls) ? data! : data![0]!;
}

/**
 * Fetches plain text from a url. The result is available immediately in your component; no
 * need to `await`. Passing a new url fetches new content.
 * @param urls the URL or array of URLs to fetch text content from.
 * @param refetchIntervalMs if set, refetches this often in milliseconds
 */
export function useFetchText(url: string, refetchIntervalMs?: number): string;
export function useFetchText(
  urls: string[],
  refetchIntervalMs?: number
): string[];
export function useFetchText(
  urls: string | string[],
  refetchIntervalMs?: number
): string | string[] {
  const { data } = useQuery(
    JSON.stringify(urls),
    () => fetchMany(urls, "text"),
    {
      suspense: true,
      refetchInterval: refetchIntervalMs || false,
    }
  )! as { data: string | string[] };
  return Array.isArray(urls) ? data : data[0]!;
}

// make useQuery available, but developers can just install react-query
export { useQuery };

function fetchMany(
  url: string | string[],
  method: "json" | "text"
): Promise<JsonArray> {
  const urls: string[] = Array.isArray(url) ? url : [url];
  const promises = urls.map((u) => fetchOne(u, method));
  const all = Promise.all(promises);
  (all as any).cancel = () => promises.forEach((p) => (p as any).cancel());
  return all;
}

function fetchOne(url: string, method: "json" | "text") {
  let options: {
    headers?: Record<string, string>;
    signal?: AbortController["signal"];
  } = {};
  if (method === "json") {
    options.headers = {
      Accept: "application/json",
    };
  }
  // Create a new AbortController signal and abort() for this request
  const { signal, abort } = new AbortController();
  options.signal = signal;

  const promise: Promise<AnyJson> = fetch(new URL(url).toString(), options)
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
