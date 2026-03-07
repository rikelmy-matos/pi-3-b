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
} from '@mui/material';
import { projectsApi, tasksApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Task } from '../../types';

const PRIORITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default', medium: 'info', high: 'warning', critical: 'error',
};

// ── Tasks by status bar chart (no external lib) ───────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  done: 'Concluído',
};

const STATUS_COLOR: Record<string, string> = {
  todo: '#1976d2',
  in_progress: '#ed6c02',
  done: '#2e7d32',
};

function TasksByStatusChart({ tasks }: { tasks: Task[] }) {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }
  const total = tasks.length;

  // Merge known statuses + any extra ones
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
          <Box key={status} mb={1.5}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" fontWeight={600}>
                {label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {count} ({pct.toFixed(0)}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: `${color}22`,
                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 5 },
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
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};
const PRIORITY_HEX: Record<string, string> = {
  low: '#9e9e9e',
  medium: '#0288d1',
  high: '#f57c00',
  critical: '#d32f2f',
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
          <Box key={p} mb={1.5}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" fontWeight={600}>
                {PRIORITY_LABEL_MAP[p] ?? p}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {count} ({pct.toFixed(0)}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: `${color}22`,
                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 5 },
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

  // All tasks assigned to me (used for charts)
  const allMyTasks = tasks ?? [];
  const myPendingTasks = allMyTasks.filter((t) => t.status !== 'done');
  const totalProjects = projects?.count ?? 0;
  const activeProjects = projects?.results.filter((p) => p.status === 'active').length ?? 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Olá, {user?.first_name || user?.username}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Aqui está um resumo das suas atividades.
      </Typography>

      {/* Stats */}
      <Grid container spacing={2} mb={4}>
        {[
          { label: 'Total de Projetos', value: totalProjects, color: '#1976d2' },
          { label: 'Projetos Ativos', value: activeProjects, color: '#2e7d32' },
          { label: 'Tarefas Pendentes', value: myPendingTasks.length, color: '#ed6c02' },
          { label: 'Total de Tarefas', value: allMyTasks.length, color: '#9c27b0' },
        ].map((stat) => (
          <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h3" fontWeight={700} color={stat.color}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts row */}
      {allMyTasks.length > 0 && (
        <Grid container spacing={2} mb={4}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Minhas Tarefas por Status
              </Typography>
              <TasksByStatusChart tasks={allMyTasks} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Minhas Tarefas por Prioridade
              </Typography>
              <TasksByPriorityChart tasks={allMyTasks} />
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Recent tasks */}
      <Typography variant="h6" fontWeight={600} mb={1}>
        Minhas Tarefas Pendentes
      </Typography>
      <Card elevation={1}>
        <List disablePadding>
          {myPendingTasks.slice(0, 8).map((task, i) => (
            <Box key={task.id}>
              <ListItem
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate(`/projects/${task.project}`)}
              >
                <ListItemText
                  primary={task.title}
                  secondary={
                    <>
                      {task.project_name && (
                        <Typography component="span" variant="caption" color="primary" mr={1}>
                          {task.project_name}
                        </Typography>
                      )}
                      {task.due_date
                        ? `Prazo: ${new Date(task.due_date).toLocaleDateString('pt-BR')}`
                        : undefined}
                    </>
                  }
                />
                <Chip
                  label={
                    { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' }[
                      task.priority
                    ]
                  }
                  color={PRIORITY_COLOR[task.priority]}
                  size="small"
                />
              </ListItem>
              {i < myPendingTasks.slice(0, 8).length - 1 && <Divider />}
            </Box>
          ))}
          {myPendingTasks.length === 0 && (
            <ListItem>
              <ListItemText
                primary="Nenhuma tarefa pendente!"
                secondary="Ótimo trabalho."
                primaryTypographyProps={{ color: 'text.secondary' }}
              />
            </ListItem>
          )}
        </List>
      </Card>
    </Box>
  );
}
