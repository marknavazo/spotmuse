import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
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
import toast, { Toaster } from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';

import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ProfilePage from './components/profile/ProfilePage';
import AlbumsPage from './components/albums/AlbumsPage';
import AlbumDetail from './components/albums/AlbumDetail';
import ListDetail from './components/lists/ListDetail';
import FriendsPage from './components/friends/FriendsPage';
import UserProfilePage from './components/profile/UserProfilePage';
import CopilotAgents from './components/copilot/CopilotAgents';
import auth, { logout } from './firebase/auth';
import './i18n';
import Error404 from './components/Error404';
import { db } from './firebase/firestore';
import Top100Page from './components/albums/Top100Page';
import GroupsPage from './components/artists/GroupsPage';
import Home from './components/home/Home';
import Feed from './components/feed/Feed';

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

  // Remove last route restore to let '/' show Feed reliably
  // (If needed, implement a more explicit deep-link restore later)

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
      <AppBar position="fixed">
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
              <Button color="inherit" component={Link} to="/feed" sx={{ ml: 1 }}>
                {t('Feed')}
              </Button>
              <Button color="inherit" component={Link} to="/albums" sx={{ ml: 1 }}>
                {t('Álbumes')}
              </Button>
              <Button color="inherit" component={Link} to="/top" sx={{ ml: 1 }}>
                TOP 100
              </Button>
              <Button color="inherit" component={Link} to="/groups" sx={{ ml: 1 }}>
                {t('Grupos')}
              </Button>
              <Button color="inherit" component={Link} to="/friends" sx={{ ml: 1 }}>
                {t('Amigos')}
              </Button>
              <Button color="inherit" component={Link} to="/profile" sx={{ ml: 1 }}>
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
      {/* Spacer to offset fixed AppBar height */}
      <Toolbar />
      <Container maxWidth={false} sx={{ mt: 0, px: 0 }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/top" element={<Top100Page />} />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <GroupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <Feed />
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
            path="/list/:listId"
            element={
              <ProtectedRoute>
                <ListDetail />
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
