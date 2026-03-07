# AGENTS.md — Task Manager (PROMINESS LTDA)

Coding agent reference for this repository. Read this before making changes.

---

## Project Overview

**Sistema Gerenciador de Tarefas Online** — A full-stack web application for PROMINESS LTDA,
a Brazilian software development company. Features project management, Kanban boards, and
calendar integration. Built as an academic extension project.

- **Backend**: Django 5 + Django REST Framework + JWT (Python 3.12)
- **Frontend**: React 18 + TypeScript + Vite + MUI v7
- **Database**: PostgreSQL
- **Repo structure**: `backend/` (Django) and `frontend/` (React/Vite)

---

## Backend — Commands

```bash
# All backend commands must be run from /backend with venv active
cd backend
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server (port 8000)
python manage.py runserver

# Create and apply migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run ALL tests
python manage.py test

# Run tests for a single app
python manage.py test users
python manage.py test projects
python manage.py test tasks

# Run a single test class or method
python manage.py test users.tests.UserModelTest
python manage.py test users.tests.UserModelTest.test_create_user

# System check (no DB required)
python manage.py check

# Interactive shell
python manage.py shell

# Generate OpenAPI schema
python manage.py spectacular --file schema.yml
```

---

## Frontend — Commands

```bash
# All frontend commands run from /frontend
cd frontend

# Install dependencies
npm install

# Run dev server (port 5173, proxies to backend at localhost:8000)
npm run dev

# Type-check + production build
npm run build

# Preview production build
npm run preview

# Type-check only (no emit)
npx tsc --noEmit
```

---

## Environment Setup

