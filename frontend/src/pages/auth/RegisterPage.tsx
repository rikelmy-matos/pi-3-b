import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.password_confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const messages = data ? Object.values(data).flat().join(' ') : 'Erro ao cadastrar.';
      setError(messages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Paper sx={{ p: 4, width: '100%', maxWidth: 480 }} elevation={3}>
        <Typography variant="h5" fontWeight={700} mb={1}>
          Criar conta
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Task Manager — PROMINESS LTDA
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid size={6}>
              <TextField
                label="Nome" name="first_name" fullWidth required
                value={form.first_name} onChange={handleChange}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Sobrenome" name="last_name" fullWidth required
                value={form.last_name} onChange={handleChange}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="E-mail" name="email" type="email" fullWidth required
                value={form.email} onChange={handleChange}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Nome de usuário" name="username" fullWidth required
                value={form.username} onChange={handleChange}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Senha" name="password" type="password" fullWidth required
                value={form.password} onChange={handleChange}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Confirmar senha" name="password_confirm" type="password" fullWidth required
                value={form.password_confirm} onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Button
            type="submit" variant="contained" fullWidth
            disabled={loading} size="large" sx={{ mt: 3 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Cadastrar'}
          </Button>
        </Box>

        <Typography variant="body2" mt={2} textAlign="center">
          Já tem conta?{' '}
          <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>
            Entrar
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
