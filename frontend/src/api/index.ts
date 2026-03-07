import apiClient from './client';
import type {
  AuthTokens,
  LoginCredentials,
  RegisterData,
  User,
  Project,
  Task,
  Comment,
  PaginatedResponse,
  TaskStatus,
} from '../types';

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<AuthTokens>('/auth/token/', credentials).then((r) => r.data),

  register: (data: RegisterData) =>
    apiClient.post<User>('/auth/register/', data).then((r) => r.data),

  getProfile: () =>
    apiClient.get<User>('/auth/profile/').then((r) => r.data),

  updateProfile: (data: Partial<User>) =>
    apiClient.patch<User>('/auth/profile/', data).then((r) => r.data),

  listUsers: (search?: string) =>
    apiClient
      .get<PaginatedResponse<User>>('/auth/users/', { params: { search } })
      .then((r) => r.data.results),
};

// ── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<Project>>('/projects/', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Project>(`/projects/${id}/`).then((r) => r.data),

  create: (data: Partial<Project>) =>
    apiClient.post<Project>('/projects/', data).then((r) => r.data),

  update: (id: string, data: Partial<Project>) =>
    apiClient.patch<Project>(`/projects/${id}/`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/projects/${id}/`),

  addMember: (projectId: string, userId: number, role = 'member') =>
    apiClient
      .post(`/projects/${projectId}/members/`, { user_id: userId, role })
      .then((r) => r.data),

  removeMember: (projectId: string, userId: number) =>
    apiClient.delete(`/projects/${projectId}/members/${userId}/`),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<Task>>('/tasks/', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Task>(`/tasks/${id}/`).then((r) => r.data),

  create: (data: Partial<Task>) =>
    apiClient.post<Task>('/tasks/', data).then((r) => r.data),

  update: (id: string, data: Partial<Task>) =>
    apiClient.patch<Task>(`/tasks/${id}/`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/tasks/${id}/`),

  move: (id: string, status: TaskStatus, position: number) =>
    apiClient.patch<Task>(`/tasks/${id}/move/`, { status, position }).then((r) => r.data),

  getComments: (taskId: string) =>
    apiClient.get<Comment[]>(`/tasks/${taskId}/comments/`).then((r) => r.data),

  addComment: (taskId: string, body: string) =>
    apiClient.post<Comment>(`/tasks/${taskId}/comments/`, { body }).then((r) => r.data),
};
