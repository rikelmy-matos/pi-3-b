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
  InputAdornment,
  IconButton,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'E-mail ou senha inválidos.';
      setError(msg);
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
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
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
              Bem-vindo de volta
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Entre na sua conta para continuar
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                label="E-mail"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                size="large"
                sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem' }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Entrar'}
              </Button>
            </Box>

            <Typography variant="body2" mt={3} textAlign="center" color="text.secondary">
              Não tem conta?{' '}
              <Link to="/register" style={{ color: '#6C63FF', fontWeight: 700, textDecoration: 'none' }}>
                Cadastre-se
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
