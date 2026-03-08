import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  CircularProgress,
  Skeleton,
  Avatar,
  Stack,
  Paper,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import GroupIcon from '@mui/icons-material/Group';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FlagIcon from '@mui/icons-material/Flag';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import PeopleIcon from '@mui/icons-material/People';
import { projectsApi, authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import type {
  Project,
  ProjectBudget,
  ProjectTechStack,
  ProjectObjective,
  ProjectRisk,
  ProjectMilestone,
  TechCategory,
  RiskLevel,
  RiskStatus,
  MilestoneStatus,
  BudgetCurrency,
  ProjectMember,
  MemberRole,
} from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  archived: 'Arquivado',
};

const STATUS_BANNER_GRADIENT: Record<string, string> = {
  active: 'linear-gradient(135deg, #6C63FF 0%, #4B44CC 100%)',
  paused: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  completed: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
  archived: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
};

const TECH_CATEGORY_LABEL: Record<TechCategory, string> = {
  backend: 'Backend',
  frontend: 'Frontend',
  database: 'Banco de Dados',
  infra: 'Infraestrutura',
  mobile: 'Mobile',
  other: 'Outro',
};

const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};
const RISK_LEVEL_COLOR: Record<RiskLevel, 'success' | 'warning' | 'error'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
};

const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  open: 'Aberto',
  mitigated: 'Mitigado',
  closed: 'Fechado',
};
const RISK_STATUS_COLOR: Record<RiskStatus, 'error' | 'warning' | 'success'> = {
  open: 'error',
  mitigated: 'warning',
  closed: 'success',
};

const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  planned: 'Planejado',
  in_progress: 'Em Andamento',
  done: 'Concluído',
};
const MILESTONE_STATUS_COLOR: Record<MilestoneStatus, 'default' | 'warning' | 'success'> = {
  planned: 'default',
  in_progress: 'warning',
  done: 'success',
};

