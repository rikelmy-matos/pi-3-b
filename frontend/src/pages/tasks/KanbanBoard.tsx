import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
  Avatar,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import AddTaskIcon from '@mui/icons-material/AddTask';
import PeopleIcon from '@mui/icons-material/People';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { projectsApi, tasksApi, columnsApi, activityApi } from '../../api';
import { useSnackbar } from '../../context/SnackbarContext';
import type { Task, TaskPriority, KanbanColumn, TaskActivity } from '../../types';

// ── Colour palette for column picker ─────────────────────────────────────────
const COLUMN_COLORS = [
  '#6C63FF', '#F59E0B', '#22C55E', '#EC4899',
  '#EF4444', '#0EA5E9', '#8B5CF6', '#14B8A6',
];

const DEFAULT_COLUMNS = [
  { name: 'A Fazer', slug: 'todo', color: '#6C63FF', order: 0 },
  { name: 'Em Andamento', slug: 'in_progress', color: '#F59E0B', order: 1 },
  { name: 'Concluído', slug: 'done', color: '#22C55E', order: 2 },
];

const PRIORITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const PRIORITY_LEFT_COLOR: Record<string, string> = {
  low: '#9CA3AF',
  medium: '#3B82F6',
  high: '#F59E0B',
  critical: '#EF4444',
};

const ACTION_LABEL: Record<string, string> = {
  moved: 'moveu',
  assigned: 'atribuiu',
  unassigned: 'removeu atribuição de',
  created: 'criou',
};

// ── Helper: relative time ─────────────────────────────────────────────────────
function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

