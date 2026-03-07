import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  LinearProgress,
  Paper,
  Avatar,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { projectsApi, tasksApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Task } from '../../types';

const PRIORITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default', medium: 'info', high: 'warning', critical: 'error',
};

const PRIORITY_CHIP_BG: Record<string, string> = {
  low: '#E5E7EB',
  medium: '#DBEAFE',
  high: '#FEF3C7',
  critical: '#FEE2E2',
};
const PRIORITY_CHIP_COLOR: Record<string, string> = {
  low: '#6B7280',
  medium: '#1D4ED8',
  high: '#B45309',
  critical: '#991B1B',
};

// Stat card color configs
const STAT_CONFIGS = [
  {
    label: 'Total de Projetos',
    bg: 'linear-gradient(135deg, #6C63FF 0%, #9D97FF 100%)',
    icon: <FolderOpenIcon sx={{ fontSize: 28, color: 'rgba(255,255,255,0.85)' }} />,
    textColor: '#fff',
  },
  {
    label: 'Projetos Ativos',
    bg: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
    icon: <CheckCircleOutlineIcon sx={{ fontSize: 28, color: 'rgba(255,255,255,0.85)' }} />,
    textColor: '#fff',
  },
  {
    label: 'Tarefas Pendentes',
    bg: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
    icon: <PendingActionsIcon sx={{ fontSize: 28, color: 'rgba(255,255,255,0.85)' }} />,
    textColor: '#fff',
  },
  {
    label: 'Total de Tarefas',
    bg: 'linear-gradient(135deg, #FF6584 0%, #FF91A8 100%)',
    icon: <AssignmentIcon sx={{ fontSize: 28, color: 'rgba(255,255,255,0.85)' }} />,
    textColor: '#fff',
  },
];

// ── Tasks by status bar chart ─────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  done: 'Concluído',
};

const STATUS_COLOR: Record<string, string> = {
  todo: '#6C63FF',
  in_progress: '#F59E0B',
  done: '#22C55E',
};

