import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Checkbox,
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
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

import { db } from '../../firebase/firestore';
import { getAlbumById } from '../../services/spotifyService';
import auth from '../../firebase/auth';

export default function AlbumDetail() {
  const { t } = useTranslation();
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [friends, setFriends] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  const [avgRating, setAvgRating] = useState(null);
  const [ownersCount, setOwnersCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [lists, setLists] = useState([]);
  const [albumListIds, setAlbumListIds] = useState([]);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsTrack, setLyricsTrack] = useState(null);
  const [lyricsText, setLyricsText] = useState('');
  const [loadingLyrics, setLoadingLyrics] = useState(false);
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

  // Subscribe to my lists for add-to-list dropdown
  useEffect(() => {
    if (!user) return;
    const listsRef = collection(db, 'lists');
    const ql = query(listsRef, where('owner', '==', user.uid));
    const unsub = onSnapshot(ql, (snap) => {
      setLists(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Subscribe to list memberships for this album (preselect in multiselect)
  useEffect(() => {
    if (!user || !album?.id) return;
    const laRef = collection(db, 'listAlbums');
    const qla = query(laRef, where('owner', '==', user.uid), where('albumId', '==', album.id));
    const unsub = onSnapshot(qla, (snap) => {
      const ids = snap.docs.map((d) => d.data().listId).filter(Boolean);
      setAlbumListIds(ids);
    });
    return () => unsub();
  }, [user, album?.id]);

  // Subscribe to how many users have added this album
  useEffect(() => {
    if (!album?.id) return;
    const albumsRef = collection(db, 'albums');
    const qAlbums = query(albumsRef, where('albumId', '==', album.id));
    const unsub = onSnapshot(qAlbums, (snap) => {
      setOwnersCount(snap.docs.length);
      // Check if current user already saved it
      const u = auth.currentUser;
      if (u) {
        const mine = snap.docs.some((d) => d.data().owner === u.uid);
        setIsSaved(mine);
      } else {
        setIsSaved(false);
      }
    });
    return () => unsub();
  }, [album?.id]);

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

  async function fetchLyrics(track, artistName) {
    const title = track?.name || '';
    const artist = artistName || '';
    if (!title || !artist) return;
    setShowLyrics(true);
    setLyricsTrack(track);
    setLoadingLyrics(true);
    setLyricsText('');
    const Controller =
      typeof globalThis !== 'undefined' && globalThis.AbortController
        ? globalThis.AbortController
        : undefined;
    const controller = Controller ? new Controller() : { abort: () => {} };
    const setTO =
      typeof globalThis !== 'undefined' && globalThis.setTimeout
        ? globalThis.setTimeout
        : setTimeout;
    const clearTO =
      typeof globalThis !== 'undefined' && globalThis.clearTimeout
        ? globalThis.clearTimeout
        : () => {};
    const timeoutId = setTO(() => controller.abort(), 7000);
    try {
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      let res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        setLyricsText(data?.lyrics || '');
      } else {
        // Try a CORS proxy fallback (AllOrigins)
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        res = await fetch(proxyUrl, { signal: controller.signal });
        if (res.ok) {
          // Some proxies return plain text; attempt JSON parse then fallback to text
          let text = '';
          try {
            const data = await res.json();
            text = data?.lyrics || '';
          } catch {
            text = await res.text();
          }
          setLyricsText(text || '');
        } else {
          setLyricsText('');
        }
      }
    } catch (_e) {
      // On timeout or network/CORS error, show not available
      setLyricsText('');
    } finally {
      clearTO(timeoutId);
      setLoadingLyrics(false);
    }
  }

  async function updateAlbumLists(newListIds) {
    if (!user || !album) return;
    try {
      const current = new Set(albumListIds);
      const next = new Set(newListIds || []);
      // Add to lists present in next but not in current
      for (const id of next) {
        if (!current.has(id)) {
          await addDoc(collection(db, 'listAlbums'), {
            owner: user.uid,
            listId: id,
            albumId: album.id,
            name: album.name,
            artists: album.artists.map((a) => a.name).join(', '),
            images: album.images,
            releaseDate: album.release_date,
            createdAt: serverTimestamp(),
          });
        }
      }
      // Remove from lists present in current but not in next
      for (const id of current) {
        if (!next.has(id)) {
          const qDel = query(
            collection(db, 'listAlbums'),
            where('owner', '==', user.uid),
            where('listId', '==', id),
            where('albumId', '==', album.id)
          );
          const delSnap = await getDocs(qDel);
          await Promise.all(delSnap.docs.map((d) => deleteDoc(doc(db, 'listAlbums', d.id))));
        }
      }
      setAlbumListIds([...next]);
      toast.success(t('Listas actualizadas'));
    } catch (_e) {
      toast.error(t('Error al actualizar listas'));
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
            <Typography variant="body2" sx={{ color: '#aaa', mt: 0.5 }}>
              {t('Añadido por')}: {ownersCount > 0 ? `${ownersCount} ${t('personas')}` : '-'}
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
            {/* First line: add to list selector */}
            {lists.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  select
                  size="small"
                  sx={{ minWidth: 320 }}
                  SelectProps={{
                    multiple: true,
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected || selected.length === 0) return t('Añadir a listas');
                      const names = lists
                        .filter((l) => Array.isArray(selected) && selected.includes(l.id))
                        .map((l) => l.name);
                      return names.join(', ');
                    },
                  }}
                  value={albumListIds}
                  onChange={(e) => updateAlbumLists(e.target.value)}
                >
                  {lists.map((lst) => (
                    <MenuItem key={lst.id} value={lst.id} sx={{ py: 0.5 }}>
                      <Checkbox checked={albumListIds.includes(lst.id)} sx={{ mr: 1 }} />
                      {lst.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            )}
            {/* Second line: save and recommend buttons */}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                sx={{ mr: 2, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                onClick={saveAlbum}
                disabled={isSaved}
              >
                {isSaved ? t('Ya en tu colección') : t('Añadir a mi colección')}
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
            </Box>
          </Grid>
        </Grid>
      </Paper>
      {/* Tracks list */}
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {showLyrics ? t('Letra') : t('Canciones')}
        </Typography>
        {showLyrics ? (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {lyricsTrack ? lyricsTrack.name : ''}
            </Typography>
            {loadingLyrics ? (
              <CircularProgress size={20} />
            ) : lyricsText ? (
              <Typography whiteSpace="pre-line">{lyricsText}</Typography>
            ) : (
              <Typography color="text.secondary">{t('No disponible')}</Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                onClick={() => {
                  setShowLyrics(false);
                  setLyricsText('');
                  setLyricsTrack(null);
                }}
              >
                {t('Volver al listado de canciones')}
              </Button>
            </Box>
          </Box>
        ) : Array.isArray(album.tracks?.items) && album.tracks.items.length > 0 ? (
          <List dense>
            {album.tracks.items.map((track, idx) => (
              <ListItem
                key={track.id || idx}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      onClick={() =>
                        window.open(`https://open.spotify.com/track/${track.id}`, '_blank')
                      }
                      sx={{ color: '#1db954' }}
                      aria-label={t('Escuchar en Spotify')}
                    >
                      <PlayArrowIcon />
                    </IconButton>
                    <Button
                      variant="outlined"
                      sx={{ borderColor: '#1db954', color: '#1db954' }}
                      onClick={() => fetchLyrics(track, album.artists?.[0]?.name)}
                    >
                      {t('Ver letra')}
                    </Button>
                  </Box>
                }
              >
                <ListItemText
                  primary={`${idx + 1}. ${track.name}`}
                  secondary={formatDuration(track.duration_ms)}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">{t('No hay canciones disponibles')}</Typography>
        )}
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

// (removed duplicate fetchLyrics; logic lives inside component above)

function formatDuration(ms) {
  if (!ms && ms !== 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
