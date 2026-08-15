"use client";
import { useEffect, useRef } from "react";

type SSEHandler = (data: unknown) => void;

export function useSSE(
  restaurantId: string | null,
  handlers:     Record<string, SSEHandler>,
  options?:     { sesionToken?: string }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const sesionToken = options?.sesionToken;

  useEffect(() => {
    if (!restaurantId) return;

    let es:           EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let retryCount = 0;

    function connect() {
      const url = new URL(`/api/sse/${restaurantId}`, window.location.origin);
      if (sesionToken) url.searchParams.set("sesionToken", sesionToken);

      es = new EventSource(url.toString(), { withCredentials: true });

      es.addEventListener("connected", () => {
        retryCount = 0;
      });

      Object.keys(handlersRef.current).forEach((event) => {
        es!.addEventListener(event, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            handlersRef.current[event]?.(data);
          } catch {
            console.error("[SSE] Error parseando evento", event);
          }
        });
      });

      es.onerror = () => {
        es?.close();
        es = null;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        retryCount++;
        retryTimeout = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  }, [restaurantId, sesionToken]);
}