import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Chip, Paper } from '@mui/material';
import { tasksApi } from '../../api';
import type { Task } from '../../types';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4caf50',
  medium: '#2196f3',
  high: '#ff9800',
  critical: '#f44336',
};

export default function CalendarPage() {
  const { data } = useQuery({
    queryKey: ['tasks-calendar'],
    queryFn: () => tasksApi.list().then((r) => r.results),
  });

  const events = (data ?? [])
    .filter((task: Task) => task.due_date)
    .map((task: Task) => ({
      id: task.id,
      title: task.title,
      date: task.due_date as string,
      backgroundColor: PRIORITY_COLORS[task.priority],
      borderColor: PRIORITY_COLORS[task.priority],
      extendedProps: { task },
    }));

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Calendário de Tarefas
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Visualize os prazos de todas as suas tarefas.
      </Typography>

      {/* Legend */}
      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
        {Object.entries(PRIORITY_COLORS).map(([priority, color]) => (
          <Chip
            key={priority}
            size="small"
            label={{ low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' }[priority]}
            sx={{ bgcolor: color, color: 'white', fontWeight: 600 }}
          />
        ))}
      </Box>

      <Paper sx={{ p: 2 }}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          events={events}
          height="auto"
          eventDisplay="block"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek',
          }}
        />
      </Paper>
    </Box>
  );
}
