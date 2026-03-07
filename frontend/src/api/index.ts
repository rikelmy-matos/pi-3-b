import apiClient from './client';
import type {
  AuthTokens,
  LoginCredentials,
  RegisterData,
  User,
  Project,
  Task,
  Comment,
  KanbanColumn,
  TaskActivity,
  MemberOverview,
  PaginatedResponse,
  TaskStatus,
  ProjectBudget,
  ProjectTechStack,
  ProjectObjective,
  ProjectRisk,
  ProjectMilestone,
  MemberRole,
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

  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return apiClient
      .patch<User>('/auth/profile/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  removeAvatar: () =>
    apiClient.delete('/auth/avatar/'),

  changePassword: (currentPassword: string, newPassword: string, newPasswordConfirm: string) =>
    apiClient
      .post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      })
      .then((r) => r.data),

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

  updateMember: (
    projectId: string,
    userId: number,
    data: { specialty?: string; hourly_rate?: string | null; role?: MemberRole },
  ) =>
    apiClient
      .patch(`/projects/${projectId}/members/${userId}/update/`, data)
      .then((r) => r.data),

  // ── Budget ──────────────────────────────────────────────────────────────────
  getBudget: (projectId: string) =>
    apiClient.get<ProjectBudget>(`/projects/${projectId}/budget/`).then((r) => r.data),

  upsertBudget: (projectId: string, data: Partial<ProjectBudget>) =>
    apiClient.put<ProjectBudget>(`/projects/${projectId}/budget/`, data).then((r) => r.data),

  // ── Tech Stack ───────────────────────────────────────────────────────────────
  listTechStack: (projectId: string) =>
    apiClient
      .get<ProjectTechStack[]>(`/projects/${projectId}/tech-stack/`)
      .then((r) => r.data),

  addTech: (projectId: string, data: Partial<ProjectTechStack>) =>
    apiClient
      .post<ProjectTechStack>(`/projects/${projectId}/tech-stack/`, data)
      .then((r) => r.data),

  updateTech: (projectId: string, itemId: string, data: Partial<ProjectTechStack>) =>
    apiClient
      .patch<ProjectTechStack>(`/projects/${projectId}/tech-stack/${itemId}/`, data)
      .then((r) => r.data),

  removeTech: (projectId: string, itemId: string) =>
    apiClient.delete(`/projects/${projectId}/tech-stack/${itemId}/`),

  // ── Objectives ───────────────────────────────────────────────────────────────
  listObjectives: (projectId: string) =>
    apiClient
      .get<ProjectObjective[]>(`/projects/${projectId}/objectives/`)
      .then((r) => r.data),

  addObjective: (projectId: string, data: Partial<ProjectObjective>) =>
    apiClient
      .post<ProjectObjective>(`/projects/${projectId}/objectives/`, data)
      .then((r) => r.data),

  updateObjective: (projectId: string, itemId: string, data: Partial<ProjectObjective>) =>
    apiClient
      .patch<ProjectObjective>(`/projects/${projectId}/objectives/${itemId}/`, data)
      .then((r) => r.data),

  removeObjective: (projectId: string, itemId: string) =>
    apiClient.delete(`/projects/${projectId}/objectives/${itemId}/`),

  // ── Risks ────────────────────────────────────────────────────────────────────
  listRisks: (projectId: string) =>
    apiClient.get<ProjectRisk[]>(`/projects/${projectId}/risks/`).then((r) => r.data),

  addRisk: (projectId: string, data: Partial<ProjectRisk>) =>
    apiClient.post<ProjectRisk>(`/projects/${projectId}/risks/`, data).then((r) => r.data),

  updateRisk: (projectId: string, itemId: string, data: Partial<ProjectRisk>) =>
    apiClient
      .patch<ProjectRisk>(`/projects/${projectId}/risks/${itemId}/`, data)
      .then((r) => r.data),

  removeRisk: (projectId: string, itemId: string) =>
    apiClient.delete(`/projects/${projectId}/risks/${itemId}/`),

  // ── Milestones ───────────────────────────────────────────────────────────────
  listMilestones: (projectId: string) =>
    apiClient
      .get<ProjectMilestone[]>(`/projects/${projectId}/milestones/`)
      .then((r) => r.data),

  addMilestone: (projectId: string, data: Partial<ProjectMilestone>) =>
    apiClient
      .post<ProjectMilestone>(`/projects/${projectId}/milestones/`, data)
      .then((r) => r.data),

  updateMilestone: (projectId: string, itemId: string, data: Partial<ProjectMilestone>) =>
    apiClient
      .patch<ProjectMilestone>(`/projects/${projectId}/milestones/${itemId}/`, data)
      .then((r) => r.data),

  removeMilestone: (projectId: string, itemId: string) =>
    apiClient.delete(`/projects/${projectId}/milestones/${itemId}/`),
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

// ── Kanban Columns ────────────────────────────────────────────────────────────

export const columnsApi = {
  list: (projectId: string) =>
    apiClient
      .get<PaginatedResponse<KanbanColumn>>('/columns/', { params: { project: projectId } })
      .then((r) => r.data.results),

  create: (data: Partial<KanbanColumn>) =>
    apiClient.post<KanbanColumn>('/columns/', data).then((r) => r.data),

  update: (id: string, data: Partial<KanbanColumn>) =>
    apiClient.patch<KanbanColumn>(`/columns/${id}/`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/columns/${id}/`),
};

// ── Activity ──────────────────────────────────────────────────────────────────

export const activityApi = {
  forProject: (projectId: string) =>
    apiClient
      .get<TaskActivity[]>(`/projects/${projectId}/activity/`)
      .then((r) => r.data),
};

// ── Members overview ──────────────────────────────────────────────────────────

export const membersApi = {
  overview: (projectId: string) =>
    apiClient
      .get<MemberOverview[]>(`/projects/${projectId}/members-overview/`)
      .then((r) => r.data),
};
