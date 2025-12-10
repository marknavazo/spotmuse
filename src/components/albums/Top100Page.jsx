import { useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import {
  Container,
  Grid,
  Paper,
  Typography,
  IconButton,
  CircularProgress,
  Box,
  Button,
  Skeleton,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

import SpotifyIcon from '../common/SpotifyIcon';
import { db } from '../../firebase/firestore';
import { getAlbumById } from '../../services/spotifyService';
import AlbumCover from '../common/AlbumCover';
import auth from '../../firebase/auth';

export default function Top100Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ratings, setRatings] = useState([]);
  const [albumsMeta, setAlbumsMeta] = useState({}); // albumId -> {name, artists, images, releaseDate}
  const [loading, setLoading] = useState(true);
  const [myAlbums, setMyAlbums] = useState([]);
  const user = auth.currentUser;

  // subscribe to all ratings and compute averages
  useEffect(() => {
    const ratingsRef = collection(db, 'ratings');
    const q = query(ratingsRef);
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => d.data());
      setRatings(arr);
      setLoading(false);
    });
    // subscribe to my albums to disable add button when already saved
    let unsubMy = () => {};
    if (user) {
      const myRef = collection(db, 'albums');
      const qMy = query(myRef, where('owner', '==', user.uid));
      unsubMy = onSnapshot(qMy, (snap) => {
        setMyAlbums(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    }
    return () => {
      unsub();
      unsubMy();
    };
  }, [user]);

  const top100 = useMemo(() => {
    const totals = new Map();
    const counts = new Map();
    ratings.forEach((r) => {
      if (!r.albumId || typeof r.value !== 'number') return;
      totals.set(r.albumId, (totals.get(r.albumId) || 0) + r.value);
      counts.set(r.albumId, (counts.get(r.albumId) || 0) + 1);
    });
    const list = Array.from(totals.keys()).map((albumId) => {
      const total = totals.get(albumId) || 0;
      const count = counts.get(albumId) || 0;
      const avg = count > 0 ? total / count : 0;
      return { albumId, avg, count };
    });
    list.sort((a, b) => b.avg - a.avg || b.count - a.count);
    return list.slice(0, 100);
  }, [ratings]);

  // ensure we have metadata for visible albums (from albums collection or Spotify)
  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      const missing = top100.filter(({ albumId }) => !albumsMeta[albumId]).map((i) => i.albumId);
      if (missing.length === 0) return;
      // Try Spotify for metadata (fallback approach)
      const updates = {};
      for (const id of missing) {
        try {
          const data = await getAlbumById(id);
          updates[id] = {
            name: data?.name || id,
            artists: Array.isArray(data?.artists) ? data.artists.map((a) => a.name).join(', ') : '',
            images: data?.images || [],
            releaseDate: data?.release_date || '',
          };
        } catch (_e) {
          updates[id] = { name: id, artists: '', images: [], releaseDate: '' };
        }
      }
      if (isMounted) setAlbumsMeta((prev) => ({ ...prev, ...updates }));
    }
    hydrate();
    return () => {
      isMounted = false;
    };
  }, [top100, albumsMeta]);

  async function saveAlbumFromTop(albumId) {
    if (!user) return toast.error(t('Accede para guardar álbumes'));
    const meta = albumsMeta[albumId] || {};
    try {
      await addDoc(collection(db, 'albums'), {
        owner: user.uid,
        albumId,
        name: meta.name || albumId,
        artists: meta.artists || '',
        images: meta.images || [],
        releaseDate: meta.releaseDate || '',
        addedAt: new Date().toISOString(),
      });
      toast.success(t('Álbum guardado'));
    } catch (_e) {
      toast.error(t('Error al guardar álbum'));
    }
  }

  // Responsive columns
  const lt800 = useMediaQuery('(max-width:800px)');
  const lt1200 = useMediaQuery('(max-width:1200px)');
  const lt1600 = useMediaQuery('(max-width:1600px)');
  let itemWidth = '12.5%'; // 8 per row
  if (lt800)
    itemWidth = '50%'; // 2 per row
  else if (lt1200)
    itemWidth = '25%'; // 4 per row
  else if (lt1600) itemWidth = '16.6667%'; // 6 per row

  return (
    <Container maxWidth={false} sx={{ mt: 2, px: 2 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        TOP 100 - {t('Mejor puntuación media')}
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : top100.length === 0 ? (
        <Typography color="text.secondary">{t('Aún no hay puntuaciones')}</Typography>
      ) : (
        <Grid container spacing={2}>
          {top100.map(({ albumId, avg, count }, idx) => {
            const meta = albumsMeta[albumId] || {};
            const hasMeta = !!(meta.name || (Array.isArray(meta.images) && meta.images.length));
            const cover = meta.images?.[1]?.url || meta.images?.[0]?.url;
            return (
              <Grid
                item
                key={albumId}
                sx={{
                  width: itemWidth,
                  flexGrow: 0,
                  flexShrink: 0,
                }}
              >
                <Paper sx={{ p: 2 }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}
                  >
                    <Typography variant="subtitle2">#{idx + 1}</Typography>
                    <Typography variant="subtitle2">{avg.toFixed(1)} ⭐</Typography>
                  </div>
                  <AlbumCover
                    images={meta.images}
                    alt={meta.name || ''}
                    className="album-card-cover"
                    onClick={() => navigate(`/album/${albumId}`)}
                  />
                  {hasMeta ? (
                    <Typography
                      variant="subtitle1"
                      sx={{
                        mt: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/album/${albumId}`)}
                      title={meta.name || ''}
                    >
                      {meta.name || ''}
                    </Typography>
                  ) : (
                    <Skeleton variant="text" width="80%" sx={{ mt: 1 }} />
                  )}
                  {meta.artists ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={meta.artists}
                    >
                      {meta.artists}
                    </Typography>
                  ) : (
                    <Skeleton variant="text" width="60%" sx={{ mt: 0.5 }} />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {t('Votos')}: {count}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <IconButton
                      onClick={() =>
                        window.open(`https://open.spotify.com/album/${albumId}`, '_blank')
                      }
                      sx={{ color: '#1db954' }}
                    >
                      <SpotifyIcon style={{ fontSize: 28 }} />
                    </IconButton>
                    <Button
                      variant="contained"
                      sx={{ ml: 1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                      onClick={() => saveAlbumFromTop(albumId)}
                      disabled={myAlbums.some((a) => (a.albumId || a.album?.id) === albumId)}
                    >
                      {myAlbums.some((a) => (a.albumId || a.album?.id) === albumId)
                        ? t('Ya en tu colección')
                        : t('Añadir a mi colección')}
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
