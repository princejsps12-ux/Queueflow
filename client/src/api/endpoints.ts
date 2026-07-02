import { apiClient } from "./client";
import type {
  Manager,
  OverallAnalytics,
  QueueAnalytics,
  QueueDetail,
  QueueSummary,
  Token,
} from "./types";

export interface AuthResponse {
  token: string;
  manager: Manager;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data),
  register: (email: string, password: string, name: string) =>
    apiClient.post<AuthResponse>("/auth/register", { email, password, name }).then((r) => r.data),
};

export const queuesApi = {
  list: () => apiClient.get<QueueSummary[]>("/queues").then((r) => r.data),
  create: (name: string) => apiClient.post<QueueSummary>("/queues", { name }).then((r) => r.data),
  get: (id: string) => apiClient.get<QueueDetail>(`/queues/${id}`).then((r) => r.data),
  addToken: (queueId: string, personName: string | null) =>
    apiClient.post<Token>(`/queues/${queueId}/tokens`, { personName }).then((r) => r.data),
  serveNext: (queueId: string) =>
    apiClient.post<Token>(`/queues/${queueId}/serve-next`).then((r) => r.data),
  analytics: (queueId: string) =>
    apiClient.get<QueueAnalytics & { id: string; name: string }>(`/queues/${queueId}/analytics`).then((r) => r.data),
};

export const tokensApi = {
  move: (tokenId: string, direction: "up" | "down") =>
    apiClient.patch(`/tokens/${tokenId}/move`, { direction }).then((r) => r.data),
  cancel: (tokenId: string) =>
    apiClient.patch<Token>(`/tokens/${tokenId}/cancel`).then((r) => r.data),
};

export const analyticsApi = {
  overall: () => apiClient.get<OverallAnalytics>("/analytics").then((r) => r.data),
};