**Backend** — copy `.env.example` to `.env` and fill values:
```
SECRET_KEY=...
DEBUG=True
DB_NAME=taskmanager
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

**Frontend** — copy `.env.example` to `.env`:
```
VITE_API_URL=http://localhost:8000/api/v1
```

**PostgreSQL setup:**
```sql
CREATE DATABASE taskmanager;
```

---

## Backend Code Style

### Django conventions
- Custom user model lives in `users/models.py` as `users.User`; always use
  `settings.AUTH_USER_MODEL` in ForeignKeys, never import `User` directly
- App structure per Django app: `models.py`, `serializers.py`, `views.py`,
  `urls.py`, `admin.py`, `tests.py`
- Use UUIDs as primary keys on all public-facing models (Project, Task, Comment)
- Constants for choice fields are defined on the model class itself (e.g., `Task.STATUS_TODO`)

### DRF conventions
- Use `ModelViewSet` for CRUD resources; add custom actions with `@action`
- Separate serializers for list vs. detail views (lighter for lists)
- Permission classes go on the ViewSet; object-level permissions use
  `has_object_permission`
- Filter, search, and ordering backends enabled globally in `REST_FRAMEWORK` settings

### Python style
- Python 3.12; no `__future__` annotations needed
- Follow PEP 8: 4-space indent, max 99 chars per line
- Imports order: stdlib → third-party → Django → local (separated by blank lines)
- Type hints are encouraged but not required for model methods
- Avoid bare `except:`; always catch specific exceptions
- Prefer `get_object_or_404` in views over manual `.get()` + `Http404`

---

## Frontend Code Style

### TypeScript
- Strict TypeScript (`"strict": true` via Vite's default tsconfig)
- All shared types live in `src/types/index.ts`; import with `import type`
- Use `type` for object shapes, `interface` only when extending is needed
- Never use `any`; prefer `unknown` for caught errors

### React conventions
- Function components only; no class components
- State: local `useState` for UI state, `useQuery`/`useMutation` (TanStack Query)
  for server state
- Context: `AuthContext` in `src/context/AuthContext.tsx` for auth state
- API calls: always go through `src/api/index.ts`; never call `axios` directly

### MUI v7 (important)
- **Grid**: Use MUI v7 `Grid` with `size` prop — NOT `item`/`xs`/`sm`/`md` props
  (those belong to the legacy `GridLegacy`)
  ```tsx
  // Correct (MUI v7)
  <Grid container spacing={2}>
    <Grid size={{ xs: 12, sm: 6 }}>...</Grid>
  </Grid>
  // Wrong (MUI v5/legacy)
  <Grid container><Grid item xs={12} sm={6}>...</Grid></Grid>
  ```
- Import icons from `@mui/icons-material` (not `@mui/icons-material/index`)

### Imports order
1. React / react-dom
2. Third-party libraries (react-router-dom, @tanstack/react-query, @mui, etc.)
3. Local: context, hooks, api, types, components

### Naming
- Components: `PascalCase` files and function names
- Hooks: `useCamelCase`
- API modules: `camelCase` (e.g., `tasksApi`, `projectsApi`)
- Types: `PascalCase` for interfaces/types, `SCREAMING_SNAKE` for constants

### Error handling in components
```tsx
} catch (err: unknown) {
  const msg =
    (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
    'Mensagem de erro padrão.';
  setError(msg);
}
```

---

## API Endpoints Summary

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/v1/auth/register/` | Register new user |
| POST | `/api/v1/auth/token/` | Login → JWT tokens |
| POST | `/api/v1/auth/token/refresh/` | Refresh access token |
| GET/PATCH | `/api/v1/auth/profile/` | Get/update own profile (supports multipart for avatar upload) |
| DELETE | `/api/v1/auth/avatar/` | Delete avatar file from disk and clear field |
| POST | `/api/v1/auth/change-password/` | Change password (current + new + confirm) |
| GET | `/api/v1/auth/users/` | List other users (for assignment) |
| GET/POST | `/api/v1/projects/` | List/create projects |
| GET/PATCH/DELETE | `/api/v1/projects/{id}/` | Project detail |
| POST | `/api/v1/projects/{id}/members/` | Add member |
| DELETE | `/api/v1/projects/{id}/members/{userId}/` | Remove member |
| PATCH | `/api/v1/projects/{id}/members/{userId}/update/` | Update member specialty/hourly_rate/role |
| GET | `/api/v1/projects/{id}/members-overview/` | Member overview with task stats |
| GET | `/api/v1/projects/{id}/activity/` | Project activity feed |
| GET/PUT/PATCH | `/api/v1/projects/{id}/budget/` | Upsert project budget |
| GET/POST | `/api/v1/projects/{id}/tech-stack/` | List / add tech stack item |
| PATCH/DELETE | `/api/v1/projects/{id}/tech-stack/{itemId}/` | Update / delete tech item |
| GET/POST | `/api/v1/projects/{id}/objectives/` | List / add objective |
| PATCH/DELETE | `/api/v1/projects/{id}/objectives/{itemId}/` | Update / delete objective |
| GET/POST | `/api/v1/projects/{id}/risks/` | List / add risk |
| PATCH/DELETE | `/api/v1/projects/{id}/risks/{itemId}/` | Update / delete risk |
| GET/POST | `/api/v1/projects/{id}/milestones/` | List / add milestone |
| PATCH/DELETE | `/api/v1/projects/{id}/milestones/{itemId}/` | Update / delete milestone |
| GET/POST | `/api/v1/tasks/` | List/create tasks |
| GET/PATCH/DELETE | `/api/v1/tasks/{id}/` | Task detail |
| PATCH | `/api/v1/tasks/{id}/move/` | Move task (Kanban drag) |
| GET/POST | `/api/v1/tasks/{id}/comments/` | Task comments |

Docs available at `http://localhost:8000/api/docs/` (Swagger UI).

---

## Docker — Commands

```bash
# Build and run all services locally (postgres + backend + frontend)
docker compose up --build

# Run in detached mode
docker compose up -d --build

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Build images individually
docker build -t backend:local ./backend
docker build -t frontend:local ./frontend

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (wipes DB)
docker compose down -v
```

---

## Helm / Kubernetes — Commands

```bash
# Lint the chart
helm lint helm/taskmanager

# Dry-run render (inspect generated manifests)
helm template taskmanager helm/taskmanager \
  --set secrets.secretKey=test \
  --set secrets.dbPassword=test

# Install to k3s cluster (first time)
helm install taskmanager helm/taskmanager \
  --namespace taskmanager --create-namespace \
  --set secrets.secretKey="<STRONG_KEY>" \
  --set secrets.dbPassword="<DB_PASS>"

# Upgrade after changes
helm upgrade taskmanager helm/taskmanager \
  --namespace taskmanager \
  --set secrets.secretKey="<STRONG_KEY>" \
  --set secrets.dbPassword="<DB_PASS>"

# Uninstall
helm uninstall taskmanager --namespace taskmanager

# Check pod/service/ingress status
kubectl get all -n taskmanager
kubectl get ingress -n taskmanager
kubectl logs -n taskmanager deploy/taskmanager-backend
```

**Required secrets on GitHub** (Settings → Secrets → Actions):
- No additional secrets needed — the workflow uses `GITHUB_TOKEN` (automatic).

**Required env vars for bootstrap-vps.sh:**
- `SECRET_KEY` — Django secret key
- `DB_PASSWORD` — PostgreSQL password
- `GHCR_TOKEN` — GitHub PAT with `read:packages` scope
- `GHCR_USER` — GitHub username (`rikelmy-matos`)

---

## Key Design Decisions

- Tasks are scoped to projects; all queries filter by `project__members__user=request.user`
- Kanban columns map directly to `Task.status`: `todo`, `in_progress`, `done`
- Drag-and-drop updates `status` + `position` via the `/move/` endpoint
- JWT access token is stored in `localStorage`; refresh is automatic via Axios interceptor
- The `@hello-pangea/dnd` library is the actively maintained fork of `react-beautiful-dnd`
- FullCalendar renders task `due_date` fields; color-coded by priority
- `ProjectDetailPage` lives at `/projects/:projectId/overview` with 7 tabs: Visão Geral,
  Orçamento, Equipe, Arquitetura, Objetivos, Riscos, Marcos
- `ProjectBudget` is a OneToOne to `Project` — upserted via PUT on `/budget/`
- `ProjectMember` carries `specialty` (CharField) and `hourly_rate` (DecimalField, nullable)
- Sub-resources (tech_stack, objectives, risks, milestones) are separate models with UUID PKs,
  all scoped to a `Project` FK and managed via nested URL actions on `ProjectViewSet`
- `ProjectViewSet` uses `get_permissions()` to apply `IsProjectOwnerOrAdmin` only on
  `update`/`partial_update`/`destroy`; list/retrieve/create use `IsAuthenticated` only
- `TaskViewSet.perform_create` enforces project membership before saving (raises 403)
- `recharts` is NOT installed — dashboard charts use MUI `LinearProgress` bars
- `DashboardPage` shows 4 stat cards + 2 bar charts (tasks by status, tasks by priority)
- `ProjectsPage` has search (text) + status filter that pass `?search=` and `?status=` to API
- Global toast/snackbar via `SnackbarContext` (`src/context/SnackbarContext.tsx`);
  use `useSnackbar()` hook anywhere in the tree to call `showToast(msg, severity)`
- `AuthContext` exposes `refreshUser()` to re-fetch and update the current user from the API

### UI Theme (colorful & playful — indigo/violet)
- MUI theme defined in `App.tsx`; primary `#6C63FF`, secondary `#FF6584`, `borderRadius: 14`
- Sidebar: solid deep indigo (`#4B44CC`) background, white icons/text, active state vertical indicator
- Project cards: status-based colored top-accent (`::before` pseudo-element)
- Kanban columns: `todo` → `#6C63FF`, `in_progress` → `#F59E0B`, `done` → `#22C55E`
- Task card priority left border: `low` → `#9CA3AF`, `medium` → `#3B82F6`, `high` → `#F59E0B`, `critical` → `#EF4444`
- `Docker build uses `tsc -b`` (stricter than `--noEmit`) — remove all unused variables before committing
- Profile edit page at `/profile` (`src/pages/auth/ProfilePage.tsx`); edits
  `first_name`, `last_name`, `bio` via `authApi.updateProfile` then calls `refreshUser()`
- Avatar upload via `authApi.uploadAvatar(file)` → multipart PATCH to `/auth/profile/`;
  avatar removal via `authApi.removeAvatar()` → DELETE `/auth/avatar/` (deletes file from disk)
- `avatar_url` is a read-only `SerializerMethodField` on `UserSerializer` returning the
  absolute URL; consumed by `<Avatar src={user?.avatar_url}>` in sidebar and ProfilePage
- Password change via `authApi.changePassword(current, new, confirm)` → POST `/auth/change-password/`;
  `ChangePasswordSerializer` validates current password and new password match
- nginx `location ^~ /media/` (with `^~` modifier) proxies user-uploaded media to the backend;
  `^~` is required so the regex static-asset cache rule (`~* \.(jpg|jpeg|...)$`) does not
  intercept media requests before they reach the backend
- `KanbanBoard` header has "Ver detalhes do projeto" button (→ `/projects/:id/overview`)
- `ProjectDetailPage` header has back + "Membros" + "Abrir Kanban" buttons
- All data tabs in `ProjectDetailPage` show `<Alert severity="error">` on query failure
- Clicking a task card on the Kanban board opens the edit dialog; drag vs. click is
  distinguished by tracking `mousedown` position and checking delta < 6px on `mouseup`
- **Backend image has no volume mount** — always run `docker compose build backend` then
  `docker compose up -d --no-deps backend` after editing backend source, then rerun tests
  via `docker compose exec backend python manage.py test`
- **43 backend tests** all pass (projects: 22, tasks: 18, users: 3)
