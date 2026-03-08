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
  InputAdornment,
  IconButton,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    invite_token: '',
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
        background: 'linear-gradient(135deg, #F0EFFF 0%, #E8E6FF 50%, #F5F0FF 100%)',
        px: 2,
        py: 4,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 480 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(108,99,255,0.18)',
          }}
        >
          {/* Gradient header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #6C63FF 0%, #4B44CC 100%)',
              px: 4,
              pt: 4,
              pb: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                backdropFilter: 'blur(4px)',
              }}
            >
              <TaskAltIcon sx={{ color: '#fff', fontSize: 32 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: 'white' }} textAlign="center">
              Task Manager
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }} textAlign="center" mt={0.5}>
              PROMINESS LTDA
            </Typography>
          </Box>

          {/* Form section */}
          <Box sx={{ px: 4, py: 3.5 }}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>
              Criar nova conta
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Preencha os dados abaixo para se cadastrar
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField
                    label="Nome"
                    name="first_name"
                    fullWidth
                    required
                    value={form.first_name}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BadgeOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label="Sobrenome"
                    name="last_name"
                    fullWidth
                    required
                    value={form.last_name}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="E-mail"
                    name="email"
                    type="email"
                    fullWidth
                    required
                    value={form.email}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Nome de usuário"
                    name="username"
                    fullWidth
                    required
                    value={form.username}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label="Senha"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    required
                    value={form.password}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label="Confirmar senha"
                    name="password_confirm"
                    type={showConfirm ? 'text' : 'password'}
                    fullWidth
                    required
                    value={form.password_confirm}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end" size="small">
                            {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Token de convite"
                    name="invite_token"
                    fullWidth
                    required
                    value={form.invite_token}
                    onChange={handleChange}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    helperText="Solicite um token de convite ao administrador."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <VpnKeyOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                size="large"
                sx={{ mt: 3, py: 1.5, fontWeight: 700, fontSize: '1rem' }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Criar conta'}
              </Button>
            </Box>

            <Typography variant="body2" mt={3} textAlign="center" color="text.secondary">
              Já tem conta?{' '}
              <Link to="/login" style={{ color: '#6C63FF', fontWeight: 700, textDecoration: 'none' }}>
                Entrar
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
