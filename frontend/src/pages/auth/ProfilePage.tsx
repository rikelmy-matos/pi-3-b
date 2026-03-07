import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Avatar,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Profile form state ──────────────────────────────────────────────────────
  const [form, setForm] = useState({ first_name: '', last_name: '', bio: '' });

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        bio: user.bio ?? '',
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: { first_name: string; last_name: string; bio: string }) =>
      authApi.updateProfile(data),
    onSuccess: async () => {
      await refreshUser();
      showToast('Perfil atualizado com sucesso.');
    },
    onError: () => showToast('Erro ao atualizar perfil.', 'error'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  // ── Avatar upload ───────────────────────────────────────────────────────────
  const avatarMutation = useMutation({
    mutationFn: (file: File) => authApi.uploadAvatar(file),
    onSuccess: async () => {
      await refreshUser();
      showToast('Foto atualizada com sucesso.');
    },
    onError: () => showToast('Erro ao enviar foto.', 'error'),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: () => authApi.removeAvatar(),
    onSuccess: async () => {
      await refreshUser();
      showToast('Foto removida.');
    },
    onError: () => showToast('Erro ao remover foto.', 'error'),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  const pwMutation = useMutation({
    mutationFn: () =>
      authApi.changePassword(
        pwForm.current_password,
        pwForm.new_password,
        pwForm.new_password_confirm,
      ),
    onSuccess: () => {
      setPwForm({ current_password: '', new_password: '', new_password_confirm: '' });
      setPwErrors({});
      showToast('Senha alterada com sucesso.');
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (data) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        }
        setPwErrors(mapped);
      } else {
        showToast('Erro ao alterar senha.', 'error');
      }
    },
  });

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwErrors({});
    if (pwForm.new_password !== pwForm.new_password_confirm) {
      setPwErrors({ new_password_confirm: 'As senhas não coincidem.' });
      return;
    }
    pwMutation.mutate();
  };

  // ── Avatar display ──────────────────────────────────────────────────────────
  const initials =
    ((user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? '')).toUpperCase() ||
    user?.username?.[0]?.toUpperCase() ||
    '?';

  return (
    <Box maxWidth={600} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={3}>
        Meu Perfil
      </Typography>

      {/* ── Profile info card ─────────────────────────────────────────────── */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          {/* Avatar + upload/remove buttons */}
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Box position="relative">
              <Avatar
                src={user?.avatar_url ?? undefined}
                sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 26 }}
              >
                {!user?.avatar_url && initials}
              </Avatar>
              <Tooltip title="Trocar foto">
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarMutation.isPending || removeAvatarMutation.isPending}
                  sx={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    bgcolor: 'primary.main',
                    color: '#fff',
                    width: 26,
                    height: 26,
                    '&:hover': { bgcolor: 'primary.dark' },
                    boxShadow: 2,
                  }}
                >
                  {avatarMutation.isPending ? (
                    <CircularProgress size={12} color="inherit" />
                  ) : (
                    <PhotoCameraIcon sx={{ fontSize: 14 }} />
                  )}
                </IconButton>
              </Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </Box>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={600}>
                {user?.full_name || user?.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={user?.avatar_url ? 1 : 0}>
                {user?.email}
              </Typography>
              {user?.avatar_url && (
                <Tooltip title="Remover foto">
                  <span>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={
                        removeAvatarMutation.isPending ? (
                          <CircularProgress size={12} color="inherit" />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )
                      }
                      disabled={removeAvatarMutation.isPending || avatarMutation.isPending}
                      onClick={() => removeAvatarMutation.mutate()}
                      sx={{ borderRadius: 2, fontSize: '0.75rem', py: 0.4 }}
                    >
                      Remover foto
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box component="form" onSubmit={handleSubmit}>
            <Box display="flex" gap={2} mb={2}>
              <TextField
                label="Nome"
                fullWidth
                value={form.first_name}
                onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              />
              <TextField
                label="Sobrenome"
                fullWidth
                value={form.last_name}
                onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              />
            </Box>

            <TextField
              label="Bio"
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 3 }}
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Escreva um pouco sobre você..."
            />

            {/* Read-only info */}
            <Box mb={3}>
              <TextField
                label="Nome de usuário"
                fullWidth
                value={user?.username ?? ''}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />
              <TextField
                label="E-mail"
                fullWidth
                value={user?.email ?? ''}
                InputProps={{ readOnly: true }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              startIcon={
                updateMutation.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              disabled={updateMutation.isPending}
            >
              Salvar Alterações
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ── Change password card ───────────────────────────────────────────── */}
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <LockIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={700}>
              Alterar Senha
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Box component="form" onSubmit={handlePwSubmit}>
            <TextField
              label="Senha atual"
              type="password"
              fullWidth
              required
              sx={{ mb: 2 }}
              value={pwForm.current_password}
              onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))}
              error={!!pwErrors.current_password}
              helperText={pwErrors.current_password}
            />
            <TextField
              label="Nova senha"
              type="password"
              fullWidth
              required
              sx={{ mb: 2 }}
              value={pwForm.new_password}
              onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))}
              error={!!pwErrors.new_password}
              helperText={pwErrors.new_password ?? 'Mínimo de 8 caracteres.'}
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              fullWidth
              required
              sx={{ mb: 3 }}
              value={pwForm.new_password_confirm}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, new_password_confirm: e.target.value }))
              }
              error={!!pwErrors.new_password_confirm}
              helperText={pwErrors.new_password_confirm}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={
                pwMutation.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <LockIcon />
                )
              }
              disabled={pwMutation.isPending}
            >
              Alterar Senha
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
