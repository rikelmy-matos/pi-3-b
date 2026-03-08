import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Tab,
  Tabs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import type { InviteToken } from '../../types';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const { showToast } = useSnackbar();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; email: string } | null>(null);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.listUsers,
  });

  const setStaffMutation = useMutation({
    mutationFn: ({ userId, isStaff }: { userId: number; isStaff: boolean }) =>
      adminApi.setStaff(userId, isStaff),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      showToast(
        updated.is_staff
          ? `${updated.email} agora é staff.`
          : `${updated.email} não é mais staff.`,
        'success',
      );
    },
    onError: () => showToast('Erro ao atualizar permissão.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => adminApi.deleteUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      showToast('Usuário excluído.', 'success');
      setDeleteTarget(null);
    },
    onError: () => showToast('Erro ao excluir usuário.', 'error'),
  });

  if (isLoading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Erro ao carregar usuários.</Alert>;

  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(108,99,255,0.06)' }}>
              <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>E-mail</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Criado em</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Staff</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {(users ?? []).map((u) => {
              const isSelf = u.id === me?.id;
              return (
                <TableRow key={u.id} hover>
                  <TableCell>
                    {u.first_name || u.last_name
                      ? `${u.first_name} ${u.last_name}`.trim()
                      : '—'}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                    {u.username}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                    {fmtDate(u.created_at)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={isSelf ? 'Não é possível alterar a própria permissão' : ''}>
                      <span>
                        <Switch
                          checked={u.is_staff}
                          disabled={isSelf || setStaffMutation.isPending}
                          onChange={(e) =>
                            setStaffMutation.mutate({ userId: u.id, isStaff: e.target.checked })
                          }
                          color="primary"
                          size="small"
                        />
                      </span>
                    </Tooltip>
                    {u.is_staff && (
                      <Chip
                        label="staff"
                        size="small"
                        sx={{
                          ml: 0.5,
                          bgcolor: '#EDE9FE',
                          color: '#4B44CC',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {!isSelf && !u.is_staff && (
                      <Tooltip title="Excluir usuário">
                        <IconButton
                          size="small"
                          color="error"
                          disabled={deleteMutation.isPending}
                          onClick={() => setDeleteTarget({ id: u.id, email: u.email })}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirm delete dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Excluir usuário</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o usuário{' '}
            <strong>{deleteTarget?.email}</strong>? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── Create token dialog ───────────────────────────────────────────────────────

interface CreateTokenDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (token: InviteToken) => void;
}

function CreateTokenDialog({ open, onClose, onCreated }: CreateTokenDialogProps) {
  const [note, setNote] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const { showToast } = useSnackbar();

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createInviteToken(note, hasExpiry && expiresAt ? expiresAt : undefined),
    onSuccess: (token) => {
      onCreated(token);
      setNote('');
      setHasExpiry(false);
      setExpiresAt('');
      onClose();
    },
    onError: () => showToast('Erro ao criar token.', 'error'),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Novo Token de Convite</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          <TextField
            label="Nota (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            helperText="Ex.: Para convidar Maria — equipe de design"
          />
          <FormControlLabel
            control={
              <Switch
                checked={hasExpiry}
                onChange={(e) => setHasExpiry(e.target.checked)}
                size="small"
              />
            }
            label="Definir data de expiração"
          />
          {hasExpiry && (
            <TextField
              label="Expira em"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Criando…' : 'Criar Token'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Invite Tokens tab ─────────────────────────────────────────────────────────

function InviteTokensTab() {
  const qc = useQueryClient();
  const { showToast } = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tokens, isLoading, error } = useQuery({
    queryKey: ['admin', 'invite-tokens'],
    queryFn: adminApi.listInviteTokens,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteInviteToken(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'invite-tokens'] });
      showToast('Token removido.', 'success');
    },
    onError: () => showToast('Erro ao remover token.', 'error'),
  });

  const handleCreated = (token: InviteToken) => {
    qc.invalidateQueries({ queryKey: ['admin', 'invite-tokens'] });
    showToast(`Token criado: ${token.token}`, 'success');
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token).then(() => showToast('Token copiado!', 'info'));
  };

  if (isLoading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Erro ao carregar tokens.</Alert>;

  return (
    <>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Novo Token
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(108,99,255,0.06)' }}>
              <TableCell sx={{ fontWeight: 700 }}>Token</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Nota</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Criado por</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Criado em</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Expira em</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Usado por</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Usado em</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {(tokens ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  Nenhum token cadastrado.
                </TableCell>
              </TableRow>
            )}
            {(tokens ?? []).map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        bgcolor: 'rgba(108,99,255,0.08)',
                        px: 0.8,
                        py: 0.3,
                        borderRadius: 1,
                        letterSpacing: '0.03em',
                      }}
                    >
                      {t.token.slice(0, 8)}…
                    </Typography>
                    <Tooltip title="Copiar token completo">
                      <IconButton size="small" onClick={() => copyToken(t.token)}>
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell sx={{ maxWidth: 180, color: 'text.secondary', fontSize: '0.82rem' }}>
                  {t.note || '—'}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                  {t.created_by_email ?? '—'}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                  {fmtDate(t.created_at)}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                  {fmtDate(t.expires_at)}
                </TableCell>
                <TableCell align="center">
                  {t.used ? (
                    <Chip label="Usado" size="small" color="default" sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
                  ) : t.is_valid ? (
                    <Chip label="Válido" size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
                  ) : (
                    <Chip label="Expirado" size="small" color="warning" sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
                  )}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                  {t.used_by_email ?? '—'}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                  {fmtDate(t.used_at)}
                </TableCell>
                <TableCell align="right">
                  {!t.used && (
                    <Tooltip title="Revogar token">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(t.id)}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <CreateTokenDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <AdminPanelSettingsIcon sx={{ color: 'primary.main', fontSize: 32 }} />
        <Box>
          <Typography variant="h5">Administração</Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie usuários e tokens de convite do sistema.
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          sx={{
            px: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' },
          }}
        >
          <Tab label="Usuários" />
          <Tab label="Tokens de Convite" />
        </Tabs>

        <Box p={2}>
          {tab === 0 && <UsersTab />}
          {tab === 1 && <InviteTokensTab />}
        </Box>
      </Paper>
    </Box>
  );
}
