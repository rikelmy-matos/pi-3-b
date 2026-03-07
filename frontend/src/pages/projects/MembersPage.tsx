import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { projectsApi, membersApi } from '../../api';
import type { MemberOverview, MemberTaskItem } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const ROLE_LABEL: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Visualizador',
};

const ROLE_COLOR: Record<string, 'warning' | 'info' | 'default' | 'secondary'> = {
  owner: 'warning',
  admin: 'info',
  member: 'default',
  viewer: 'secondary',
};

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

// ── MemberCard ────────────────────────────────────────────────────────────────

function MemberCard({
  member,
  columnNames,
}: {
  member: MemberOverview;
  columnNames: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const initials =
    (member.user.first_name?.[0] ?? '') + (member.user.last_name?.[0] ?? '');

  const statusSlugs = Object.keys(member.status_counts);

  return (
    <Card elevation={2} sx={{ borderRadius: 2, overflow: 'visible' }}>
      <CardContent sx={{ pb: '12px !important' }}>
        {/* ── Top row: avatar + name + role + last activity ── */}
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Avatar
            sx={{ width: 52, height: 52, fontSize: 20, bgcolor: 'primary.main', flexShrink: 0 }}
          >
            {initials.toUpperCase() || '?'}
          </Avatar>

          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {member.user.full_name || member.user.username}
              </Typography>
              <Chip
                label={ROLE_LABEL[member.role] ?? member.role}
                color={ROLE_COLOR[member.role] ?? 'default'}
                size="small"
                sx={{ fontWeight: 600, fontSize: 11 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap>
              {member.user.email}
            </Typography>

            {/* Last activity */}
            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
              <AccessTimeIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                {member.last_activity
                  ? `Última atividade: ${relativeTime(member.last_activity)}`
                  : 'Sem atividade registrada'}
              </Typography>
            </Box>
          </Box>

          {/* Total badge */}
          <Box textAlign="center" flexShrink={0}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: member.total_tasks > 0 ? 'primary.main' : 'action.disabledBackground',
                color: member.total_tasks > 0 ? 'white' : 'text.disabled',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                {member.total_tasks}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
              tarefa(s)
            </Typography>
          </Box>
        </Box>

        {/* ── Status chips ── */}
        {statusSlugs.length > 0 && (
          <Box display="flex" gap={0.75} flexWrap="wrap" mt={2}>
            {statusSlugs.map((slug) => (
              <Chip
                key={slug}
                icon={<AssignmentIcon sx={{ fontSize: '14px !important' }} />}
                label={`${columnNames[slug] ?? slug}: ${member.status_counts[slug]}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11 }}
              />
            ))}
          </Box>
        )}

        {/* ── Expand toggle ── */}
        {member.total_tasks > 0 && (
          <>
            <Divider sx={{ mt: 1.5 }} />
            <Box display="flex" justifyContent="flex-end">
              <Tooltip title={expanded ? 'Ocultar tarefas' : 'Ver tarefas'}>
                <IconButton size="small" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Tooltip>
            </Box>

            <Collapse in={expanded} unmountOnExit>
              {statusSlugs.map((slug) => {
                const items: MemberTaskItem[] = member.tasks_by_status[slug] ?? [];
                if (items.length === 0) return null;
                return (
                  <Box key={slug} mb={1}>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.secondary"
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                    >
                      {columnNames[slug] ?? slug}
                    </Typography>
                    <List dense disablePadding>
                      {items.map((task) => (
                        <ListItem key={task.id} disableGutters sx={{ py: 0.25 }}>
                          <Chip
                            label={PRIORITY_LABEL[task.priority]}
                            color={PRIORITY_COLOR[task.priority]}
                            size="small"
                            sx={{ fontSize: 10, mr: 1, flexShrink: 0 }}
                          />
                          <ListItemText
                            primary={task.title}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                );
              })}
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ['members-overview', projectId],
    queryFn: () => membersApi.overview(projectId!),
    enabled: !!projectId,
  });

  // Build a slug → display name map from the project tasks data
  // We derive column names from the members data itself (status_counts keys)
  // but we also query the columns for proper names.
  const { data: columns } = useQuery({
    queryKey: ['columns', projectId],
    queryFn: () =>
      import('../../api').then((m) => m.columnsApi.list(projectId!)),
    enabled: !!projectId,
  });

  const columnNames: Record<string, string> = {};
  (columns ?? []).forEach((c) => {
    columnNames[c.slug] = c.name;
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" pt={8}>
        <CircularProgress />
      </Box>
    );
  }

  const memberList: MemberOverview[] = members ?? [];

  return (
    <Box>
      {/* ── Header ── */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <Tooltip title="Voltar para o Kanban">
          <IconButton onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Membros do Projeto
          </Typography>
          {project && (
            <Typography variant="body2" color="text.secondary">
              {project.name} — {memberList.length} membro(s)
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Cards grid ── */}
      {memberList.length === 0 ? (
        <Typography color="text.secondary" mt={4} textAlign="center">
          Nenhum membro encontrado.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 2,
          }}
        >
          {memberList.map((m) => (
            <MemberCard key={m.membership_id} member={m} columnNames={columnNames} />
          ))}
        </Box>
      )}
    </Box>
  );
}
