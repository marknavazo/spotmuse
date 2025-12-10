import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useTranslation } from 'react-i18next';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

import SpotifyIcon from '../common/SpotifyIcon';
import { db } from '../../firebase/firestore';
import {
  incrementAlbumPlay,
  toggleFavoriteTrack as toggleFavoriteTrackService,
} from '../../services/firebaseService';

export default function AlbumTracks({ album, user }) {
  const { t } = useTranslation();
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsTrack, setLyricsTrack] = useState(null);
  const [lyricsText, setLyricsText] = useState('');
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState([]);

  useEffect(() => {
    if (!album?.id || !user) return;
    const favRef = collection(db, 'trackFavorites');
    const qFav = query(favRef, where('uid', '==', user.uid), where('albumId', '==', album.id));
    const unsub = onSnapshot(qFav, (snap) => {
      const ids = snap.docs.map((d) => d.data().trackId).filter(Boolean);
      setFavoriteTrackIds(ids);
    });
    return () => unsub();
  }, [album?.id, user]);

  async function toggleFavoriteTrack(track) {
    if (!user || !album || !track?.id) return;
    try {
      await toggleFavoriteTrackService(user.uid, album.id, track);
    } catch (_e) {
      toast.error(t('Error al actualizar favorito'));
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
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        res = await fetch(proxyUrl, { signal: controller.signal });
        if (res.ok) {
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
      setLyricsText('');
    } finally {
      clearTO(timeoutId);
      setLoadingLyrics(false);
    }
  }

  if (showLyrics) {
    return (
      <Box sx={{ p: 3, mt: 2 }} component={PaperLike}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('Letra')}
        </Typography>
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
    );
  }

  return (
    <Box sx={{ p: 3, mt: 2 }} component={PaperLike}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('Canciones')}
      </Typography>
      {Array.isArray(album.tracks?.items) && album.tracks.items.length > 0 ? (
        <List dense>
          {album.tracks.items.map((track, idx) => (
            <ListItem
              key={track.id || idx}
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <IconButton
                    onClick={() => toggleFavoriteTrack(track)}
                    sx={{ color: favoriteTrackIds.includes(track.id) ? '#ffd700' : '#aaa' }}
                    aria-label={t('Marcar como favorito')}
                  >
                    {favoriteTrackIds.includes(track.id) ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      if (user && album?.id) {
                        incrementAlbumPlay(user.uid, album.id).catch(() => {});
                      }
                      window.open(`https://open.spotify.com/track/${track.id}`, '_blank');
                    }}
                    sx={{ color: '#1db954' }}
                    aria-label={t('Escuchar en Spotify')}
                  >
                    <SpotifyIcon style={{ fontSize: 28 }} />
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
        <Typography color="text.secondary">{t('No disponible')}</Typography>
      )}
    </Box>
  );
}

function formatDuration(ms) {
  if (!ms && ms !== 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function PaperLike(props) {
  // Lightweight wrapper to preserve existing Paper padding and margins via Box
  return <div style={{ background: 'transparent' }} {...props} />;
}
