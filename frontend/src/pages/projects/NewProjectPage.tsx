import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api';
import type { ProjectStatus } from '../../types';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{
    name: string;
    description: string;
    status: ProjectStatus;
    start_date: string;
    due_date: string;
  }>({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    due_date: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => projectsApi.create(form),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${project.id}`);
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const messages = data ? Object.values(data).flat().join(' ') : 'Erro ao criar projeto.';
      setError(messages);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value as ProjectStatus }));
  };

  return (
    <Box maxWidth={600}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Novo Projeto
      </Typography>

      <Paper sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} noValidate>
          <TextField
            label="Nome do projeto" name="name" fullWidth required
            value={form.name} onChange={handleChange} sx={{ mb: 2 }}
          />
          <TextField
            label="Descrição" name="description" fullWidth multiline rows={3}
            value={form.description} onChange={handleChange} sx={{ mb: 2 }}
          />
          <TextField
            select label="Status" name="status" fullWidth
            value={form.status} onChange={handleChange} sx={{ mb: 2 }}
          >
            <MenuItem value="active">Ativo</MenuItem>
            <MenuItem value="paused">Pausado</MenuItem>
          </TextField>
          <Box display="flex" gap={2} mb={3}>
            <TextField
              label="Data de início" name="start_date" type="date" fullWidth
              value={form.start_date} onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Prazo de entrega" name="due_date" type="date" fullWidth
              value={form.due_date} onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box display="flex" gap={2}>
            <Button variant="outlined" fullWidth onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button
              type="submit" variant="contained" fullWidth
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <CircularProgress size={22} color="inherit" /> : 'Criar Projeto'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
