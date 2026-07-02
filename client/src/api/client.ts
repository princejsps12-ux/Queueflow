import axios from "axios";

export const AUTH_TOKEN_KEY = "queueflow_token";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const MANAGER_STORAGE_KEY = "queueflow_manager";

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.startsWith("/auth") &&
      localStorage.getItem(AUTH_TOKEN_KEY)
    ) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(MANAGER_STORAGE_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error;
    if (typeof message === "string") return message;
    if (!error.response) return "Cannot reach the server. Please try again.";
  }
  return fallback;
}
