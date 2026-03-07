import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { projectsApi, tasksApi } from '../../api';
import type { Task, TaskStatus } from '../../types';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'A Fazer', color: '#1976d2' },
  { id: 'in_progress', label: 'Em Andamento', color: '#ed6c02' },
  { id: 'done', label: 'Concluído', color: '#2e7d32' },
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

interface NewTaskForm {
  title: string;
  description: string;
  priority: string;
  due_date: string;
  assignee_id: string;
}

function TaskCard({ task, index }: { task: Task; index: number }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          elevation={snapshot.isDragging ? 6 : 1}
          sx={{ mb: 1, cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
        >
          <CardContent sx={{ p: '12px !important' }}>
            <Typography variant="body2" fontWeight={600} mb={1}>
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
                sx={{ fontSize: 10 }}
              />
              <Box display="flex" alignItems="center" gap={0.5}>
                {task.due_date && (
                  <Typography variant="caption" color="text.secondary">
                    {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </Typography>
                )}
                {task.assignee && (
                  <Tooltip title={task.assignee.full_name}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: 11 }}>
                      {task.assignee.first_name?.[0]?.toUpperCase()}
                    </Avatar>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}

export default function KanbanBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState<NewTaskForm>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assignee_id: '',
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () =>
      tasksApi.list({ project: projectId! }).then((r) => r.results),
    enabled: !!projectId,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: TaskStatus; position: number }) =>
      tasksApi.move(id, status, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  const createMutation = useMutation({
    mutationFn: (taskData: Partial<Task>) => tasksApi.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setDialogOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '', assignee_id: '' });
    },
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !data) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as TaskStatus;
    moveMutation.mutate({ id: draggableId, status: newStatus, position: destination.index });
  };

  const tasksByStatus = (status: TaskStatus) =>
    (data ?? []).filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" pt={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          {project?.name ?? 'Kanban'}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nova Tarefa
        </Button>
      </Box>

      <DragDropContext onDragEnd={onDragEnd}>
        <Box display="flex" gap={2} overflow="auto" pb={2}>
          {COLUMNS.map((col) => (
            <Box
              key={col.id}
              sx={{ minWidth: 280, flex: '0 0 280px' }}
            >
              <Box
                sx={{
                  bgcolor: col.color,
                  color: 'white',
                  p: '8px 12px',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {col.label}
                </Typography>
                <Chip
                  label={tasksByStatus(col.id).length}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700 }}
                />
              </Box>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 400,
                      bgcolor: snapshot.isDraggingOver ? '#e3f2fd' : '#f5f5f5',
                      p: 1,
                      borderRadius: '0 0 8px 8px',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    {tasksByStatus(col.id).map((task, index) => (
                      <TaskCard key={task.id} task={task} index={index} />
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Box>
          ))}
        </Box>
      </DragDropContext>

      {/* New Task Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Tarefa</DialogTitle>
        <DialogContent>
          <TextField
            label="Título" fullWidth required autoFocus sx={{ mt: 1, mb: 2 }}
            value={newTask.title}
            onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
          />
          <TextField
            label="Descrição" fullWidth multiline rows={3} sx={{ mb: 2 }}
            value={newTask.description}
            onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
          />
          <Box display="flex" gap={2} mb={2}>
            <TextField
              select label="Prioridade" fullWidth
              value={newTask.priority}
              onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))}
            >
              <MenuItem value="low">Baixa</MenuItem>
              <MenuItem value="medium">Média</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
              <MenuItem value="critical">Crítica</MenuItem>
            </TextField>
            <TextField
              label="Prazo" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={newTask.due_date}
              onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))}
            />
          </Box>
          {project?.members && (
            <TextField
              select label="Responsável" fullWidth
              value={newTask.assignee_id}
              onChange={(e) => setNewTask((p) => ({ ...p, assignee_id: e.target.value }))}
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
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!newTask.title || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                project: projectId,
                title: newTask.title,
                description: newTask.description,
                priority: newTask.priority as Task['priority'],
                due_date: newTask.due_date || undefined,
                assignee_id: newTask.assignee_id || undefined,
              } as unknown as Partial<Task>)
            }
          >
            {createMutation.isPending ? <CircularProgress size={20} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
