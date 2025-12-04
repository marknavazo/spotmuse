import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';

import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ProfilePage from './components/profile/ProfilePage';
import AlbumsPage from './components/albums/AlbumsPage';
import AlbumDetail from './components/albums/AlbumDetail';
import FriendsPage from './components/friends/FriendsPage';
import UserProfilePage from './components/profile/UserProfilePage';
import CopilotAgents from './components/copilot/CopilotAgents';
import auth, { logout } from './firebase/auth';
import './i18n';
import Error404 from './components/Error404';
import { db } from './firebase/firestore';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1a1a1a',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const ref = doc(db, 'users', u.uid);
          const snap = await getDoc(ref);
          const pref = snap.exists() ? snap.data().preferredLanguage : null;
          if (pref) i18n.changeLanguage(pref);
        } catch {}
      }
    });
  }, [i18n]);

  // Restore last route on initial mount if redirected to '/'
  useEffect(() => {
    const path = location.pathname + location.search + location.hash;
    if (path === '/') {
      const last = sessionStorage.getItem('lastRoute');
      if (last && last !== '/') {
        navigate(last, { replace: true });
      }
    } else {
      // Save current route (non-root) so we can restore it on refresh
      sessionStorage.setItem('lastRoute', path);
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  async function handleLogout() {
    try {
      await logout();
      toast.success('Sesión cerrada');
      navigate('/login');
    } catch (_error) {
      toast.error('Error al cerrar sesión');
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Toaster position="top-right" />
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ color: 'inherit', textDecoration: 'none', flexGrow: 1 }}
          >
            {t('SpotMuse')}
          </Typography>
          {user ? (
            <>
              <Button color="inherit" component={Link} to="/albums">
                {t('Álbumes')}
              </Button>
              <Button color="inherit" component={Link} to="/friends">
                {t('Amigos')}
              </Button>
              <Button color="inherit" component={Link} to="/profile">
                {t('Perfil')}
              </Button>
              <Button
                color="inherit"
                onClick={handleLogout}
                sx={{ ml: 2, borderLeft: '1px solid rgba(255,255,255,0.2)', pl: 2 }}
              >
                {t('Cerrar sesión')}
              </Button>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              {t('Login')}
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth={false} sx={{ mt: 3, px: 0 }}>
        <Routes>
          <Route
            path="/"
            element={
              <Typography>{t('Bienvenido a SpotMuse — comparte y descubre álbumes')}</Typography>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/albums"
            element={
              <ProtectedRoute>
                <AlbumsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/album/:albumId"
            element={
              <ProtectedRoute>
                <AlbumDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <FriendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/:userId"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/copilot"
            element={
              <ProtectedRoute>
                <CopilotAgents />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Error404 />} />
        </Routes>
      </Container>
    </ThemeProvider>
  );
}

export default App;
