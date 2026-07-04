import { useCallback } from "react";
import { BACKEND_URL } from "../config/constants";

export function useApi() {
  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const url = `${BACKEND_URL}${path}`;
      const defaultHeaders = {
        "Content-Type": "application/json",
      };

      const config = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      };

      try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! Status: ${response.status}`);
        }
        
        return data;
      } catch (error: any) {
        console.error(`API Call failed [${path}]:`, error);
        throw error;
      }
    },
    []
  );

  // Helper REST actions
  const get = useCallback(
    (path: string, options: RequestInit = {}) => {
      return request(path, { ...options, method: "GET" });
    },
    [request]
  );

  const post = useCallback(
    (path: string, body?: any, options: RequestInit = {}) => {
      return request(path, {
        ...options,
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
    },
    [request]
  );

  return { get, post };
}
