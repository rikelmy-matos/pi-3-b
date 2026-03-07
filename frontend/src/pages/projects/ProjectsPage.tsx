import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Typography,
  Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { projectsApi } from '../../api';
import type { Project } from '../../types';

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
  active: 'success',
  paused: 'warning',
  completed: 'default',
  archived: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  archived: 'Arquivado',
};

function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  return (
    <Card elevation={2}>
      <CardActionArea onClick={() => navigate(`/projects/${project.id}`)}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="h6" fontWeight={600} noWrap sx={{ maxWidth: '70%' }}>
              {project.name}
            </Typography>
            <Chip
              label={STATUS_LABEL[project.status]}
              color={STATUS_COLOR[project.status]}
              size="small"
            />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 2,
              minHeight: 40,
            }}
          >
            {project.description || 'Sem descrição.'}
          </Typography>
          <Box display="flex" gap={2}>
            <Typography variant="caption" color="text.secondary">
              {project.task_count} tarefas
            </Typography>
            {project.due_date && (
              <Typography variant="caption" color="text.secondary">
                Prazo: {new Date(project.due_date).toLocaleDateString('pt-BR')}
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Projetos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/projects/new')}
        >
          Novo Projeto
        </Button>
      </Box>

      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
              </Grid>
            ))
          : data?.results.map((project) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
                <ProjectCard project={project} />
              </Grid>
            ))}
        {!isLoading && data?.results.length === 0 && (
          <Grid size={12}>
            <Box textAlign="center" py={8}>
              <Typography color="text.secondary" mb={2}>
                Nenhum projeto encontrado.
              </Typography>
              <Button variant="outlined" onClick={() => navigate('/projects/new')}>
                Criar primeiro projeto
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
