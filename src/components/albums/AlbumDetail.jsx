import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShareIcon from '@mui/icons-material/Share';
import toast from 'react-hot-toast';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

import auth from '../../firebase/auth';
import { db } from '../../firebase/firestore';
import { getAlbumById } from '../../services/spotifyService';

export default function AlbumDetail() {
  const { t } = useTranslation();
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [friends, setFriends] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  const [avgRating, setAvgRating] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    async function load() {
      try {
        const data = await getAlbumById(albumId);
        setAlbum(data);
        await loadMyRating(data?.id);
      } catch (_e) {
        toast.error(t('Error cargando álbum'));
      }
    }
    load();
  }, [albumId, t]);

  async function loadMyRating(id) {
    const u = auth.currentUser;
    if (!u || !id) return;
    const ratingId = `${u.uid}_${id}`;
    const ref = doc(collection(db, 'ratings'), ratingId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      setRating(d.value || 0);
    }
  }

  async function saveMyRating(val) {
    const u = auth.currentUser;
    if (!u || !album) return;
    setSavingRating(true);
    try {
      const ratingId = `${u.uid}_${album.id}`;
      const ref = doc(collection(db, 'ratings'), ratingId);
      await setDoc(
        ref,
        { uid: u.uid, albumId: album.id, value: val, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setRating(val);
      toast.success(t('Puntuación guardada'));
    } catch (_e) {
      toast.error(t('Error al guardar puntuación'));
    } finally {
      setSavingRating(false);
    }
  }

  // Subscribe to average rating for this album
  useEffect(() => {
    if (!album?.id) return;
    const ratingsRef = collection(db, 'ratings');
    const qRatings = query(ratingsRef, where('albumId', '==', album.id));
    const unsub = onSnapshot(qRatings, (snap) => {
      let total = 0;
      let count = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (typeof data.value === 'number') {
          total += data.value;
          count += 1;
        }
      });
      setAvgRating(count > 0 ? total / count : null);
    });
    return () => unsub();
  }, [album?.id]);

  // Load friends list to recommend to
  useEffect(() => {
    if (!user) return;
    const friendsRef = collection(db, 'friends');
    const q = query(friendsRef, where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setFriends(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  async function saveAlbum() {
    if (!user || !album) return toast.error(t('Accede para guardar álbumes'));
    try {
      await addDoc(collection(db, 'albums'), {
        owner: user.uid,
        albumId: album.id,
        name: album.name,
        artists: album.artists.map((a) => a.name).join(', '),
        images: album.images,
        releaseDate: album.release_date,
        addedAt: new Date().toISOString(),
      });
      toast.success(t('Álbum guardado'));
    } catch (_error) {
      toast.error(t('Error al guardar álbum'));
    }
  }

  function recommendAlbum() {
    if (!user) return toast.error(t('Accede para recomendar'));
    if (friends.length === 0) return toast.error(t('Añade amigos primero en la sección Amigos'));
    setOpenDialog(true);
  }

  async function recommendTo(toUid) {
    if (!user || !album) return;
    try {
      await addDoc(collection(db, 'recommendations'), {
        from: user.uid,
        to: toUid,
        albumId: album.id,
        albumName: album.name,
        artist: album.artists?.map((a) => a.name).join(', '),
        images: album.images,
        releaseDate: album.release_date,
        accepted: false,
        createdAt: new Date().toISOString(),
      });
      toast.success(t('Recomendación enviada'));
      setOpenDialog(false);
    } catch (_error) {
      toast.error(t('Error al enviar recomendación'));
    }
  }

  if (!album) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>{t('Cargando álbum...')}</Typography>
      </Container>
    );
  }

  const cover = album.images?.[0]?.url;
  const artists = album.artists?.map((a) => a.name).join(', ');
  const year = album.release_date ? new Date(album.release_date).getFullYear() : '-';

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={5}>
            <img src={cover} alt={album.name} style={{ width: '100%', borderRadius: 8 }} />
          </Grid>
          <Grid item xs={12} md={7}>
            <Typography variant="h4" gutterBottom>
              {album.name}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              {artists}
            </Typography>
            <Typography variant="body2" sx={{ color: '#aaa' }}>
              {t('Año')}: {year}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <div style={{ fontWeight: 600 }}>{t('Tu puntuación')}</div>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}
              >
                {[...Array(10)].map((_, i) => {
                  const val = i + 1;
                  const active = rating >= val;
                  return (
                    <Button
                      key={val}
                      size="small"
                      onClick={() => saveMyRating(val)}
                      sx={{
                        minWidth: 28,
                        height: 28,
                        p: 0,
                        bgcolor: active ? '#1db954' : '#2a2a2a',
                        color: active ? '#000' : '#ddd',
                        borderRadius: '50%',
                      }}
                    >
                      {val}
                    </Button>
                  );
                })}
                {savingRating && <CircularProgress size={16} sx={{ ml: 1 }} />}
              </Box>
              <div style={{ marginTop: 8, color: '#bbb' }}>
                {t('Puntuación media')}: {avgRating != null ? avgRating.toFixed(1) : '-'}
              </div>
            </Box>
            <div style={{ marginTop: 16 }}>
              <IconButton
                onClick={() => window.open(`https://open.spotify.com/album/${album.id}`, '_blank')}
                sx={{ color: '#1db954' }}
              >
                <PlayArrowIcon />
              </IconButton>
            </div>
            <div style={{ marginTop: 16 }}>
              <Button
                variant="contained"
                sx={{ mr: 2, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                onClick={saveAlbum}
              >
                {t('Guardar')}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<ShareIcon />}
                sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#2196f3' } }}
                onClick={recommendAlbum}
              >
                {t('Recomendar')}
              </Button>
            </div>
          </Grid>
        </Grid>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('Recomendar a un amigo')}</DialogTitle>
        <DialogContent>
          {album && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: '#2a2a2a' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <img
                    src={album.images?.[2]?.url || album.images?.[0]?.url}
                    alt={album.name}
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                  />
                </Grid>
                <Grid item xs>
                  <div>
                    <strong>{album.name}</strong>
                  </div>
                  <div style={{ color: '#999', fontSize: '0.9em' }}>
                    {album.artists?.map((a) => a.name).join(', ')}
                  </div>
                </Grid>
              </Grid>
            </Paper>
          )}
          <List>
            {friends.map((friend) => (
              <ListItem key={friend.id} disablePadding>
                <ListItemButton
                  onClick={() => recommendTo(friend.friendUid)}
                  sx={{ '&:hover': { bgcolor: 'rgba(29, 185, 84, 0.1)' }, borderRadius: 1 }}
                >
                  <ListItemText primary={friend.friendName} secondary={friend.friendUid} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            color="error"
            sx={{
              borderColor: '#ff4d4f',
              color: '#ff4d4f',
              '&:hover': { borderColor: '#ff6b6d', bgcolor: 'rgba(255,77,79,0.08)' },
            }}
          >
            {t('Cancelar')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
