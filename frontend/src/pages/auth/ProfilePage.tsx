import { useState, useEffect } from 'react';
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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useSnackbar();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    bio: '',
  });

  // Populate form from current user
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

  const initials =
    ((user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? '')).toUpperCase() ||
    user?.username?.[0]?.toUpperCase() ||
    '?';

  return (
    <Box maxWidth={600} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={3}>
        Meu Perfil
      </Typography>

      <Card elevation={2}>
        <CardContent>
          {/* Avatar + username row */}
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>
              {initials}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {user?.full_name || user?.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
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
              startIcon={updateMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              disabled={updateMutation.isPending}
            >
              Salvar Alterações
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