function TasksByStatusChart({ tasks }: { tasks: Task[] }) {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }
  const total = tasks.length;
  const knownStatuses = ['todo', 'in_progress', 'done'];
  const allStatuses = [
    ...knownStatuses.filter((s) => counts[s] !== undefined),
    ...Object.keys(counts).filter((s) => !knownStatuses.includes(s)),
  ];

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nenhuma tarefa encontrada.
      </Typography>
    );
  }

  return (
    <Box>
      {allStatuses.map((status) => {
        const count = counts[status] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const color = STATUS_COLOR[status] ?? '#9c27b0';
        const label = STATUS_LABEL[status] ?? status;
        return (
          <Box key={status} mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                <Typography variant="caption" fontWeight={600} color="text.primary">
                  {label}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {count} <span style={{ opacity: 0.6 }}>({pct.toFixed(0)}%)</span>
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 8,
                borderRadius: 8,
                bgcolor: `${color}22`,
                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 8 },
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}

// ── Tasks by priority chart ───────────────────────────────────────────────────

const PRIORITY_LABEL_MAP: Record<string, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
};
const PRIORITY_HEX: Record<string, string> = {
  low: '#9CA3AF', medium: '#3B82F6', high: '#F59E0B', critical: '#EF4444',
};

function TasksByPriorityChart({ tasks }: { tasks: Task[] }) {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    counts[t.priority] = (counts[t.priority] ?? 0) + 1;
  }
  const total = tasks.length;
  const priorities = ['critical', 'high', 'medium', 'low'].filter((p) => counts[p]);
  if (total === 0) return null;

  return (
    <Box>
      {priorities.map((p) => {
        const count = counts[p] ?? 0;
        const pct = (count / total) * 100;
        const color = PRIORITY_HEX[p] ?? '#9c27b0';
        return (
          <Box key={p} mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                <Typography variant="caption" fontWeight={600} color="text.primary">
                  {PRIORITY_LABEL_MAP[p] ?? p}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {count} <span style={{ opacity: 0.6 }}>({pct.toFixed(0)}%)</span>
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 8,
                borderRadius: 8,
                bgcolor: `${color}22`,
                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 8 },
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks-dashboard'],
    queryFn: () => tasksApi.list({ assignee: String(user?.id) }).then((r) => r.results),
    enabled: !!user,
  });

  const allMyTasks = tasks ?? [];
  const myPendingTasks = allMyTasks.filter((t) => t.status !== 'done');
  const totalProjects = projects?.count ?? 0;
  const activeProjects = projects?.results.filter((p) => p.status === 'active').length ?? 0;

  const statValues = [totalProjects, activeProjects, myPendingTasks.length, allMyTasks.length];

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h5" color="text.primary" mb={0.5}>
          Olá, {user?.first_name || user?.username} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Aqui está um resumo das suas atividades.
        </Typography>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2.5} mb={4}>
        {STAT_CONFIGS.map((cfg, i) => (
          <Grid size={{ xs: 6, sm: 3 }} key={cfg.label}>
            <Card
              elevation={0}
              sx={{
                background: cfg.bg,
                border: 'none',
                boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
              }}
            >
              <CardContent sx={{ p: '20px !important' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                    }}
                  >
                    {cfg.icon}
                  </Box>
                </Box>
                <Typography variant="h4" fontWeight={800} color={cfg.textColor} lineHeight={1}>
                  {statValues[i]}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.80)', fontWeight: 600, fontSize: '0.78rem' }}
                >
                  {cfg.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts row */}
      {allMyTasks.length > 0 && (
        <Grid container spacing={2.5} mb={4}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: '1px solid rgba(108,99,255,0.12)',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} mb={2.5} color="text.primary">
                Minhas Tarefas por Status
              </Typography>
              <TasksByStatusChart tasks={allMyTasks} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: '1px solid rgba(108,99,255,0.12)',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} mb={2.5} color="text.primary">
                Minhas Tarefas por Prioridade
              </Typography>
              <TasksByPriorityChart tasks={allMyTasks} />
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Pending tasks list */}
      <Box mb={2} display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" color="text.primary">
          Tarefas Pendentes
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {myPendingTasks.length} tarefa{myPendingTasks.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      <Card elevation={0}>
        <List disablePadding>
          {myPendingTasks.slice(0, 8).map((task, i) => (
            <Box key={task.id}>
              <ListItem
                sx={{
                  cursor: 'pointer',
                  py: 1.5,
                  px: 2.5,
                  '&:hover': { bgcolor: 'rgba(108,99,255,0.04)' },
                  transition: 'background-color 0.15s',
                }}
                onClick={() => navigate(`/projects/${task.project}`)}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    mr: 2,
                    bgcolor: PRIORITY_CHIP_BG[task.priority] ?? '#E5E7EB',
                    color: PRIORITY_CHIP_COLOR[task.priority] ?? '#6B7280',
                    fontSize: 13,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {task.priority[0].toUpperCase()}
                </Avatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600} color="text.primary" noWrap>
                      {task.title}
                    </Typography>
                  }
                  secondary={
                    <Box display="flex" alignItems="center" gap={1} mt={0.25}>
                      {task.project_name && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: '#6C63FF',
                            fontWeight: 700,
                            bgcolor: 'rgba(108,99,255,0.10)',
                            px: 0.75,
                            py: 0.2,
                            borderRadius: 1,
                            fontSize: '0.7rem',
                          }}
                        >
                          {task.project_name}
                        </Typography>
                      )}
                      {task.due_date && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          Prazo: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Chip
                  label={
                    { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' }[task.priority]
                  }
                  size="small"
                  sx={{
                    bgcolor: PRIORITY_CHIP_BG[task.priority],
                    color: PRIORITY_CHIP_COLOR[task.priority],
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    border: 'none',
                    flexShrink: 0,
                  }}
                />
              </ListItem>
              {i < myPendingTasks.slice(0, 8).length - 1 && (
                <Divider sx={{ mx: 2, borderColor: 'rgba(108,99,255,0.06)' }} />
              )}
            </Box>
          ))}
          {myPendingTasks.length === 0 && (
            <ListItem sx={{ py: 4, justifyContent: 'center' }}>
              <Box textAlign="center">
                <CheckCircleOutlineIcon sx={{ fontSize: 40, color: '#22C55E', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Nenhuma tarefa pendente — ótimo trabalho!
                </Typography>
              </Box>
            </ListItem>
          )}
        </List>
      </Card>
    </Box>
  );
}
