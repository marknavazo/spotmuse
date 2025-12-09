import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  IconButton,
  CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

import { db } from '../../firebase/firestore';
import { incrementAlbumPlay } from '../../services/firebaseService';
import auth from '../../firebase/auth';
import { getAlbumById } from '../../services/spotifyService';

export default function SongsPage() {
  const { t } = useTranslation();
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [items, setItems] = useState([]); // {trackId, trackName, album}
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'trackFavorites'), where('uid', '==', user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const rows = snap.docs.map((d) => d.data());
      // fetch albums for unique albumIds
      const byAlbum = new Map();
      const uniqueAlbumIds = Array.from(new Set(rows.map((r) => r.albumId).filter(Boolean)));
      for (const aid of uniqueAlbumIds) {
        try {
          const alb = await getAlbumById(aid);
          byAlbum.set(aid, alb);
        } catch {
          byAlbum.set(aid, null);
        }
      }
      const enriched = rows.map((r) => ({ ...r, album: byAlbum.get(r.albumId) }));
      // sort by createdAt desc if available
      enriched.sort((a, b) => {
        const ta = a.createdAt?.toDate
          ? a.createdAt.toDate().getTime()
          : Date.parse(a.createdAt || 0) || 0;
        const tb = b.createdAt?.toDate
          ? b.createdAt.toDate().getTime()
          : Date.parse(b.createdAt || 0) || 0;
        return tb - ta;
      });
      setItems(enriched);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return (
    <Container maxWidth="md" sx={{ mt: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('Canciones favoritas')}
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : items.length === 0 ? (
        <Typography color="text.secondary">{t('No tienes canciones favoritas')}</Typography>
      ) : (
        <Grid container spacing={2}>
          {items.map((it) => {
            const cover = it.album?.images?.[1]?.url || it.album?.images?.[0]?.url || '';
            const artists = it.album?.artists?.map((a) => a.name).join(', ') || '';
            const year = it.album?.release_date
              ? new Date(it.album.release_date).getFullYear()
              : '';
            return (
              <Grid item xs={12} key={`${it.albumId}_${it.trackId}`}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    gap: 2,
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                  }}
                  onClick={() => it.albumId && navigate(`/album/${it.albumId}`)}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: 2,
                      overflow: 'hidden',
                      flex: '0 0 auto',
                      bgcolor: '#222',
                    }}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={it.album?.name || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap>
                      {it.trackName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {it.album?.name || ''} {artists ? `• ${artists}` : ''}{' '}
                      {year ? `• ${year}` : ''}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {it.trackId && (
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            if (user && it.albumId) {
                              incrementAlbumPlay(user.uid, it.albumId).catch(() => {});
                            }
                            window.open(`https://open.spotify.com/track/${it.trackId}`, '_blank');
                          }}
                          sx={{ color: '#1db954' }}
                          aria-label={t('Escuchar en Spotify')}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      )}
                    </Box>
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