function formatExact(isoDate: string): string {
  const d = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  index,
  onEdit,
}: {
  task: Task;
  index: number;
  onEdit: (t: Task) => void;
}) {
  const leftColor = PRIORITY_LEFT_COLOR[task.priority] ?? '#9CA3AF';
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          elevation={snapshot.isDragging ? 8 : 0}
          sx={{
            mb: 1.5,
            position: 'relative',
            borderLeft: `4px solid ${leftColor}`,
            borderRadius: '10px',
            bgcolor: 'background.paper',
            boxShadow: snapshot.isDragging
              ? '0 12px 32px rgba(108,99,255,0.22)'
              : '0 1px 4px rgba(0,0,0,0.08)',
            transition: 'box-shadow 0.18s, transform 0.12s',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(108,99,255,0.15)',
              transform: 'translateY(-1px)',
            },
            '&:hover .task-edit-btn': { opacity: 1 },
          }}
        >
          <Box
            {...provided.dragHandleProps}
            sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
          >
            <CardContent sx={{ p: '12px !important', pr: '36px !important' }}>
              <Typography variant="body2" fontWeight={600} mb={0.75} lineHeight={1.4}>
                {task.title}
              </Typography>
              {task.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mb: 1,
                    lineHeight: 1.5,
                  }}
                >
                  {task.description}
                </Typography>
              )}
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Chip
                  label={PRIORITY_LABEL[task.priority]}
                  color={PRIORITY_COLOR[task.priority]}
                  size="small"
                  sx={{ fontSize: 10, fontWeight: 700, height: 20 }}
                />
                <Box display="flex" alignItems="center" gap={0.5}>
                  {task.due_date && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                      {new Date(task.due_date).toLocaleDateString('pt-BR')}
                    </Typography>
                  )}
                  {task.assignee && (
                    <Tooltip title={task.assignee.full_name}>
                      <Avatar
                        sx={{
                          width: 22,
                          height: 22,
                          fontSize: 11,
                          bgcolor: 'primary.main',
                        }}
                      >
                        {task.assignee.first_name?.[0]?.toUpperCase()}
                      </Avatar>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Box>

          <IconButton
            className="task-edit-btn"
            size="small"
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            aria-label="editar tarefa"
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              opacity: 0,
              transition: 'opacity 0.2s',
              bgcolor: 'background.paper',
              boxShadow: 1,
              width: 24,
              height: 24,
            }}
          >
            <EditIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Card>
      )}
    </Draggable>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function KanbanBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useSnackbar();

  // ── Drawer state ─────────────────────────────────────────────────────────
  const [activityOpen, setActivityOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);

  // ── New task ──────────────────────────────────────────────────────────────
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [newTaskForm, setNewTaskForm] = useState({
    title: '', description: '', priority: 'medium', due_date: '', assignee_id: '',
  });

  // ── Edit task ─────────────────────────────────────────────────────────────
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', priority: 'medium' as TaskPriority,
    status: 'todo', due_date: '', assignee_id: '',
  });
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false);

  // ── Column management ─────────────────────────────────────────────────────
  const [addColOpen, setAddColOpen] = useState(false);
  const [addColForm, setAddColForm] = useState({ name: '', color: COLUMN_COLORS[0] });
  const [editCol, setEditCol] = useState<KanbanColumn | null>(null);
  const [editColForm, setEditColForm] = useState({ name: '', color: '' });
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<KanbanColumn | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: columns, isLoading: colsLoading } = useQuery({
    queryKey: ['columns', projectId],
    queryFn: () => columnsApi.list(projectId!),
    enabled: !!projectId,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list({ project: projectId! }).then((r) => r.results),
    enabled: !!projectId,
  });

  const { data: activityLog, isLoading: activityLoading } = useQuery({
    queryKey: ['activity', projectId],
    queryFn: () => activityApi.forProject(projectId!),
    enabled: !!projectId && activityOpen,
  });

  // ── Seed default columns when project is new ──────────────────────────────
  const seedMutation = useMutation({
    mutationFn: (col: typeof DEFAULT_COLUMNS[0]) =>
      columnsApi.create({ ...col, project: projectId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['columns', projectId] }),
  });

  useEffect(() => {
    if (!colsLoading && columns && columns.length === 0 && projectId) {
      DEFAULT_COLUMNS.forEach((col) => seedMutation.mutate(col));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colsLoading, columns, projectId]);

  // ── Task mutations ────────────────────────────────────────────────────────
  const moveMutation = useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: string; position: number }) =>
      tasksApi.move(id, status, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activity', projectId] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activity', projectId] });
      setNewTaskOpen(false);
      setNewTaskForm({ title: '', description: '', priority: 'medium', due_date: '', assignee_id: '' });
      showToast('Tarefa criada com sucesso.');
    },
    onError: () => showToast('Erro ao criar tarefa.', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activity', projectId] });
      setEditTask(null);
      setConfirmDeleteTask(false);
      showToast('Tarefa atualizada.');
    },
    onError: () => showToast('Erro ao atualizar tarefa.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setEditTask(null);
      setConfirmDeleteTask(false);
      showToast('Tarefa excluída.', 'info');
    },
    onError: () => showToast('Erro ao excluir tarefa.', 'error'),
  });

  // ── Column mutations ──────────────────────────────────────────────────────
  const addColMutation = useMutation({
    mutationFn: (data: Partial<KanbanColumn>) => columnsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', projectId] });
      setAddColOpen(false);
      setAddColForm({ name: '', color: COLUMN_COLORS[0] });
      showToast('Coluna adicionada.');
    },
    onError: () => showToast('Erro ao adicionar coluna.', 'error'),
  });

  const updateColMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KanbanColumn> }) =>
      columnsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', projectId] });
      setEditCol(null);
      showToast('Coluna atualizada.');
    },
    onError: () => showToast('Erro ao atualizar coluna.', 'error'),
  });

  const deleteColMutation = useMutation({
    mutationFn: (id: string) => columnsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setConfirmDeleteCol(null);
      showToast('Coluna excluída.', 'info');
    },
    onError: () => showToast('Erro ao excluir coluna.', 'error'),
  });

  // ── Activity detail dialog state ─────────────────────────────────────────
  const [selectedActivity, setSelectedActivity] = useState<TaskActivity | null>(null);

  // ── Local column order (for optimistic DnD reorder in drawer) ────────────
  const [colOrder, setColOrder] = useState<string[]>([]);

  // Keep colOrder in sync whenever the server data changes
  useEffect(() => {
    if (columns) setColOrder(columns.map((c) => c.id));
  }, [columns]);

  // ── Drag end ──────────────────────────────────────────────────────────────
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    moveMutation.mutate({ id: draggableId, status: destination.droppableId, position: destination.index });
  };

  const handleColDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const newOrder = Array.from(colOrder);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setColOrder(newOrder);
    // Persist new order for each column that changed
    newOrder.forEach((id, idx) => {
      const original = columns?.find((c) => c.id === id);
      if (original && original.order !== idx) {
        updateColMutation.mutate({ id, data: { order: idx } });
      }
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const tasksByCol = (slug: string) =>
    (tasks ?? []).filter((t) => t.status === slug).sort((a, b) => a.position - b.position);

  const handleOpenEdit = (task: Task) => {
    setEditTask(task);
    setConfirmDeleteTask(false);
    setEditForm({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ?? '',
      assignee_id: task.assignee ? String(task.assignee.id) : '',
    });
  };

  const slugify = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  // ── Render ────────────────────────────────────────────────────────────────
  if (tasksLoading || colsLoading) {
    return (
      <Box display="flex" justifyContent="center" pt={8}>
        <CircularProgress />
      </Box>
    );
  }

  const cols = columns ?? [];
  const orderedCols = colOrder.length
    ? colOrder.map((id) => cols.find((c) => c.id === id)).filter(Boolean) as typeof cols
    : cols;
  const unreadActivity = activityLog?.length ?? 0;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">
            {project?.name ?? 'Kanban'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quadro de tarefas
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Tooltip title="Gerenciar colunas">
            <IconButton
              onClick={() => setColumnsOpen(true)}
              sx={{
                bgcolor: 'rgba(108,99,255,0.08)',
                '&:hover': { bgcolor: 'rgba(108,99,255,0.16)' },
              }}
            >
              <ViewColumnIcon sx={{ color: 'primary.main' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ver detalhes do projeto">
            <IconButton
              onClick={() => navigate(`/projects/${projectId}/overview`)}
              sx={{
                bgcolor: 'rgba(108,99,255,0.08)',
                '&:hover': { bgcolor: 'rgba(108,99,255,0.16)' },
              }}
            >
              <InfoOutlinedIcon sx={{ color: 'primary.main' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Membros do projeto">
            <IconButton
              onClick={() => navigate(`/projects/${projectId}/members`)}
              sx={{
                bgcolor: 'rgba(108,99,255,0.08)',
                '&:hover': { bgcolor: 'rgba(108,99,255,0.16)' },
              }}
            >
              <PeopleIcon sx={{ color: 'primary.main' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Histórico de atividades">
            <IconButton
              onClick={() => setActivityOpen(true)}
              sx={{
                bgcolor: 'rgba(108,99,255,0.08)',
                '&:hover': { bgcolor: 'rgba(108,99,255,0.16)' },
              }}
            >
              <Badge badgeContent={unreadActivity > 0 ? unreadActivity : undefined} color="primary" max={99}>
                <HistoryIcon sx={{ color: 'primary.main' }} />
              </Badge>
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewTaskOpen(true)}
            sx={{ px: 2.5 }}
          >
            Nova Tarefa
          </Button>
        </Box>
      </Box>

      {/* ── Kanban board ──────────────────────────────────────────────────── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Box display="flex" gap={2} overflow="auto" pb={2} flex={1}>
          {orderedCols.map((col) => (
            <Box key={col.id} sx={{ minWidth: 290, flex: '0 0 290px' }}>
              {/* Column header */}
              <Box
                sx={{
                  bgcolor: col.color,
                  color: 'white',
                  p: '10px 14px',
                  borderRadius: '12px 12px 0 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="subtitle2" fontWeight={800} noWrap letterSpacing={0.3}>
                  {col.name}
                </Typography>
                <Chip
                  label={tasksByCol(col.slug).length}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.25)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    height: 22,
                    minWidth: 28,
                  }}
                />
              </Box>

              {/* Droppable area */}
              <Droppable droppableId={col.slug}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 400,
                      bgcolor: snapshot.isDraggingOver
                        ? 'rgba(108,99,255,0.07)'
                        : 'rgba(240,239,255,0.6)',
                      p: 1.25,
                      borderRadius: '0 0 12px 12px',
                      border: snapshot.isDraggingOver
                        ? '2px dashed rgba(108,99,255,0.35)'
                        : '2px solid transparent',
                      transition: 'background-color 0.2s, border-color 0.2s',
                    }}
                  >
                    {tasksByCol(col.slug).map((task, index) => (
                      <TaskCard key={task.id} task={task} index={index} onEdit={handleOpenEdit} />
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Box>
          ))}

          {/* Add column button */}
          <Box sx={{ minWidth: 200, flex: '0 0 200px', alignSelf: 'flex-start' }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setAddColOpen(true)}
              fullWidth
              sx={{
                borderStyle: 'dashed',
                borderRadius: 3,
                py: 1.5,
                borderColor: 'rgba(108,99,255,0.4)',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(108,99,255,0.06)',
                },
              }}
            >
              Nova Coluna
            </Button>
          </Box>
        </Box>
      </DragDropContext>

      {/* ── Activity side drawer ───────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        PaperProps={{ sx: { width: 360 } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>Histórico de Atividades</Typography>
          <IconButton onClick={() => setActivityOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        {activityLoading ? (
          <Box display="flex" justifyContent="center" pt={4}>
            <CircularProgress />
          </Box>
        ) : !activityLog || activityLog.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography color="text.secondary">Nenhuma atividade registrada.</Typography>
          </Box>
        ) : (
          <List dense sx={{ overflow: 'auto' }}>
            {activityLog.map((entry: TaskActivity) => (
              <ListItem
                key={entry.id}
                alignItems="flex-start"
                divider
                onClick={() => setSelectedActivity(entry)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>
                    {entry.actor?.first_name?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      <strong>{entry.actor?.full_name ?? 'Alguém'}</strong>{' '}
                      {ACTION_LABEL[entry.action] ?? entry.action}{' '}
                      {entry.action === 'moved' && (
                        <>
                          de <strong>{entry.from_value}</strong> para{' '}
                          <strong>{entry.to_value}</strong>
                        </>
                      )}
                      {entry.action === 'assigned' && (
                        <>
                          tarefa para <strong>{entry.to_value || 'alguém'}</strong>
                        </>
                      )}
                      {entry.action === 'unassigned' && (
                        <>
                          <strong>{entry.from_value}</strong>
                        </>
                      )}
                      {entry.action === 'created' && (
                        <>a tarefa</>
                      )}
                    </Typography>
                  }
                  secondary={relativeTime(entry.created_at)}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Drawer>

      {/* ── Columns management drawer ──────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        PaperProps={{ sx: { width: 340 } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>Gerenciar Colunas</Typography>
          <IconButton onClick={() => setColumnsOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <DragDropContext onDragEnd={handleColDragEnd}>
          <Droppable droppableId="columns-drawer" direction="vertical">
            {(droppableProvided) => (
              <List
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                sx={{ overflow: 'auto', flex: 1 }}
              >
                {orderedCols.map((col, index) => (
                  <Draggable key={col.id} draggableId={`col-${col.id}`} index={index}>
                    {(draggableProvided, snapshot) => (
                      <ListItem
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        divider
                        sx={{ bgcolor: snapshot.isDragging ? 'action.hover' : 'inherit' }}
                        secondaryAction={
                          <Box>
                            <IconButton size="small" onClick={() => {
                              setEditCol(col);
                              setEditColForm({ name: col.name, color: col.color });
                            }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => setConfirmDeleteCol(col)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <Box
                          {...draggableProvided.dragHandleProps}
                          sx={{ display: 'flex', alignItems: 'center', mr: 1, cursor: 'grab', color: 'text.disabled' }}
                        >
                          <DragHandleIcon fontSize="small" />
                        </Box>
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            bgcolor: col.color,
                            mr: 1.5,
                            flexShrink: 0,
                          }}
                        />
                        <ListItemText
                          primary={col.name}
                          secondary={`${tasksByCol(col.slug).length} tarefa(s)`}
                        />
                      </ListItem>
                    )}
                  </Draggable>
                ))}
                {droppableProvided.placeholder}
              </List>
            )}
          </Droppable>
        </DragDropContext>
        <Box p={2}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            fullWidth
            onClick={() => { setColumnsOpen(false); setAddColOpen(true); }}
          >
            Adicionar coluna
          </Button>
        </Box>
      </Drawer>

      {/* ── Add Column dialog ──────────────────────────────────────────────── */}
      <Dialog open={addColOpen} onClose={() => setAddColOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nova Coluna</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome" fullWidth required autoFocus sx={{ mt: 1, mb: 2 }}
            value={addColForm.name}
            onChange={(e) => setAddColForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Typography variant="caption" color="text.secondary" mb={1} display="block">Cor</Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {COLUMN_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => setAddColForm((p) => ({ ...p, color: c }))}
                sx={{
                  width: 28, height: 28, borderRadius: '50%', bgcolor: c,
                  cursor: 'pointer',
                  outline: addColForm.color === c ? '3px solid #6C63FF' : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddColOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!addColForm.name || addColMutation.isPending}
            onClick={() =>
              addColMutation.mutate({
                project: projectId,
                name: addColForm.name,
                slug: slugify(addColForm.name),
                color: addColForm.color,
                order: cols.length,
              })
            }
          >
            {addColMutation.isPending ? <CircularProgress size={20} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Column dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editCol} onClose={() => setEditCol(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar Coluna</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome" fullWidth required autoFocus sx={{ mt: 1, mb: 2 }}
            value={editColForm.name}
            onChange={(e) => setEditColForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Typography variant="caption" color="text.secondary" mb={1} display="block">Cor</Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {COLUMN_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => setEditColForm((p) => ({ ...p, color: c }))}
                sx={{
                  width: 28, height: 28, borderRadius: '50%', bgcolor: c,
                  cursor: 'pointer',
                  outline: editColForm.color === c ? '3px solid #6C63FF' : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCol(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!editColForm.name || updateColMutation.isPending}
            onClick={() =>
              editCol && updateColMutation.mutate({
                id: editCol.id,
                data: { name: editColForm.name, color: editColForm.color },
              })
            }
          >
            {updateColMutation.isPending ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Column confirm ──────────────────────────────────────────── */}
      <Dialog open={!!confirmDeleteCol} onClose={() => setConfirmDeleteCol(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir Coluna</DialogTitle>
        <DialogContent>
          <Typography>
            Excluir a coluna <strong>{confirmDeleteCol?.name}</strong>? As tarefas nessa coluna
            não serão excluídas, mas perderão o status da coluna.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteCol(null)}>Cancelar</Button>
          <Button
            variant="contained" color="error"
            disabled={deleteColMutation.isPending}
            onClick={() => confirmDeleteCol && deleteColMutation.mutate(confirmDeleteCol.id)}
          >
            {deleteColMutation.isPending ? <CircularProgress size={20} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── New Task dialog ────────────────────────────────────────────────── */}
      <Dialog open={newTaskOpen} onClose={() => setNewTaskOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Tarefa</DialogTitle>
        <DialogContent>
          <TextField
            label="Título" fullWidth required autoFocus sx={{ mt: 1, mb: 2 }}
            value={newTaskForm.title}
            onChange={(e) => setNewTaskForm((p) => ({ ...p, title: e.target.value }))}
          />
          <TextField
            label="Descrição" fullWidth multiline rows={3} sx={{ mb: 2 }}
            value={newTaskForm.description}
            onChange={(e) => setNewTaskForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Box display="flex" gap={2} mb={2}>
            <TextField
              select label="Coluna" fullWidth
              value={newTaskStatus}
              onChange={(e) => setNewTaskStatus(e.target.value)}
            >
              {cols.map((c) => (
                <MenuItem key={c.slug} value={c.slug}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select label="Prioridade" fullWidth
              value={newTaskForm.priority}
              onChange={(e) => setNewTaskForm((p) => ({ ...p, priority: e.target.value }))}
            >
              <MenuItem value="low">Baixa</MenuItem>
              <MenuItem value="medium">Média</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
              <MenuItem value="critical">Crítica</MenuItem>
            </TextField>
          </Box>
          <TextField
            label="Prazo" type="date" fullWidth InputLabelProps={{ shrink: true }} sx={{ mb: 2 }}
            value={newTaskForm.due_date}
            onChange={(e) => setNewTaskForm((p) => ({ ...p, due_date: e.target.value }))}
          />
          {project?.members && project.members.length > 0 && (
            <TextField
              select label="Responsável" fullWidth
              value={newTaskForm.assignee_id}
              onChange={(e) => setNewTaskForm((p) => ({ ...p, assignee_id: e.target.value }))}
            >
              <MenuItem value="">Nenhum</MenuItem>
              {project.members.map((m) => (
                <MenuItem key={m.user.id} value={String(m.user.id)}>
                  {m.user.full_name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTaskOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!newTaskForm.title || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                project: projectId,
                title: newTaskForm.title,
                description: newTaskForm.description,
                priority: newTaskForm.priority as TaskPriority,
                status: newTaskStatus,
                due_date: newTaskForm.due_date || undefined,
                assignee_id: (newTaskForm.assignee_id || undefined) as unknown as undefined,
              } as unknown as Partial<Task>)
            }
          >
            {createMutation.isPending ? <CircularProgress size={20} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Task dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!editTask} onClose={() => setEditTask(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Tarefa</DialogTitle>
        <DialogContent>
          <TextField
            label="Título" fullWidth required autoFocus sx={{ mt: 1, mb: 2 }}
            value={editForm.title}
            onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
          />
          <TextField
            label="Descrição" fullWidth multiline rows={3} sx={{ mb: 2 }}
            value={editForm.description}
            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Box display="flex" gap={2} mb={2}>
            <TextField
              select label="Coluna" fullWidth
              value={editForm.status}
              onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
            >
              {cols.map((c) => (
                <MenuItem key={c.slug} value={c.slug}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select label="Prioridade" fullWidth
              value={editForm.priority}
              onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))}
            >
              <MenuItem value="low">Baixa</MenuItem>
              <MenuItem value="medium">Média</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
              <MenuItem value="critical">Crítica</MenuItem>
            </TextField>
          </Box>
          <TextField
            label="Prazo" type="date" fullWidth InputLabelProps={{ shrink: true }} sx={{ mb: 2 }}
            value={editForm.due_date}
            onChange={(e) => setEditForm((p) => ({ ...p, due_date: e.target.value }))}
          />
          {project?.members && project.members.length > 0 && (
            <TextField
              select label="Responsável" fullWidth
              value={editForm.assignee_id}
              onChange={(e) => setEditForm((p) => ({ ...p, assignee_id: e.target.value }))}
            >
              <MenuItem value="">Nenhum</MenuItem>
              {project.members.map((m) => (
                <MenuItem key={m.user.id} value={String(m.user.id)}>
                  {m.user.full_name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Divider sx={{ mt: 3, mb: 2 }} />
          {!confirmDeleteTask ? (
            <Button
              color="error" startIcon={<DeleteIcon />}
              onClick={() => setConfirmDeleteTask(true)} size="small"
            >
              Excluir tarefa
            </Button>
          ) : (
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="error">Confirmar exclusão?</Typography>
              <Button
                variant="contained" color="error" size="small"
                disabled={deleteMutation.isPending}
                onClick={() => editTask && deleteMutation.mutate(editTask.id)}
              >
                {deleteMutation.isPending ? <CircularProgress size={16} /> : 'Sim, excluir'}
              </Button>
              <Button size="small" onClick={() => setConfirmDeleteTask(false)}>Não</Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTask(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!editForm.title || updateMutation.isPending}
            onClick={() =>
              editTask && updateMutation.mutate({
                id: editTask.id,
                data: {
                  title: editForm.title,
                  description: editForm.description,
                  priority: editForm.priority,
                  status: editForm.status,
                  due_date: editForm.due_date || null,
                  assignee_id: (editForm.assignee_id || undefined) as unknown as undefined,
                } as Partial<Task>,
              })
            }
          >
            {updateMutation.isPending ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Activity detail dialog ─────────────────────────────────────────── */}
      <Dialog
        open={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        maxWidth="xs"
        fullWidth
      >
        {selectedActivity && (() => {
          const entry = selectedActivity;
          const actionIcon =
            entry.action === 'moved' ? <ArrowForwardIcon color="primary" /> :
            entry.action === 'assigned' ? <PersonAddIcon color="success" /> :
            entry.action === 'unassigned' ? <PersonRemoveIcon color="error" /> :
            <AddTaskIcon color="action" />;

          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {actionIcon}
                {entry.action === 'moved' && 'Tarefa movida'}
                {entry.action === 'assigned' && 'Atribuição'}
                {entry.action === 'unassigned' && 'Atribuição removida'}
                {entry.action === 'created' && 'Tarefa criada'}
              </DialogTitle>
              <DialogContent dividers>
                {/* Task title */}
                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                  {entry.task_title ?? '—'}
                </Typography>

                {/* Actor */}
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                  <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>
                    {entry.actor?.first_name?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {entry.actor?.full_name ?? 'Desconhecido'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">autor da ação</Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Action detail */}
                {entry.action === 'moved' && (
                  <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
                    <Chip label={entry.from_value || '—'} size="small" />
                    <ArrowForwardIcon fontSize="small" color="action" />
                    <Chip label={entry.to_value || '—'} size="small" color="primary" />
                  </Box>
                )}
                {entry.action === 'assigned' && (
                  <Typography variant="body2" mb={2}>
                    Atribuída para <strong>{entry.to_value || 'alguém'}</strong>
                  </Typography>
                )}
                {entry.action === 'unassigned' && (
                  <Typography variant="body2" mb={2}>
                    Atribuição de <strong>{entry.from_value}</strong> removida
                  </Typography>
                )}
                {entry.action === 'created' && (
                  <Typography variant="body2" mb={2}>Tarefa criada neste projeto.</Typography>
                )}

                {/* Timestamps */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {formatExact(entry.created_at)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {relativeTime(entry.created_at)}
                  </Typography>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelectedActivity(null)}>Fechar</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
