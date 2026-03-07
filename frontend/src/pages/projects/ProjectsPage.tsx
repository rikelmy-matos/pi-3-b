import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { projectsApi } from '../../api';
import type { Project, ProjectStatus } from '../../types';

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

interface EditProjectForm {
  name: string;
  description: string;
  status: ProjectStatus;
  start_date: string;
  due_date: string;
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const navigate = useNavigate();
  return (
    <Card elevation={2} sx={{ position: 'relative', '&:hover .card-actions': { opacity: 1 } }}>
      <CardActionArea onClick={() => navigate(`/projects/${project.id}`)}>
        <CardContent sx={{ pb: '12px !important' }}>
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

      {/* Ver Detalhes button */}
      <Box px={2} pb={1.5} onClick={(e) => e.stopPropagation()}>
        <Button
          size="small"
          variant="text"
          startIcon={<InfoOutlinedIcon fontSize="small" />}
          onClick={() => navigate(`/projects/${project.id}/overview`)}
          sx={{ textTransform: 'none', color: 'text.secondary' }}
        >
          Ver Detalhes
        </Button>
      </Box>

      {/* Edit / Delete action buttons — fade in on hover */}
      <Box
        className="card-actions"
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          display: 'flex',
          gap: 0.5,
          opacity: 0,
          transition: 'opacity 0.2s',
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          size="small"
          onClick={() => onEdit(project)}
          aria-label="editar projeto"
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={() => onDelete(project)}
          aria-label="excluir projeto"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Card>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Edit dialog state
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<EditProjectForm>({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    due_date: '',
  });

  // Delete dialog state
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditProject(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteProject(null);
    },
  });

  const handleOpenEdit = (project: Project) => {
    setEditProject(project);
    setEditForm({
      name: project.name,
      description: project.description ?? '',
      status: project.status,
      start_date: project.start_date ?? '',
      due_date: project.due_date ?? '',
    });
  };

  const handleSaveEdit = () => {
    if (!editProject) return;
    updateMutation.mutate({
      id: editProject.id,
      data: {
        name: editForm.name,
        description: editForm.description,
        status: editForm.status,
        start_date: editForm.start_date || null,
        due_date: editForm.due_date || null,
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteProject) return;
    deleteMutation.mutate(deleteProject.id);
  };

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
                <ProjectCard
                  project={project}
                  onEdit={handleOpenEdit}
                  onDelete={setDeleteProject}
                />
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

      {/* ── Edit Project Dialog ─────────────────────────────── */}
      <Dialog open={!!editProject} onClose={() => setEditProject(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Projeto</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            fullWidth
            required
            autoFocus
            sx={{ mt: 1, mb: 2 }}
            value={editForm.name}
            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
          />
          <TextField
            label="Descrição"
            fullWidth
            multiline
            rows={3}
            sx={{ mb: 2 }}
            value={editForm.description}
            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
          />
          <TextField
            select
            label="Status"
            fullWidth
            sx={{ mb: 2 }}
            value={editForm.status}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, status: e.target.value as ProjectStatus }))
            }
          >
            <MenuItem value="active">Ativo</MenuItem>
            <MenuItem value="paused">Pausado</MenuItem>
            <MenuItem value="completed">Concluído</MenuItem>
            <MenuItem value="archived">Arquivado</MenuItem>
          </TextField>
          <Box display="flex" gap={2}>
            <TextField
              label="Início"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={editForm.start_date}
              onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
            />
            <TextField
              label="Prazo"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={editForm.due_date}
              onChange={(e) => setEditForm((p) => ({ ...p, due_date: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProject(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!editForm.name || updateMutation.isPending}
            onClick={handleSaveEdit}
          >
            {updateMutation.isPending ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────── */}
      <Dialog open={!!deleteProject} onClose={() => setDeleteProject(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir Projeto</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o projeto{' '}
            <strong>{deleteProject?.name}</strong>? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteProject(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={handleConfirmDelete}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
