import { useEffect, useState } from 'react';
import { Container, Grid, Box, Typography, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
// import { useNavigate } from 'react-router-dom';

import { db } from '../../firebase/firestore';
import auth from '../../firebase/auth';
import { getArtistById } from '../../services/spotifyService';

export default function GroupsPage() {
  const { t } = useTranslation();
  const user = auth.currentUser;
  // const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]); // { id, name, images }
  const [followersById, setFollowersById] = useState({});
  const lt1600 = useMediaQuery('(max-width:1600px)');
  const lt1200 = useMediaQuery('(max-width:1200px)');
  const lt800 = useMediaQuery('(max-width:800px)');
  const lt500 = useMediaQuery('(max-width:500px)');
  const itemWidth = lt500
    ? '50%'
    : lt800
      ? '33.3333%'
      : lt1200
        ? '25%'
        : lt1600
          ? '16.6667%'
          : '12.5%';

  useEffect(() => {
    let isMounted = true;
    async function loadFavs() {
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      const favs = snap.exists() ? snap.data().favoriteArtists || [] : [];
      if (!isMounted) return;
      setFavorites(favs);
      // fetch followers for each artist
      const updates = {};
      for (const f of favs) {
        try {
          const data = await getArtistById(f.id);
          updates[f.id] = data?.followers?.total || 0;
        } catch (_) {
          updates[f.id] = 0;
        }
      }
      if (isMounted) setFollowersById((prev) => ({ ...prev, ...updates }));
    }
    loadFavs();
    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <Container maxWidth={false} sx={{ mt: 2, px: 0 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {t('Grupos')}
      </Typography>
      <Grid container spacing={0}>
        {favorites.map((f) => {
          const cover = f.images?.[1]?.url || f.images?.[0]?.url;
          return (
            <Grid item key={f.id} sx={{ width: itemWidth, flexGrow: 0, flexShrink: 0 }}>
              <Box
                sx={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => window.open(`https://open.spotify.com/artist/${f.id}`, '_blank')}
              >
                {cover && (
                  <img
                    src={cover}
                    alt={f.name}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0)',
                    transition: 'background-color 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    p: 1,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
                  }}
                >
                  <Box
                    sx={{
                      opacity: 0,
                      color: '#fff',
                      transition: 'opacity 0.2s ease',
                      // show text when parent overlay hovered
                      '.MuiBox-root:hover &': { opacity: 1 },
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {f.name}
                    </div>
                    <div style={{ fontSize: '0.9em' }}>
                      {t('Seguidores')}: {followersById[f.id] ?? ''}
                    </div>
                  </Box>
                </Box>
              </Box>
            </Grid>
          );
        })}
        {favorites.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">
                {t('Aún no tienes artistas favoritos')}
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
