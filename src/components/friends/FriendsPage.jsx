import { useEffect, useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Paper,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Grid,
  Typography,
  ButtonGroup,
  Box,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { db } from '../../firebase/firestore';
import auth from '../../firebase/auth';

export default function FriendsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [activeTab, setActiveTab] = useState('following');
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    // Subscribe to people I'm following
    const followingRef = collection(db, 'friends');
    const q1 = query(followingRef, where('userId', '==', user.uid));
    const unsubFollowing = onSnapshot(q1, (snap) => {
      setFollowing(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    // Subscribe to my followers
    const q2 = query(followingRef, where('friendUid', '==', user.uid));
    const unsubFollowers = onSnapshot(q2, (snap) => {
      setFollowers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubFollowing();
      unsubFollowers();
    };
  }, [user]);

  async function handleSearch() {
    if (!searchQuery) return;
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const results = snapshot.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter(
          (u) =>
            u.uid !== user.uid &&
            (u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.uid.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      setSearchResults(results);
    } catch (_error) {
      toast.error('Error al buscar usuarios');
    }
  }

  async function addFriend(friendUid, friendName) {
    try {
      await addDoc(collection(db, 'friends'), {
        userId: user.uid,
        friendUid: friendUid,
        friendName: friendName || 'Usuario',
        addedAt: new Date().toISOString(),
      });
      toast.success('Amigo agregado');
    } catch (_error) {
      toast.error('Error al agregar amigo');
    }
  }

  async function removeFriend(friendId) {
    try {
      await deleteDoc(doc(db, 'friends', friendId));
      toast.success('Amigo eliminado');
    } catch (_error) {
      toast.error('Error al eliminar amigo');
    }
  }

  const isFollowing = (friendUid) => following.some((f) => f.friendUid === friendUid);
  const isMutual = (followerUid) => following.some((f) => f.friendUid === followerUid);

  async function followBack(followerUid, followerName) {
    await addFriend(followerUid, followerName);
  }

  return (
    <Container maxWidth={false} sx={{ px: 3 }}>
      {/* Spacer for fixed header */}
      <Box sx={{ height: (theme) => theme.mixins.toolbar }} />
      <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <Grid item xs={9}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('Buscar usuarios por nombre o UID')}
          />
        </Grid>
        <Grid item xs={3}>
          <Button
            onClick={handleSearch}
            variant="contained"
            sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
          >
            {t('Buscar')}
          </Button>
        </Grid>
      </Grid>

      {searchResults.length > 0 && (
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('Resultados de búsqueda')}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Nombre')}</TableCell>
                  <TableCell>UID</TableCell>
                  <TableCell>{t('Acciones')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((u) => (
                  <TableRow key={u.uid}>
                    <TableCell>{u.fullName || 'Sin nombre'}</TableCell>
                    <TableCell>{u.uid}</TableCell>
                    <TableCell>
                      {isFollowing(u.uid) ? (
                        <Typography variant="body2" color="success.main">
                          Ya sigues a este usuario
                        </Typography>
                      ) : (
                        <IconButton
                          onClick={() => addFriend(u.uid, u.fullName)}
                          sx={{ color: '#1db954' }}
                        >
                          <PersonAddIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <ButtonGroup variant="contained" sx={{ mb: 2 }}>
        <Button
          onClick={() => setActiveTab('following')}
          sx={{
            bgcolor: activeTab === 'following' ? '#1db954' : '#2a2a2a',
            '&:hover': { bgcolor: activeTab === 'following' ? '#1ed760' : '#3a3a3a' },
          }}
        >
          {t('Siguiendo')} ({following.length})
        </Button>
        <Button
          onClick={() => setActiveTab('followers')}
          sx={{
            bgcolor: activeTab === 'followers' ? '#1db954' : '#2a2a2a',
            '&:hover': { bgcolor: activeTab === 'followers' ? '#1ed760' : '#3a3a3a' },
          }}
        >
          {t('Seguidores')} ({followers.length})
        </Button>
      </ButtonGroup>

      {activeTab === 'following' && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('Gente que sigo')}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Nombre')}</TableCell>
                  <TableCell>UID</TableCell>
                  <TableCell>{t('Acciones')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {following.map((f) => (
                  <TableRow
                    key={f.id}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(29, 185, 84, 0.1)' } }}
                    onClick={() => navigate(`/user/${f.friendUid}`)}
                  >
                    <TableCell>{f.friendName}</TableCell>
                    <TableCell>{f.friendUid}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFriend(f.id);
                        }}
                        color="error"
                      >
                        <PersonRemoveIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {following.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      {t('No sigues a nadie aún')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeTab === 'followers' && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('Gente que me sigue')}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Nombre')}</TableCell>
                  <TableCell>UID</TableCell>
                  <TableCell>{t('Estado')}</TableCell>
                  <TableCell>{t('Acciones')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {followers.map((f) => {
                  const mutual = isMutual(f.userId);
                  return (
                    <TableRow
                      key={f.id}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(29, 185, 84, 0.1)' } }}
                      onClick={() => navigate(`/user/${f.userId}`)}
                    >
                      <TableCell>{f.friendName || t('Usuario')}</TableCell>
                      <TableCell>{f.userId}</TableCell>
                      <TableCell>
                        {mutual ? (
                          <Typography variant="body2" sx={{ color: '#1db954' }}>
                            {t('Os seguís mutuamente')}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {t('Te sigue')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {!mutual && (
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              followBack(f.userId, f.friendName);
                            }}
                            sx={{
                              bgcolor: '#1db954',
                              color: 'white',
                              '&:hover': { bgcolor: '#1ed760' },
                            }}
                          >
                            {t('Seguir')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {followers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      {t('Nadie te sigue aún')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
}
