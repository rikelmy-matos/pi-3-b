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
export type BudgetCurrency = 'BRL' | 'USD' | 'EUR';
export type TechCategory = 'backend' | 'frontend' | 'database' | 'infra' | 'mobile' | 'other';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskStatus = 'open' | 'mitigated' | 'closed';
export type MilestoneStatus = 'planned' | 'in_progress' | 'done';

export interface ProjectMember {
  id: number;
  user: User;
  role: MemberRole;
  specialty?: string;
  hourly_rate?: string | null;
  joined_at: string;
}

export interface ProjectBudget {
  id?: number;
  currency: BudgetCurrency;
  estimated_cost: string | null;
  actual_cost: string | null;
  notes: string;
}

export interface ProjectTechStack {
  id: string;
  name: string;
  version: string;
  category: TechCategory;
  notes: string;
}

export interface ProjectObjective {
  id: string;
  title: string;
  description: string;
  is_achieved: boolean;
  created_at: string;
}

export interface ProjectRisk {
  id: string;
  title: string;
  description: string;
  probability: RiskLevel;
  impact: RiskLevel;
  mitigation: string;
  status: RiskStatus;
  created_at: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  completion_pct: number;
  status: MilestoneStatus;
  created_at: string;
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
  budget?: ProjectBudget | null;
  tech_stack?: ProjectTechStack[];
  objectives?: ProjectObjective[];
  risks?: ProjectRisk[];
  milestones?: ProjectMilestone[];
  created_at: string;
  updated_at: string;
}

export type TaskStatus = string; // free-form: matches KanbanColumn.slug
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface KanbanColumn {
  id: string;
  project: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  created_at: string;
}

export type TaskActivityAction = 'moved' | 'assigned' | 'unassigned' | 'created';

export interface TaskActivity {
  id: string;
  task: string;
  task_title: string | null;
  actor: User | null;
  action: TaskActivityAction;
  from_value: string;
  to_value: string;
  created_at: string;
}

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
  project_name?: string | null;
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

// ── Members overview ──────────────────────────────────────────────────────────

export interface MemberTaskItem {
  id: string;
  title: string;
  priority: TaskPriority;
}

export interface MemberOverview {
  membership_id: number;
  user: User;
  role: MemberRole;
  joined_at: string;
  total_tasks: number;
  tasks_by_status: Record<string, MemberTaskItem[]>;
  status_counts: Record<string, number>;
  last_activity: string | null;
}
