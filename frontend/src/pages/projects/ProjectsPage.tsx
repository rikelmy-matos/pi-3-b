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
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import { projectsApi } from '../../api';
import { useSnackbar } from '../../context/SnackbarContext';
import type { Project, ProjectStatus } from '../../types';

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  archived: 'Arquivado',
};

const STATUS_CHIP_BG: Record<string, string> = {
  active: '#DCFCE7',
  paused: '#FEF3C7',
  completed: '#EDE9FE',
  archived: '#FEE2E2',
};

const STATUS_CHIP_COLOR: Record<string, string> = {
  active: '#166534',
  paused: '#92400E',
  completed: '#5B21B6',
  archived: '#991B1B',
};

const STATUS_CARD_ACCENT: Record<string, string> = {
  active: '#22C55E',
  paused: '#F59E0B',
  completed: '#6C63FF',
  archived: '#EF4444',
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
  const accent = STATUS_CARD_ACCENT[project.status] ?? '#6C63FF';
  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.18s, box-shadow 0.18s',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 12px 32px rgba(108,99,255,0.18)',
        },
        '&:hover .card-actions': { opacity: 1 },
        // Top accent bar
        '&::before': {
          content: '""',
          display: 'block',
          height: 5,
          bgcolor: accent,
          background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
          borderRadius: '16px 16px 0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
        },
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/projects/${project.id}`)}
        sx={{ pt: '5px', borderRadius: 0 }}
      >
        <CardContent sx={{ pb: '12px !important', pt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ maxWidth: '68%' }}>
              {project.name}
            </Typography>
            <Chip
              label={STATUS_LABEL[project.status]}
              size="small"
              sx={{
                bgcolor: STATUS_CHIP_BG[project.status],
                color: STATUS_CHIP_COLOR[project.status],
                fontWeight: 700,
                fontSize: '0.7rem',
                border: 'none',
                flexShrink: 0,
              }}
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
              lineHeight: 1.5,
            }}
          >
            {project.description || 'Sem descrição.'}
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: 'rgba(108,99,255,0.08)',
                px: 1,
                py: 0.35,
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" color="primary" fontWeight={700}>
                {project.task_count} tarefas
              </Typography>
            </Box>
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
          sx={{
            textTransform: 'none',
            color: 'primary.main',
            fontSize: '0.78rem',
            fontWeight: 600,
            '&:hover': { bgcolor: 'rgba(108,99,255,0.08)' },
          }}
        >
          Ver Detalhes
        </Button>
      </Box>

      {/* Edit / Delete action buttons — fade in on hover */}
      <Box
        className="card-actions"
        sx={{
          position: 'absolute',
          top: 10,
          right: 8,
          display: 'flex',
          gap: 0.5,
          opacity: 0,
          transition: 'opacity 0.2s',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          p: 0.25,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          size="small"
          onClick={() => onEdit(project)}
          aria-label="editar projeto"
          sx={{ '&:hover': { color: 'primary.main' } }}
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
  const { showToast } = useSnackbar();

  // Search / filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
    queryKey: ['projects', search, statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      return projectsApi.list(params);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditProject(null);
      showToast('Projeto atualizado com sucesso.');
    },
    onError: () => showToast('Erro ao atualizar projeto.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteProject(null);
      showToast('Projeto excluído.', 'info');
    },
    onError: () => showToast('Erro ao excluir projeto.', 'error'),
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
        <Box>
          <Typography variant="h5" color="text.primary" mb={0.25}>
            Projetos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data?.count ?? 0} projeto{(data?.count ?? 0) !== 1 ? 's' : ''} encontrado{(data?.count ?? 0) !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/projects/new')}
          sx={{ px: 2.5 }}
        >
          Novo Projeto
        </Button>
      </Box>

      {/* Search + filter bar */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Buscar projetos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            flex: 1,
            minWidth: 200,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
              borderRadius: 3,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{
            minWidth: 150,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
              borderRadius: 3,
            },
          }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="active">Ativo</MenuItem>
          <MenuItem value="paused">Pausado</MenuItem>
          <MenuItem value="completed">Concluído</MenuItem>
          <MenuItem value="archived">Arquivado</MenuItem>
        </TextField>
      </Box>

      <Grid container spacing={2.5}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 4 }} />
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
            <Box textAlign="center" py={10}>
              <FolderIcon sx={{ fontSize: 56, color: 'rgba(108,99,255,0.25)', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" mb={1} fontWeight={600}>
                Nenhum projeto encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                {search || statusFilter ? 'Tente ajustar os filtros.' : 'Crie seu primeiro projeto para começar.'}
              </Typography>
              {!search && !statusFilter && (
                <Button variant="contained" onClick={() => navigate('/projects/new')}>
                  Criar primeiro projeto
                </Button>
              )}
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
