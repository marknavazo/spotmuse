import { useEffect, useState, useRef, Suspense, lazy } from 'react';
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
  Avatar,
  Box,
  Menu,
  MenuItem,
} from '@mui/material';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import toast, { Toaster } from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
const ProfilePage = lazy(() => import('./components/profile/ProfilePage'));
const AlbumsPage = lazy(() => import('./components/albums/AlbumsPage'));
const AlbumDetail = lazy(() => import('./components/albums/AlbumDetail'));
const ListDetail = lazy(() => import('./components/lists/ListDetail'));
const FriendsPage = lazy(() => import('./components/friends/FriendsPage'));
const UserProfilePage = lazy(() => import('./components/profile/UserProfilePage'));
const CopilotAgents = lazy(() => import('./components/copilot/CopilotAgents'));
import auth, { logout } from './firebase/auth';
import './i18n';
import Error404 from './components/Error404';
import { db } from './firebase/firestore';
import Top100Page from './components/albums/Top100Page';
import GroupsPage from './components/artists/GroupsPage';
import Home from './components/home/Home';
import Feed from './components/feed/Feed';
import SongsPage from './components/songs/SongsPage';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
  const queryClient = new QueryClient();
  const [user, setUser] = useState(null);
  const [userInitials, setUserInitials] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [hoverMenuOpen, setHoverMenuOpen] = useState(false);
  const hoverCloseTimeoutRef = useRef(null);
  const [alertsAnchorEl, setAlertsAnchorEl] = useState(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [pendingRecCount, setPendingRecCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [dismissedRec, setDismissedRec] = useState(false);
  const [dismissedFollowers, setDismissedFollowers] = useState(false);
  const prevRecCountRef = useRef(0);
  const prevFollowersCountRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (pathPrefix) =>
    location.pathname === pathPrefix || location.pathname.startsWith(pathPrefix + '/');

  const { t, i18n } = useTranslation();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const ref = doc(db, 'users', u.uid);
          const snap = await getDoc(ref);
          const data = snap.exists() ? snap.data() : null;
          const pref = data?.preferredLanguage || null;
          // Derive initials from name fields or displayName
          const nameSource =
            data?.name ||
            `${data?.firstName || ''} ${data?.lastName || ''}`.trim() ||
            u.displayName ||
            '';
          const parts = nameSource.split(/\s+/).filter(Boolean);
          const initials =
            parts.length >= 2
              ? `${parts[0][0]}${parts[1][0]}`
              : parts.length === 1
                ? parts[0].slice(0, 2)
                : '';
          setUserInitials(initials.toUpperCase());
          if (pref) i18n.changeLanguage(pref);
        } catch {}
      }
    });
  }, [i18n]);

  // Subscribe to alerts: pending recommendations to me and followers of me
  useEffect(() => {
    if (!user?.uid) return;
    // Pending recommendations addressed to current user and not accepted
    const recRef = collection(db, 'recommendations');
    const qRec = query(recRef, where('to', '==', user.uid), where('accepted', '==', false));
    const unsubRec = onSnapshot(qRec, (snap) => {
      const count = snap.docs.length;
      // If new items arrived (count increased), undismiss notifications
      if (count > prevRecCountRef.current) {
        setDismissedRec(false);
      }
      prevRecCountRef.current = count;
      setPendingRecCount(count);
    });

    // Followers: records where friendUid equals current user
    const friendsRef = collection(db, 'friends');
    const qFollowers = query(friendsRef, where('friendUid', '==', user.uid));
    const unsubFollowers = onSnapshot(qFollowers, (snap) => {
      const count = snap.docs.length;
      if (count > prevFollowersCountRef.current) {
        setDismissedFollowers(false);
      }
      prevFollowersCountRef.current = count;
      setFollowersCount(count);
    });

    return () => {
      unsubRec();
      unsubFollowers();
    };
  }, [user?.uid]);

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

  // Handlers for avatar hover menu
  function handleAvatarMouseEnter(event) {
    if (hoverCloseTimeoutRef.current) {
      window.clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
    setMenuAnchorEl(event.currentTarget);
    setHoverMenuOpen(true);
  }

  function scheduleMenuClose() {
    // Slight delay to allow moving from avatar to menu without closing
    const timeout = window.setTimeout(() => {
      setHoverMenuOpen(false);
      setMenuAnchorEl(null);
    }, 400);
    hoverCloseTimeoutRef.current = timeout;
  }

  function handleMenuMouseEnter() {
    if (hoverCloseTimeoutRef.current) {
      window.clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
  }

  function handleMenuMouseLeave() {
    scheduleMenuClose();
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Toaster position="top-right" />
      <QueryClientProvider client={queryClient}>
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
                <Button
                  color="inherit"
                  component={Link}
                  to="/feed"
                  sx={{
                    ml: 1,
                    borderBottom: isActive('/feed') ? '2px solid #1db954' : '2px solid transparent',
                    borderRadius: 0,
                  }}
                >
                  {t('Feed')}
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/albums"
                  sx={{
                    ml: 1,
                    borderBottom: isActive('/albums')
                      ? '2px solid #1db954'
                      : '2px solid transparent',
                    borderRadius: 0,
                  }}
                >
                  {t('Álbumes')}
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/top"
                  sx={{
                    ml: 1,
                    borderBottom: isActive('/top') ? '2px solid #1db954' : '2px solid transparent',
                    borderRadius: 0,
                  }}
                >
                  TOP 100
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/groups"
                  sx={{
                    ml: 1,
                    borderBottom: isActive('/groups')
                      ? '2px solid #1db954'
                      : '2px solid transparent',
                    borderRadius: 0,
                  }}
                >
                  {t('Grupos')}
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/songs"
                  sx={{
                    ml: 1,
                    borderBottom: isActive('/songs')
                      ? '2px solid #1db954'
                      : '2px solid transparent',
                    borderRadius: 0,
                  }}
                >
                  {t('Canciones')}
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/friends"
                  sx={{
                    ml: 1,
                    borderBottom: isActive('/friends')
                      ? '2px solid #1db954'
                      : '2px solid transparent',
                    borderRadius: 0,
                  }}
                >
                  {t('Amigos')}
                </Button>
                {/* Alerts bell */}
                <Box sx={{ ml: 1 }}>
                  <IconButton
                    aria-label={t('Alertas')}
                    onClick={(e) => {
                      setAlertsAnchorEl(e.currentTarget);
                      setAlertsOpen(true);
                    }}
                    sx={{ color: 'inherit' }}
                  >
                    <Badge
                      badgeContent={
                        (dismissedRec ? 0 : pendingRecCount) +
                        (dismissedFollowers ? 0 : followersCount)
                      }
                      color="error"
                    >
                      <NotificationsNoneIcon />
                    </Badge>
                  </IconButton>
                  <Menu
                    anchorEl={alertsAnchorEl}
                    open={alertsOpen}
                    onClose={() => setAlertsOpen(false)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  >
                    <MenuItem
                      onClick={() => {
                        setAlertsOpen(false);
                        setDismissedRec(true);
                        navigate('/albums');
                      }}
                    >
                      {t('Recomendaciones pendientes')}: {pendingRecCount}
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setAlertsOpen(false);
                        setDismissedFollowers(true);
                        navigate('/friends');
                      }}
                    >
                      {t('Seguidores')}: {followersCount}
                    </MenuItem>
                  </Menu>
                </Box>
                <Box
                  sx={{ ml: 2 }}
                  onMouseEnter={handleAvatarMouseEnter}
                  onMouseLeave={scheduleMenuClose}
                >
                  <Avatar
                    sx={{
                      bgcolor: '#1db954',
                      color: '#000',
                      width: 32,
                      height: 32,
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                    onClick={handleAvatarMouseEnter}
                  >
                    {userInitials || '?'}
                  </Avatar>
                </Box>
                <Menu
                  anchorEl={menuAnchorEl}
                  open={hoverMenuOpen}
                  onClose={() => setHoverMenuOpen(false)}
                  MenuListProps={{
                    onMouseEnter: handleMenuMouseEnter,
                    onMouseLeave: handleMenuMouseLeave,
                  }}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  keepMounted
                  disableScrollLock
                >
                  <MenuItem
                    selected={location.pathname.startsWith('/profile')}
                    onClick={() => {
                      setHoverMenuOpen(false);
                      navigate('/profile');
                    }}
                  >
                    {t('Perfil')}
                  </MenuItem>
                  <MenuItem
                    selected={false}
                    onClick={() => {
                      setHoverMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    {t('Cerrar sesión')}
                  </MenuItem>
                </Menu>
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
          <Suspense fallback={<Box sx={{ p: 3 }}>{t('Cargando…')}</Box>}>
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
                path="/songs"
                element={
                  <ProtectedRoute>
                    <SongsPage />
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
          </Suspense>
        </Container>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
