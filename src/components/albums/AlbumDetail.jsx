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
  Box,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import ShareIcon from '@mui/icons-material/Share';
import toast from 'react-hot-toast';
import {
  collection,
  addDoc,
  query,
  where,
  doc,
  serverTimestamp,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

import SpotifyIcon from '../common/SpotifyIcon';
import { db } from '../../firebase/firestore';
import {
  incrementAlbumPlay,
  getAlbumPlayInfo,
  saveMyRating as saveMyRatingService,
  getMyRating as getMyRatingService,
  subscribeAverageRatingForAlbum,
  subscribeFriends,
  subscribeLists,
  subscribeListsForAlbum,
  subscribeAlbumOwnersCount,
  getRecommendedByName,
} from '../../services/firebaseService';
import { getAlbumById } from '../../services/spotifyService';
import auth from '../../firebase/auth';
import '../../styles/albumDetail.scss';
import AlbumCover from '../common/AlbumCover';
import { formatDate, formatYear } from '../../utils/format';

import AlbumTracks from './AlbumTracks';
import CommentsSection from './CommentsSection';
import RecommendDialog from './RecommendDialog';

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
  const [myPlayCount, setMyPlayCount] = useState(0);
  const [myLastPlayedAt, setMyLastPlayedAt] = useState(null);
  const [lists, setLists] = useState([]);
  const [albumListIds, setAlbumListIds] = useState([]);
  const [recommendedByName, setRecommendedByName] = useState('');
  const user = auth.currentUser;

  useEffect(() => {
    async function load() {
      try {
        const data = await getAlbumById(albumId);
        setAlbum(data);
        await loadMyRating(data?.id);
        const u = auth.currentUser;
        if (u && data?.id) {
          const info = await getAlbumPlayInfo(u.uid, data.id);
          setMyPlayCount(info.count || 0);
          setMyLastPlayedAt(info.lastPlayedAt || null);
        } else {
          setMyPlayCount(0);
          setMyLastPlayedAt(null);
        }
      } catch (_e) {
        toast.error(t('Error cargando álbum'));
      }
    }
    load();
  }, [albumId, t]);

  async function loadMyRating(id) {
    const u = auth.currentUser;
    if (!u || !id) return;
    const val = await getMyRatingService(u.uid, id);
    setRating(val || 0);
  }

  async function saveMyRating(val) {
    const u = auth.currentUser;
    if (!u || !album) return;
    setSavingRating(true);
    try {
      await saveMyRatingService(u.uid, album.id, val);
      setRating(val);
      toast.success(t('Puntuación guardada'));
    } catch (_e) {
      toast.error(t('Error al guardar puntuación'));
    } finally {
      setSavingRating(false);
    }
  }

  useEffect(() => {
    if (!album?.id) return;
    const unsub = subscribeAverageRatingForAlbum(album.id, (avg) => setAvgRating(avg));
    return () => unsub();
  }, [album?.id]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeFriends(user.uid, (items) => setFriends(items));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeLists(user.uid, (items) => setLists(items));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !album?.id) return;
    const unsub = subscribeListsForAlbum(user.uid, album.id, (ids) => setAlbumListIds(ids));
    return () => unsub();
  }, [user, album?.id]);

  useEffect(() => {
    if (!album?.id) return;
    const u = auth.currentUser;
    const unsub = subscribeAlbumOwnersCount(album.id, u?.uid, ({ count, mine }) => {
      setOwnersCount(count);
      setIsSaved(!!mine);
    });
    return () => unsub();
  }, [album?.id]);

  useEffect(() => {
    async function loadRec() {
      const u = auth.currentUser;
      if (!u || !album?.id) return;
      const name = await getRecommendedByName(u.uid, album.id);
      setRecommendedByName(name);
    }
    loadRec();
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

  async function updateAlbumLists(newListIds) {
    if (!user || !album) return;
    try {
      const current = new Set(albumListIds);
      const next = new Set(newListIds || []);
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

  const artists = album.artists?.map((a) => a.name).join(', ');

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={5}>
            <AlbumCover
              images={album.images}
              alt={album.name}
              className="album-detail-cover"
              size={250}
            />
          </Grid>
          <Grid item xs={12} md={7}>
            <Typography variant="h4" gutterBottom>
              {album.name}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              {artists}
            </Typography>
            <Typography variant="body2" sx={{ color: '#aaa' }}>
              {t('Año')}: {formatYear(album.release_date)}
            </Typography>
            {recommendedByName && (
              <Typography variant="body2" sx={{ color: '#aaa', mt: 0.5 }}>
                {t('Recomendado por')}: {recommendedByName}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: '#aaa', mt: 0.5 }}>
              {t('Añadido por')}: {ownersCount > 0 ? `${ownersCount} ${t('personas')}` : '-'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#aaa', mt: 0.5 }}>
              {t('Veces reproducido por ti')}: {myPlayCount}
            </Typography>
            {myLastPlayedAt && (
              <Typography variant="body2" sx={{ color: '#aaa', mt: 0.5 }}>
                {t('Última reproducción')}: {formatDate(myLastPlayedAt)}
              </Typography>
            )}
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
                onClick={() => {
                  if (user && album?.id) {
                    incrementAlbumPlay(user.uid, album.id).catch(() => {});
                  }
                  window.open(`https://open.spotify.com/album/${album.id}`, '_blank');
                }}
                sx={{ color: '#1db954' }}
              >
                <SpotifyIcon style={{ fontSize: 28 }} />
              </IconButton>
            </div>
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
                sx={{
                  bgcolor: '#1976d2',
                  color: 'white',
                  '&:hover': { bgcolor: '#2196f3', color: 'white' },
                }}
                onClick={recommendAlbum}
              >
                {t('Recomendar')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      <AlbumTracks album={album} user={user} />
      <CommentsSection albumId={album.id} user={user} friends={friends} />
      <RecommendDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        album={album}
        friends={friends}
        onRecommend={(toUid) => recommendTo(toUid)}
      />
    </Container>
  );
}
