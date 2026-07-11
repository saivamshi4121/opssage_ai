import axios, { AxiosRequestConfig } from "axios";

export type NormalizedApiError = {
  message: string;
  status?: number;
  detail?: unknown;
};

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"}/api`,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const requestId = Math.random().toString(36).slice(2);
  // Ensure header object exists for strict axios configs
  config.headers = config.headers ?? {};
  (config.headers as Record<string, string>)["X-Request-ID"] = requestId;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: any) => {
    const status: number | undefined = error?.response?.status;
    const message: string = error?.response?.data?.message ?? error?.message ?? "API request failed";
    const detail: unknown = error?.response?.data?.detail ?? error?.response?.data ?? undefined;

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("api_error", { status, message, detail });
    }

    const normalized: NormalizedApiError = { message, status, detail };
    return Promise.reject(normalized);
  },
);

export const api = {
  get: async <T>(path: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await apiClient.get<T>(path, config);
    return res.data;
  },
  post: async <T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const res = await apiClient.post<T>(path, body, config);
    return res.data;
  },
  put: async <T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const res = await apiClient.put<T>(path, body, config);
    return res.data;
  },
  delete: async <T = void>(path: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await apiClient.delete<T>(path, config);
    return res.data;
  },
};
