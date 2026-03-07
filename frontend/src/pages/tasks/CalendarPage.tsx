import { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Divider,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import CommentIcon from '@mui/icons-material/Comment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { tasksApi } from '../../api';
import type { Task } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  low: '#4caf50',
  medium: '#2196f3',
  high: '#ff9800',
  critical: '#f44336',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const PRIORITY_MUI: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  const due = new Date(task.due_date);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Custom event render ───────────────────────────────────────────────────────

function EventContent({ info }: { info: EventContentArg }) {
  const task: Task = info.event.extendedProps.task;
  const overdue = isOverdue(task);
  return (
    <Box
      sx={{
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        width: '100%',
        bgcolor: overdue ? '#b71c1c' : PRIORITY_COLOR[task.priority],
        opacity: task.status === 'done' ? 0.55 : 1,
      }}
    >
      {overdue && <WarningAmberIcon sx={{ fontSize: 12, color: 'white', flexShrink: 0 }} />}
      <Typography
        variant="caption"
        noWrap
        sx={{
          color: 'white',
          fontWeight: 600,
          fontSize: '0.7rem',
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
        }}
      >
        {info.event.title}
      </Typography>
      {task.assignee && (
        <Tooltip title={task.assignee.full_name} disableInteractive>
          <Avatar sx={{ width: 14, height: 14, fontSize: 8, flexShrink: 0, ml: 'auto' }}>
            {task.assignee.first_name?.[0]?.toUpperCase()}
          </Avatar>
        </Tooltip>
      )}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data } = useQuery({
    queryKey: ['tasks-calendar'],
    queryFn: () => tasksApi.list().then((r) => r.results),
  });

  const tasks = data ?? [];

  const events = tasks
    .filter((t) => t.due_date)
    .map((task) => ({
      id: task.id,
      title: task.title,
      date: task.due_date as string,
      backgroundColor: isOverdue(task) ? '#b71c1c' : PRIORITY_COLOR[task.priority],
      borderColor: 'transparent',
      textColor: 'white',
      extendedProps: { task },
    }));

  const handleEventClick = (arg: EventClickArg) => {
    setSelectedTask(arg.event.extendedProps.task as Task);
  };

  // ── Upcoming tasks (next 30 days, not done, sorted by due_date) ───────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);

  const upcoming = tasks
    .filter((t) => {
      if (!t.due_date || t.status === 'done') return false;
      const d = new Date(t.due_date);
      return d >= today && d <= in30;
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 10);

  const overdueTasks = tasks.filter(
    (t) => t.due_date && t.status !== 'done' && isOverdue(t)
  );

  return (
    <Box>
      {/* ── Page header ── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Calendário de Tarefas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Prazos de todas as tarefas dos seus projetos.
          </Typography>
        </Box>

        {/* Priority legend */}
        <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
          {Object.entries(PRIORITY_COLOR).map(([p, c]) => (
            <Chip
              key={p}
              size="small"
              label={PRIORITY_LABEL[p]}
              sx={{ bgcolor: c, color: 'white', fontWeight: 600, fontSize: 11 }}
            />
          ))}
          <Chip
            size="small"
            label="Atrasada"
            sx={{ bgcolor: '#b71c1c', color: 'white', fontWeight: 600, fontSize: 11 }}
          />
        </Box>
      </Box>

      <Box display="flex" gap={2} alignItems="flex-start">
        {/* ── Calendar ── */}
        <Paper sx={{ p: 2, flex: 1, minWidth: 0 }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={ptBrLocale}
            events={events}
            height="auto"
            eventDisplay="block"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek,listMonth',
            }}
            buttonText={{ listMonth: 'Agenda' }}
            eventClick={handleEventClick}
            eventContent={(info) => <EventContent info={info} />}
            dayMaxEvents={4}
            eventTimeFormat={{ hour: undefined, minute: undefined, omitZeroMinute: true }}
            dayCellClassNames={(arg) => {
              const d = new Date(arg.date);
              d.setHours(0, 0, 0, 0);
              return d.getTime() === today.getTime() ? ['fc-today-highlight'] : [];
            }}
          />
        </Paper>

        {/* ── Sidebar ── */}
        <Box sx={{ width: 280, flexShrink: 0 }}>
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <Paper sx={{ p: 2, mb: 2, borderLeft: '4px solid #b71c1c' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WarningAmberIcon sx={{ color: '#b71c1c', fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={700} color="error.dark">
                  Atrasadas ({overdueTasks.length})
                </Typography>
              </Box>
              <List dense disablePadding>
                {overdueTasks.slice(0, 5).map((t) => (
                  <ListItem
                    key={t.id}
                    disableGutters
                    sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' }, px: 0.5 }}
                    onClick={() => setSelectedTask(t)}
                  >
                    <ListItemAvatar sx={{ minWidth: 32 }}>
                      <Box
                        sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: PRIORITY_COLOR[t.priority], mt: 0.5,
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={t.title}
                      secondary={t.due_date ? formatDate(t.due_date) : ''}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
                {overdueTasks.length > 5 && (
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                    +{overdueTasks.length - 5} mais…
                  </Typography>
                )}
              </List>
            </Paper>
          )}

          {/* Upcoming */}
          <Paper sx={{ p: 2, borderLeft: '4px solid #1976d2' }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <CalendarTodayIcon sx={{ color: 'primary.main', fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Próximos 30 dias
              </Typography>
            </Box>
            {upcoming.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                Nenhuma tarefa com prazo nos próximos 30 dias.
              </Typography>
            ) : (
              <List dense disablePadding>
                {upcoming.map((t) => (
                  <ListItem
                    key={t.id}
                    disableGutters
                    sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' }, px: 0.5 }}
                    onClick={() => setSelectedTask(t)}
                  >
                    <ListItemAvatar sx={{ minWidth: 32 }}>
                      <Box
                        sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: PRIORITY_COLOR[t.priority], mt: 0.5,
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={t.title}
                      secondary={t.due_date ? formatDate(t.due_date) : ''}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>

      {/* ── Task detail dialog ── */}
      <Dialog
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedTask && (
          <>
            <DialogTitle sx={{ pr: 6 }}>
              <Box display="flex" alignItems="flex-start" gap={1}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: isOverdue(selectedTask) ? '#b71c1c' : PRIORITY_COLOR[selectedTask.priority],
                    flexShrink: 0,
                    mt: 0.75,
                  }}
                />
                <Typography variant="h6" fontWeight={700} lineHeight={1.3}>
                  {selectedTask.title}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => setSelectedTask(null)}
                sx={{ position: 'absolute', top: 12, right: 12 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers>
              {/* Chips row */}
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip
                  label={PRIORITY_LABEL[selectedTask.priority]}
                  color={PRIORITY_MUI[selectedTask.priority]}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                {isOverdue(selectedTask) && (
                  <Chip
                    icon={<WarningAmberIcon />}
                    label="Atrasada"
                    color="error"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
                {selectedTask.status === 'done' && (
                  <Chip label="Concluída" color="success" size="small" sx={{ fontWeight: 600 }} />
                )}
              </Box>

              {/* Description */}
              {selectedTask.description && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                    {selectedTask.description}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </>
              )}

              {/* Meta grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                {/* Project */}
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <FolderIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Projeto</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedTask.project_name ?? '—'}
                    </Typography>
                  </Box>
                </Box>

                {/* Due date */}
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <CalendarTodayIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Prazo</Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={isOverdue(selectedTask) ? 'error.main' : 'text.primary'}
                    >
                      {selectedTask.due_date ? formatDate(selectedTask.due_date) : '—'}
                    </Typography>
                  </Box>
                </Box>

                {/* Assignee */}
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <PersonIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Responsável</Typography>
                    {selectedTask.assignee ? (
                      <Box display="flex" alignItems="center" gap={0.75}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: 11 }}>
                          {selectedTask.assignee.first_name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>
                          {selectedTask.assignee.full_name}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled">Nenhum</Typography>
                    )}
                  </Box>
                </Box>

                {/* Comments */}
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <CommentIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Comentários</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedTask.comment_count ?? 0}
                    </Typography>
                  </Box>
                </Box>

                {/* Status */}
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Badge color="primary" variant="dot" sx={{ mt: 0.5 }}>
                    <Box sx={{ width: 18, height: 18 }} />
                  </Badge>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Coluna</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedTask.status}
                    </Typography>
                  </Box>
                </Box>

                {/* Created at */}
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <CalendarTodayIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Criada em</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatDate(selectedTask.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setSelectedTask(null)}>Fechar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
