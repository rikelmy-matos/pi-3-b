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
} from '@mui/material';
import { projectsApi, tasksApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

const PRIORITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default', medium: 'info', high: 'warning', critical: 'error',
};

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

  const myPendingTasks = (tasks ?? []).filter((t) => t.status !== 'done');
  const totalProjects = projects?.count ?? 0;
  const activeProjects = projects?.results.filter((p) => p.status === 'active').length ?? 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Olá, {user?.first_name} 👋
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
        ].map((stat) => (
          <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
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
                  secondary={task.due_date ? `Prazo: ${new Date(task.due_date).toLocaleDateString('pt-BR')}` : undefined}
                />
                <Chip
                  label={{ low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' }[task.priority]}
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
