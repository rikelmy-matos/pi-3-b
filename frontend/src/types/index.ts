// Shared TypeScript types matching the Django API models

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  bio: string;
  avatar: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface ProjectMember {
  id: number;
  user: User;
  role: MemberRole;
  joined_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: User;
  members: ProjectMember[];
  start_date: string | null;
  due_date: string | null;
  task_count: number;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Comment {
  id: string;
  author: User;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: User | null;
  created_by: User;
  due_date: string | null;
  position: number;
  comments: Comment[];
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}
