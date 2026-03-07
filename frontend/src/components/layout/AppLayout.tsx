import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuth } from '../../context/AuthContext';

const DRAWER_WIDTH = 248;

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: <DashboardIcon /> },
  { label: 'Projetos', to: '/projects', icon: <FolderIcon /> },
  { label: 'Calendário', to: '/calendar', icon: <CalendarMonthIcon /> },
];

// Indigo-violet sidebar palette
const SIDEBAR_BG = '#4B44CC';
const SIDEBAR_ACTIVE_BG = 'rgba(255,255,255,0.18)';
const SIDEBAR_HOVER_BG = 'rgba(255,255,255,0.10)';
const SIDEBAR_TEXT = '#FFFFFF';
const SIDEBAR_SUBTEXT = 'rgba(255,255,255,0.65)';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const initials =
    (user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? user?.username?.[0] ?? 'U');

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: SIDEBAR_BG,
        color: SIDEBAR_TEXT,
        py: 2,
      }}
    >
      {/* Logo / Brand */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 18,
              color: '#fff',
              letterSpacing: '-1px',
            }}
          >
            P
          </Box>
          <Box>
            <Typography variant="subtitle1" color={SIDEBAR_TEXT} fontWeight={800} lineHeight={1.1}>
              PROMINESS
            </Typography>
            <Typography variant="caption" sx={{ color: SIDEBAR_SUBTEXT, fontSize: '0.7rem' }}>
              Task Manager
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Nav */}
      <List sx={{ flex: 1, px: 0.5 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to);
          return (
            <ListItemButton
              key={item.to}
              onClick={() => navigate(item.to)}
              sx={{
                borderRadius: '10px',
                mx: 1,
                mb: 0.5,
                bgcolor: active ? SIDEBAR_ACTIVE_BG : 'transparent',
                '&:hover': { bgcolor: active ? SIDEBAR_ACTIVE_BG : SIDEBAR_HOVER_BG },
                transition: 'background-color 0.15s',
              }}
            >
              <ListItemIcon
                sx={{
                  color: active ? SIDEBAR_TEXT : SIDEBAR_SUBTEXT,
                  minWidth: 38,
                  '& .MuiSvgIcon-root': { fontSize: 20 },
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? SIDEBAR_TEXT : SIDEBAR_SUBTEXT,
                }}
              />
              {active && (
                <Box
                  sx={{
                    width: 4,
                    height: 20,
                    borderRadius: 2,
                    bgcolor: '#fff',
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>

      {/* User profile section */}
      <Box sx={{ px: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        <Box
          display="flex"
          alignItems="center"
          gap={1.5}
          sx={{ cursor: 'pointer' }}
          onClick={(e) => setAnchorEl(e.currentTarget as HTMLElement)}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'rgba(255,255,255,0.25)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              border: '2px solid rgba(255,255,255,0.4)',
            }}
          >
            {initials.toUpperCase()}
          </Avatar>
          <Box flex={1} overflow="hidden">
            <Typography
              variant="body2"
              color={SIDEBAR_TEXT}
              fontWeight={700}
              noWrap
              lineHeight={1.2}
            >
              {user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : user?.username}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: SIDEBAR_SUBTEXT, fontSize: '0.7rem', display: 'block' }}
              noWrap
            >
              {user?.email}
            </Typography>
          </Box>
          <MoreVertIcon sx={{ color: SIDEBAR_SUBTEXT, fontSize: 18, flexShrink: 0 }} />
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 180 } }}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate('/profile');
          }}
        >
          Meu Perfil
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            logout();
            navigate('/login');
          }}
          sx={{ color: 'error.main' }}
        >
          Sair
        </MenuItem>
      </Menu>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile toggle */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 1300,
        }}
      >
        <Tooltip title="Menu">
          <IconButton
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ bgcolor: SIDEBAR_BG, color: '#fff', '&:hover': { bgcolor: '#4B44CC' } }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Permanent sidebar (desktop) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '4px 0 24px rgba(75,68,204,0.15)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Temporary drawer (mobile) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          pt: { xs: 7, sm: 3 },
          minHeight: '100vh',
          bgcolor: 'background.default',
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
