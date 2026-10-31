// src/hooks/useApi.ts
/**
 * Generic hook for performing API calls with fetch.
 * Returns a tuple [data, loading, error] and a function to trigger the request.
 */
import { useState, useCallback } from "react";

type FetchOptions = RequestInit & { queryParams?: Record<string, string> };

type UseApiReturn<T> = [T | null, boolean, Error | null, (overrideUrl?: string) => Promise<void>];

export function useApi<T = any>(url: string, options?: FetchOptions): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (overrideUrl?: string) => {
    setLoading(true);
    setError(null);
    try {
      let finalUrl = overrideUrl ?? url;
      if (options?.queryParams) {
        const params = new URLSearchParams(options.queryParams).toString();
        finalUrl += finalUrl.includes("?") ? "&" + params : "?" + params;
      }
      const response = await fetch(finalUrl, {
        method: options?.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers as any),
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${response.status} ${response.statusText}: ${errText}`);
      }
      const json = (await response.json()) as T;
      setData(json);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  return [data, loading, error, fetchData];
}