const CURRENCY_SYMBOL: Record<BudgetCurrency, string> = {
  BRL: 'R$',
  USD: '$',
  EUR: '€',
};

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Dono',
  admin: 'Admin',
  member: 'Membro',
  viewer: 'Visualizador',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(value: string | null | undefined, symbol: string) {
  if (!value) return '—';
  return `${symbol} ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// ── Tab panel wrapper ─────────────────────────────────────────────────────────

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <Box pt={3}>{children}</Box> : null;
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 0 — Visão Geral
// ══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ project }: { project: Project }) {
  const openRisks = (project.risks ?? []).filter((r) => r.status === 'open').length;
  const milestones = project.milestones ?? [];
  const doneMilestones = milestones.filter((m) => m.status === 'done').length;
  const achievedObjs = (project.objectives ?? []).filter((o) => o.is_achieved).length;
  const totalObjs = (project.objectives ?? []).length;

  return (
    <Box>
      {project.description && (
        <Typography variant="body1" color="text.secondary" mb={3} lineHeight={1.7}>
          {project.description}
        </Typography>
      )}

      {/* Stat cards */}
      <Grid container spacing={2} mb={3}>
        {[
          {
            icon: <TaskAltIcon sx={{ color: '#6C63FF' }} />,
            label: 'Tarefas',
            value: project.task_count,
            bg: 'rgba(108,99,255,0.08)',
          },
          {
            icon: <GroupIcon sx={{ color: '#EC4899' }} />,
            label: 'Membros',
            value: project.members.length,
            bg: 'rgba(236,72,153,0.08)',
          },
          {
            icon: <WarningAmberIcon sx={{ color: '#EF4444' }} />,
            label: 'Riscos Abertos',
            value: openRisks,
            bg: 'rgba(239,68,68,0.08)',
          },
          {
            icon: <FlagIcon sx={{ color: '#22C55E' }} />,
            label: 'Marcos Concluídos',
            value: `${doneMilestones} / ${milestones.length}`,
            bg: 'rgba(34,197,94,0.08)',
          },
        ].map((stat) => (
          <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
            <Card elevation={0} sx={{ boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '14px !important' }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: stat.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={800} lineHeight={1}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Details */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
              Informações
            </Typography>
            <Stack spacing={0.75}>
              <Typography variant="body2">
                <strong>Dono:</strong> {project.owner.full_name || project.owner.username}
              </Typography>
              <Typography variant="body2">
                <strong>Início:</strong>{' '}
                {project.start_date
                  ? new Date(project.start_date).toLocaleDateString('pt-BR')
                  : '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Prazo:</strong>{' '}
                {project.due_date
                  ? new Date(project.due_date).toLocaleDateString('pt-BR')
                  : '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Criado em:</strong>{' '}
                {new Date(project.created_at).toLocaleDateString('pt-BR')}
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        {totalObjs > 0 && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                Progresso dos Objetivos
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <LinearProgress
                  variant="determinate"
                  value={totalObjs > 0 ? (achievedObjs / totalObjs) * 100 : 0}
                  sx={{ flex: 1, height: 10, borderRadius: 5 }}
                />
                <Typography variant="caption" fontWeight={700}>
                  {achievedObjs}/{totalObjs}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1 — Orçamento
// ══════════════════════════════════════════════════════════════════════════════

function BudgetTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const { showToast } = useSnackbar();
  const { data: budget, isLoading, isError } = useQuery({
    queryKey: ['project-budget', projectId],
    queryFn: () => projectsApi.getBudget(projectId).catch(() => null),
  });

  const [form, setForm] = useState<{
    currency: BudgetCurrency;
    estimated_cost: string;
    actual_cost: string;
    notes: string;
  }>({ currency: 'BRL', estimated_cost: '', actual_cost: '', notes: '' });

  const [editing, setEditing] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: Partial<ProjectBudget>) => projectsApi.upsertBudget(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-budget', projectId] });
      setEditing(false);
      showToast('Orçamento salvo com sucesso.');
    },
    onError: () => showToast('Erro ao salvar orçamento.', 'error'),
  });

  const startEdit = () => {
    setForm({
      currency: budget?.currency ?? 'BRL',
      estimated_cost: budget?.estimated_cost ?? '',
      actual_cost: budget?.actual_cost ?? '',
      notes: budget?.notes ?? '',
    });
    setEditing(true);
  };

  if (isLoading) return <Skeleton height={200} />;
  if (isError) return <Alert severity="error">Erro ao carregar orçamento.</Alert>;

  const symbol = CURRENCY_SYMBOL[budget?.currency ?? 'BRL'];
  const est = parseFloat(budget?.estimated_cost ?? '0') || 0;
  const act = parseFloat(budget?.actual_cost ?? '0') || 0;
  const pct = est > 0 ? Math.min((act / est) * 100, 100) : 0;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Orçamento do Projeto
        </Typography>
        {canManage && (
          <Button startIcon={<EditIcon />} onClick={startEdit} variant="outlined" size="small">
            {budget ? 'Editar' : 'Definir Orçamento'}
          </Button>
        )}
      </Box>

      {budget ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Moeda
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {budget.currency}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Custo Estimado
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {fmtCurrency(budget.estimated_cost, symbol)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Custo Real
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {fmtCurrency(budget.actual_cost, symbol)}
              </Typography>
            </Paper>
          </Grid>

          {est > 0 && act > 0 && (
            <Grid size={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  Utilização do Orçamento ({pct.toFixed(0)}%)
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  color={pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'primary'}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Paper>
            </Grid>
          )}

          {budget.notes && (
            <Grid size={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={0.5}>
                  Observações
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {budget.notes}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      ) : (
        <Typography color="text.secondary">Nenhum orçamento definido.</Typography>
      )}

      {/* Edit dialog */}
      <Dialog open={editing} onClose={() => setEditing(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Orçamento</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Moeda"
            fullWidth
            sx={{ mt: 1, mb: 2 }}
            value={form.currency}
            onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value as BudgetCurrency }))}
          >
            <MenuItem value="BRL">BRL (R$)</MenuItem>
            <MenuItem value="USD">USD ($)</MenuItem>
            <MenuItem value="EUR">EUR (€)</MenuItem>
          </TextField>
          <TextField
            label="Custo Estimado"
            type="number"
            fullWidth
            sx={{ mb: 2 }}
            value={form.estimated_cost}
            onChange={(e) => setForm((p) => ({ ...p, estimated_cost: e.target.value }))}
            inputProps={{ min: 0, step: '0.01' }}
          />
          <TextField
            label="Custo Real"
            type="number"
            fullWidth
            sx={{ mb: 2 }}
            value={form.actual_cost}
            onChange={(e) => setForm((p) => ({ ...p, actual_cost: e.target.value }))}
            inputProps={{ min: 0, step: '0.01' }}
          />
          <TextField
            label="Observações"
            fullWidth
            multiline
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(false)}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({
                currency: form.currency,
                estimated_cost: form.estimated_cost || null,
                actual_cost: form.actual_cost || null,
                notes: form.notes,
              })
            }
          >
            {mutation.isPending ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2 — Equipe
// ══════════════════════════════════════════════════════════════════════════════

function TeamTab({
  project,
  canManage,
}: {
  project: Project;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const { showToast } = useSnackbar();
  const [editMember, setEditMember] = useState<ProjectMember | null>(null);
  const [memberForm, setMemberForm] = useState({ specialty: '', hourly_rate: '', role: 'member' as MemberRole });

  const [addOpen, setAddOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; full_name: string; email: string }[]>([]);

  const updateMutation = useMutation({
    mutationFn: (data: { specialty: string; hourly_rate: string; role: MemberRole }) =>
      projectsApi.updateMember(project.id, editMember!.user.id, {
        specialty: data.specialty,
        hourly_rate: data.hourly_rate || null,
        role: data.role,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', project.id] });
      setEditMember(null);
      showToast('Membro atualizado.');
    },
    onError: () => showToast('Erro ao atualizar membro.', 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => projectsApi.removeMember(project.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', project.id] });
      showToast('Membro removido.', 'info');
    },
    onError: () => showToast('Erro ao remover membro.', 'error'),
  });

  const addMutation = useMutation({
    mutationFn: (userId: number) => projectsApi.addMember(project.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', project.id] });
      setAddOpen(false);
      setSearchEmail('');
      setSearchResults([]);
      showToast('Membro adicionado ao projeto.');
    },
    onError: () => showToast('Erro ao adicionar membro.', 'error'),
  });

  const handleSearch = async () => {
    const users = await authApi.listUsers(searchEmail).catch(() => []);
    setSearchResults(users.map((u) => ({ id: u.id, full_name: u.full_name, email: u.email })));
  };

  const openEdit = (m: ProjectMember) => {
    setEditMember(m);
    setMemberForm({
      specialty: m.specialty ?? '',
      hourly_rate: m.hourly_rate ?? '',
      role: m.role,
    });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Equipe ({project.members.length})
        </Typography>
        {canManage && (
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => setAddOpen(true)}>
            Adicionar Membro
          </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        {project.members.map((m) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={m.id}>
            <Card elevation={1}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                    {(m.user.full_name || m.user.username)[0].toUpperCase()}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="subtitle2" noWrap fontWeight={600}>
                      {m.user.full_name || m.user.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {m.user.email}
                    </Typography>
                  </Box>
                  {canManage && m.role !== 'owner' && (
                    <Box display="flex" gap={0.5}>
                      <IconButton size="small" onClick={() => openEdit(m)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeMutation.mutate(m.user.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                  <Chip label={ROLE_LABEL[m.role]} size="small" color="primary" variant="outlined" />
                  {m.specialty && <Chip label={m.specialty} size="small" variant="outlined" />}
                  {m.hourly_rate && (
                    <Chip
                      label={`R$ ${parseFloat(m.hourly_rate).toFixed(2)}/h`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit member dialog */}
      <Dialog open={!!editMember} onClose={() => setEditMember(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar Membro</DialogTitle>
        <DialogContent>
          <TextField
            label="Especialidade"
            fullWidth
            sx={{ mt: 1, mb: 2 }}
            value={memberForm.specialty}
            onChange={(e) => setMemberForm((p) => ({ ...p, specialty: e.target.value }))}
          />
          <TextField
            label="Taxa Horária (R$/h)"
            type="number"
            fullWidth
            sx={{ mb: 2 }}
            value={memberForm.hourly_rate}
            onChange={(e) => setMemberForm((p) => ({ ...p, hourly_rate: e.target.value }))}
            inputProps={{ min: 0, step: '0.01' }}
          />
          <TextField
            select
            label="Papel"
            fullWidth
            value={memberForm.role}
            onChange={(e) => setMemberForm((p) => ({ ...p, role: e.target.value as MemberRole }))}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="member">Membro</MenuItem>
            <MenuItem value="viewer">Visualizador</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMember(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate(memberForm)}
          >
            {updateMutation.isPending ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add member dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Adicionar Membro</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={1} mt={1} mb={2}>
            <TextField
              label="Buscar por e-mail"
              fullWidth
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="outlined" onClick={handleSearch}>
              Buscar
            </Button>
          </Box>
          {searchResults.map((u) => (
            <Box
              key={u.id}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              py={1}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {u.full_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {u.email}
                </Typography>
              </Box>
              <Button size="small" onClick={() => addMutation.mutate(u.id)}>
                Adicionar
              </Button>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 3 — Arquitetura (Tech Stack)
// ══════════════════════════════════════════════════════════════════════════════

const TECH_CATEGORIES: TechCategory[] = ['backend', 'frontend', 'database', 'infra', 'mobile', 'other'];

function TechStackTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const { showToast } = useSnackbar();
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['project-tech', projectId],
    queryFn: () => projectsApi.listTechStack(projectId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTechStack | null>(null);
  const [form, setForm] = useState({ name: '', version: '', category: 'other' as TechCategory, notes: '' });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', version: '', category: 'other', notes: '' });
    setDialogOpen(true);
  };
  const openEdit = (item: ProjectTechStack) => {
    setEditing(item);
    setForm({ name: item.name, version: item.version, category: item.category, notes: item.notes });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) =>
      editing
        ? projectsApi.updateTech(projectId, editing.id, data)
        : projectsApi.addTech(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tech', projectId] });
      setDialogOpen(false);
      showToast(editing ? 'Tecnologia atualizada.' : 'Tecnologia adicionada.');
    },
    onError: () => showToast('Erro ao salvar tecnologia.', 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => projectsApi.removeTech(projectId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tech', projectId] });
      showToast('Tecnologia removida.', 'info');
    },
    onError: () => showToast('Erro ao remover tecnologia.', 'error'),
  });

  if (isLoading) return <Skeleton height={200} />;
  if (isError) return <Alert severity="error">Erro ao carregar stack tecnológica.</Alert>;

  const grouped = TECH_CATEGORIES.reduce<Record<TechCategory, ProjectTechStack[]>>(
    (acc, cat) => ({ ...acc, [cat]: items.filter((i) => i.category === cat) }),
    {} as Record<TechCategory, ProjectTechStack[]>,
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Stack Tecnológica
        </Typography>
        {canManage && (
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={openAdd}>
            Adicionar
          </Button>
        )}
      </Box>

      {items.length === 0 && (
        <Typography color="text.secondary">Nenhuma tecnologia cadastrada.</Typography>
      )}

      {TECH_CATEGORIES.filter((cat) => grouped[cat].length > 0).map((cat) => (
        <Box key={cat} mb={2}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>
            {TECH_CATEGORY_LABEL[cat]}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {grouped[cat].map((item) => (
              <Chip
                key={item.id}
                label={item.version ? `${item.name} ${item.version}` : item.name}
                variant="outlined"
                onDelete={canManage ? () => removeMutation.mutate(item.id) : undefined}
                onClick={canManage ? () => openEdit(item) : undefined}
                sx={{ cursor: canManage ? 'pointer' : 'default' }}
              />
            ))}
          </Stack>
        </Box>
      ))}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Editar Tecnologia' : 'Adicionar Tecnologia'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            fullWidth
            required
            sx={{ mt: 1, mb: 2 }}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <TextField
            label="Versão"
            fullWidth
            sx={{ mb: 2 }}
            value={form.version}
            onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
          />
          <TextField
            select
            label="Categoria"
            fullWidth
            sx={{ mb: 2 }}
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as TechCategory }))}
          >
            {TECH_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {TECH_CATEGORY_LABEL[c]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Observações"
            fullWidth
            multiline
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.name || saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 4 — Objetivos
// ══════════════════════════════════════════════════════════════════════════════

function ObjectivesTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const { showToast } = useSnackbar();
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['project-objectives', projectId],
    queryFn: () => projectsApi.listObjectives(projectId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectObjective | null>(null);
  const [form, setForm] = useState({ title: '', description: '', is_achieved: false });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', description: '', is_achieved: false });
    setDialogOpen(true);
  };
  const openEdit = (item: ProjectObjective) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description, is_achieved: item.is_achieved });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) =>
      editing
        ? projectsApi.updateObjective(projectId, editing.id, data)
        : projectsApi.addObjective(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-objectives', projectId] });
      setDialogOpen(false);
      showToast(editing ? 'Objetivo atualizado.' : 'Objetivo adicionado.');
    },
    onError: () => showToast('Erro ao salvar objetivo.', 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_achieved }: { id: string; is_achieved: boolean }) =>
      projectsApi.updateObjective(projectId, id, { is_achieved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-objectives', projectId] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => projectsApi.removeObjective(projectId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-objectives', projectId] });
      showToast('Objetivo removido.', 'info');
    },
    onError: () => showToast('Erro ao remover objetivo.', 'error'),
  });

  if (isLoading) return <Skeleton height={200} />;
  if (isError) return <Alert severity="error">Erro ao carregar objetivos.</Alert>;

  const achieved = items.filter((o) => o.is_achieved).length;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Typography variant="h6" fontWeight={600}>
            Objetivos
          </Typography>
          {items.length > 0 && (
            <Chip
              label={`${achieved}/${items.length} concluídos`}
              size="small"
              color={achieved === items.length ? 'success' : 'default'}
            />
          )}
        </Box>
        {canManage && (
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={openAdd}>
            Adicionar
          </Button>
        )}
      </Box>

      {items.length === 0 && (
        <Typography color="text.secondary">Nenhum objetivo cadastrado.</Typography>
      )}

      <Stack spacing={1}>
        {items.map((obj) => (
          <Paper
            key={obj.id}
            variant="outlined"
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              opacity: obj.is_achieved ? 0.7 : 1,
            }}
          >
            <Checkbox
              checked={obj.is_achieved}
              onChange={() => toggleMutation.mutate({ id: obj.id, is_achieved: !obj.is_achieved })}
              size="small"
              sx={{ mt: -0.5 }}
            />
            <Box flex={1}>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ textDecoration: obj.is_achieved ? 'line-through' : 'none' }}
              >
                {obj.title}
              </Typography>
              {obj.description && (
                <Typography variant="caption" color="text.secondary">
                  {obj.description}
                </Typography>
              )}
            </Box>
            <Box display="flex" gap={0.5}>
              {canManage && (
                <>
                  <IconButton size="small" onClick={() => openEdit(obj)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => removeMutation.mutate(obj.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          </Paper>
        ))}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Editar Objetivo' : 'Adicionar Objetivo'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Título"
            fullWidth
            required
            sx={{ mt: 1, mb: 2 }}
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <TextField
            label="Descrição"
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 2 }}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.is_achieved}
                onChange={(e) => setForm((p) => ({ ...p, is_achieved: e.target.checked }))}
              />
            }
            label="Já alcançado"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.title || saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 5 — Riscos
// ══════════════════════════════════════════════════════════════════════════════

function RisksTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const { showToast } = useSnackbar();
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['project-risks', projectId],
    queryFn: () => projectsApi.listRisks(projectId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRisk | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    probability: 'medium' as RiskLevel,
    impact: 'medium' as RiskLevel,
    mitigation: '',
    status: 'open' as RiskStatus,
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', description: '', probability: 'medium', impact: 'medium', mitigation: '', status: 'open' });
    setDialogOpen(true);
  };
  const openEdit = (item: ProjectRisk) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      probability: item.probability,
      impact: item.impact,
      mitigation: item.mitigation,
      status: item.status,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) =>
      editing
        ? projectsApi.updateRisk(projectId, editing.id, data)
        : projectsApi.addRisk(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-risks', projectId] });
      setDialogOpen(false);
      showToast(editing ? 'Risco atualizado.' : 'Risco adicionado.');
    },
    onError: () => showToast('Erro ao salvar risco.', 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => projectsApi.removeRisk(projectId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-risks', projectId] });
      showToast('Risco removido.', 'info');
    },
    onError: () => showToast('Erro ao remover risco.', 'error'),
  });

  if (isLoading) return <Skeleton height={200} />;
  if (isError) return <Alert severity="error">Erro ao carregar riscos.</Alert>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Riscos
        </Typography>
        {canManage && (
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={openAdd}>
            Adicionar
          </Button>
        )}
      </Box>

      {items.length === 0 && (
        <Typography color="text.secondary">Nenhum risco cadastrado.</Typography>
      )}

      <Stack spacing={1.5}>
        {items.map((risk) => (
          <Paper key={risk.id} variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                  <Typography variant="subtitle2" fontWeight={600}>
                    {risk.title}
                  </Typography>
                  <Chip
                    label={RISK_STATUS_LABEL[risk.status]}
                    size="small"
                    color={RISK_STATUS_COLOR[risk.status]}
                  />
                </Box>
                {risk.description && (
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    {risk.description}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                  <Chip
                    label={`Prob: ${RISK_LEVEL_LABEL[risk.probability]}`}
                    size="small"
                    color={RISK_LEVEL_COLOR[risk.probability]}
                    variant="outlined"
                  />
                  <Chip
                    label={`Impacto: ${RISK_LEVEL_LABEL[risk.impact]}`}
                    size="small"
                    color={RISK_LEVEL_COLOR[risk.impact]}
                    variant="outlined"
                  />
                </Stack>
                {risk.mitigation && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    <strong>Mitigação:</strong> {risk.mitigation}
                  </Typography>
                )}
              </Box>
              <Box display="flex" gap={0.5} ml={1}>
                {canManage && (
                  <>
                    <IconButton size="small" onClick={() => openEdit(risk)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => removeMutation.mutate(risk.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Risco' : 'Adicionar Risco'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Título"
            fullWidth
            required
            sx={{ mt: 1, mb: 2 }}
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <TextField
            label="Descrição"
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 2 }}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Box display="flex" gap={2} mb={2}>
            <TextField
              select
              label="Probabilidade"
              fullWidth
              value={form.probability}
              onChange={(e) => setForm((p) => ({ ...p, probability: e.target.value as RiskLevel }))}
            >
              <MenuItem value="low">Baixa</MenuItem>
              <MenuItem value="medium">Média</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
            </TextField>
            <TextField
              select
              label="Impacto"
              fullWidth
              value={form.impact}
              onChange={(e) => setForm((p) => ({ ...p, impact: e.target.value as RiskLevel }))}
            >
              <MenuItem value="low">Baixo</MenuItem>
              <MenuItem value="medium">Médio</MenuItem>
              <MenuItem value="high">Alto</MenuItem>
            </TextField>
          </Box>
          <TextField
            select
            label="Status"
            fullWidth
            sx={{ mb: 2 }}
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as RiskStatus }))}
          >
            <MenuItem value="open">Aberto</MenuItem>
            <MenuItem value="mitigated">Mitigado</MenuItem>
            <MenuItem value="closed">Fechado</MenuItem>
          </TextField>
          <TextField
            label="Plano de Mitigação"
            fullWidth
            multiline
            rows={2}
            value={form.mitigation}
            onChange={(e) => setForm((p) => ({ ...p, mitigation: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.title || saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 6 — Marcos (Milestones)
// ══════════════════════════════════════════════════════════════════════════════

function MilestonesTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const { showToast } = useSnackbar();
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: () => projectsApi.listMilestones(projectId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestone | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    completion_pct: 0,
    status: 'planned' as MilestoneStatus,
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', description: '', due_date: '', completion_pct: 0, status: 'planned' });
    setDialogOpen(true);
  };
  const openEdit = (item: ProjectMilestone) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      due_date: item.due_date ?? '',
      completion_pct: item.completion_pct,
      status: item.status,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) =>
      editing
        ? projectsApi.updateMilestone(projectId, editing.id, {
            ...data,
            due_date: data.due_date || null,
          })
        : projectsApi.addMilestone(projectId, {
            ...data,
            due_date: data.due_date || null,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-milestones', projectId] });
      setDialogOpen(false);
      showToast(editing ? 'Marco atualizado.' : 'Marco adicionado.');
    },
    onError: () => showToast('Erro ao salvar marco.', 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => projectsApi.removeMilestone(projectId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-milestones', projectId] });
      showToast('Marco removido.', 'info');
    },
    onError: () => showToast('Erro ao remover marco.', 'error'),
  });

  if (isLoading) return <Skeleton height={200} />;
  if (isError) return <Alert severity="error">Erro ao carregar marcos.</Alert>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Marcos
        </Typography>
        {canManage && (
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={openAdd}>
            Adicionar
          </Button>
        )}
      </Box>

      {items.length === 0 && (
        <Typography color="text.secondary">Nenhum marco cadastrado.</Typography>
      )}

      <Stack spacing={1.5}>
        {items.map((ms) => (
          <Paper key={ms.id} variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                  <Typography variant="subtitle2" fontWeight={600}>
                    {ms.title}
                  </Typography>
                  <Chip
                    label={MILESTONE_STATUS_LABEL[ms.status]}
                    size="small"
                    color={MILESTONE_STATUS_COLOR[ms.status]}
                  />
                  {ms.due_date && (
                    <Typography variant="caption" color="text.secondary">
                      Prazo: {new Date(ms.due_date).toLocaleDateString('pt-BR')}
                    </Typography>
                  )}
                </Box>
                {ms.description && (
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    {ms.description}
                  </Typography>
                )}
                <Box display="flex" alignItems="center" gap={1}>
                  <LinearProgress
                    variant="determinate"
                    value={ms.completion_pct}
                    sx={{ flex: 1, height: 6, borderRadius: 3 }}
                    color={ms.status === 'done' ? 'success' : 'primary'}
                  />
                  <Typography variant="caption">{ms.completion_pct}%</Typography>
                </Box>
              </Box>
              <Box display="flex" gap={0.5} ml={1}>
                {canManage && (
                  <>
                    <IconButton size="small" onClick={() => openEdit(ms)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => removeMutation.mutate(ms.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Marco' : 'Adicionar Marco'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Título"
            fullWidth
            required
            sx={{ mt: 1, mb: 2 }}
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <TextField
            label="Descrição"
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 2 }}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Prazo"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.due_date}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
            />
            <TextField
              select
              label="Status"
              fullWidth
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as MilestoneStatus }))}
            >
              <MenuItem value="planned">Planejado</MenuItem>
              <MenuItem value="in_progress">Em Andamento</MenuItem>
              <MenuItem value="done">Concluído</MenuItem>
            </TextField>
          </Box>
          <TextField
            label="Progresso (%)"
            type="number"
            fullWidth
            value={form.completion_pct}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                completion_pct: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
              }))
            }
            inputProps={{ min: 0, max: 100 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.title || saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════════

const TABS = [
  'Visão Geral',
  'Orçamento',
  'Equipe',
  'Arquitetura',
  'Objetivos',
  'Riscos',
  'Marcos',
];

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <Box>
        <Skeleton height={48} width={200} sx={{ mb: 2 }} />
        <Skeleton height={400} />
      </Box>
    );
  }

  if (!project) {
    return (
      <Box textAlign="center" py={8}>
        <Typography color="text.secondary">Projeto não encontrado.</Typography>
      </Box>
    );
  }

  const isOwnerOrAdmin = project.members.some(
    (m) => m.user.id === user?.id && (m.role === 'owner' || m.role === 'admin'),
  );

  return (
    <Box>
      {/* ── Gradient banner header ─────────────────────────────────────────── */}
      <Box
        sx={{
          background: STATUS_BANNER_GRADIENT[project.status] ?? STATUS_BANNER_GRADIENT.active,
          borderRadius: 3,
          px: 3,
          py: 2.5,
          mb: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            right: -40,
            top: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.08)',
          },
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/projects')}
              size="small"
              sx={{ color: 'rgba(255,255,255,0.8)', mb: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
            >
              Projetos
            </Button>
            <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
              <Typography variant="h5" fontWeight={800} sx={{ color: 'white' }}>
                {project.name}
              </Typography>
              <Chip
                label={STATUS_LABEL[project.status]}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.22)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  border: '1px solid rgba(255,255,255,0.35)',
                }}
              />
            </Box>
          </Box>
          <Box display="flex" gap={1} flexShrink={0} alignSelf="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={<PeopleIcon />}
              onClick={() => navigate(`/projects/${projectId}/members`)}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: 'white' },
              }}
            >
              Membros
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<ViewKanbanIcon />}
              onClick={() => navigate(`/projects/${projectId}`)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.22)',
                color: 'white',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.32)', boxShadow: 'none' },
              }}
            >
              Abrir Kanban
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 0,
          '& .MuiTabs-root': { minHeight: 44 },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            minHeight: 44,
            color: 'text.secondary',
            '&.Mui-selected': { color: 'primary.main', fontWeight: 700 },
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
            bgcolor: 'primary.main',
          },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      <TabPanel value={tab} index={0}>
        <OverviewTab project={project} />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <BudgetTab projectId={project.id} canManage={isOwnerOrAdmin} />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <TeamTab project={project} canManage={isOwnerOrAdmin} />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <TechStackTab projectId={project.id} canManage={isOwnerOrAdmin} />
      </TabPanel>
      <TabPanel value={tab} index={4}>
        <ObjectivesTab projectId={project.id} canManage={isOwnerOrAdmin} />
      </TabPanel>
      <TabPanel value={tab} index={5}>
        <RisksTab projectId={project.id} canManage={isOwnerOrAdmin} />
      </TabPanel>
      <TabPanel value={tab} index={6}>
        <MilestonesTab projectId={project.id} canManage={isOwnerOrAdmin} />
      </TabPanel>
    </Box>
  );
}
