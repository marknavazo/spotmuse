import { useEffect, useRef, useState, useCallback } from 'react';
import { Container, Grid, Paper, Typography, Box, CircularProgress } from '@mui/material';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import auth from '../../firebase/auth';
import { db } from '../../firebase/firestore';
import { getAlbumById } from '../../services/spotifyService';

export default function Home() {
  const [user, setUser] = useState(auth.currentUser);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const cursorRef = useRef(null);
  const sentinelRef = useRef(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchPage = useCallback(async () => {
    if (!user || loading || done) return;
    setLoading(true);
    try {
      let snap;
      const usePrimary = !useFallback;
      if (usePrimary) {
        const baseQuery = query(
          collection(db, 'comments'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const q = cursorRef.current ? query(baseQuery, startAfter(cursorRef.current)) : baseQuery;
        snap = await getDocs(q);
      } else {
        const baseQuery = query(
          collection(db, 'comments'),
          orderBy('createdAt', 'desc'),
          limit(25)
        );
        const q = cursorRef.current ? query(baseQuery, startAfter(cursorRef.current)) : baseQuery;
        snap = await getDocs(q);
      }
      if (snap.empty) {
        setDone(true);
        setLoading(false);
        return;
      }
      let docs = snap.docs;
      if (useFallback) {
        docs = docs.filter((d) => d.data().uid === user.uid);
      }
      cursorRef.current = docs.at(-1);
      const rows = await Promise.all(
        docs.map(async (d) => {
          const data = d.data();
          const album = data.albumId ? await getAlbumById(data.albumId) : null;
          return {
            id: d.id,
            comment: data.text || '',
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt || Date.now()),
            album,
          };
        })
      );
      setItems((prev) => [...prev, ...rows]);
    } catch (_e) {
      // Switch to fallback if composite index missing for where + orderBy
      setUseFallback(true);
    } finally {
      setLoading(false);
    }
  }, [user, loading, done, useFallback]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    cursorRef.current = null;
    setItems([]);
    setDone(false);
    if (user) fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const IO = typeof globalThis !== 'undefined' ? globalThis.IntersectionObserver : undefined;
    if (!IO) return;
    const io = new IO((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        fetchPage();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [fetchPage]);

  return (
    <Container maxWidth="md" sx={{ mt: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('Inicio')}
      </Typography>
      {!user && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      <Grid container spacing={2}>
        {items.map((it) => {
          const cover = it.album?.images?.[1]?.url || it.album?.images?.[0]?.url || '';
          const artists = it.album?.artists?.map((a) => a.name).join(', ') || '';
          const year = it.album?.release_date ? new Date(it.album.release_date).getFullYear() : '';
          return (
            <Grid item xs={12} key={it.id}>
              <Paper
                sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => {
                  if (it.album?.id) navigate(`/album/${it.album.id}`);
                }}
              >
                <Box
                  sx={{
                    width: 100,
                    height: 100,
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
                    {it.album?.name || ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {artists} {year ? `• ${year}` : ''}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {it.comment}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    {it.createdAt?.toLocaleString?.() || ''}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        {loading && <CircularProgress size={24} />}
        {done && items.length === 0 && (
          <Typography color="text.secondary">{t('No hay comentarios todavía')}</Typography>
        )}
      </Box>
    </Container>
  );
}
