import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SnackbarProvider } from './context/SnackbarContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProfilePage from './pages/auth/ProfilePage';
import DashboardPage from './pages/projects/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import NewProjectPage from './pages/projects/NewProjectPage';
import KanbanBoard from './pages/tasks/KanbanBoard';
import CalendarPage from './pages/tasks/CalendarPage';
import MembersPage from './pages/projects/MembersPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
});

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6C63FF', light: '#9D97FF', dark: '#4B44CC', contrastText: '#fff' },
    secondary: { main: '#FF6584', light: '#FF91A8', dark: '#CC3D5C', contrastText: '#fff' },
    success: { main: '#22C55E', contrastText: '#fff' },
    warning: { main: '#F59E0B', contrastText: '#fff' },
    error: { main: '#EF4444', contrastText: '#fff' },
    info: { main: '#3B82F6', contrastText: '#fff' },
    background: { default: '#F0EFFF', paper: '#FFFFFF' },
    text: { primary: '#1E1B4B', secondary: '#6B7280' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 700 },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem' },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(108,99,255,0.25)' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6C63FF 0%, #9D97FF 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #4B44CC 0%, #6C63FF 100%)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(108,99,255,0.08)',
          border: '1px solid rgba(108,99,255,0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 700, fontSize: '0.72rem' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 8, height: 10 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 10, margin: '2px 8px', width: 'auto' },
      },
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<NewProjectPage />} />
        <Route path="/projects/:projectId" element={<KanbanBoard />} />
        <Route path="/projects/:projectId/members" element={<MembersPage />} />
        <Route path="/projects/:projectId/overview" element={<ProjectDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <SnackbarProvider>
              <AppRoutes />
            </SnackbarProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
