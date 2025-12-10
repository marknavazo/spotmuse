import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Box,
  Typography,
  useMediaQuery,
  IconButton,
  Tooltip,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ListIcon from '@mui/icons-material/List';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
// import { useNavigate } from 'react-router-dom';

import { db } from '../../firebase/firestore';
import auth from '../../firebase/auth';
import { getArtistById } from '../../services/spotifyService';

export default function GroupsPage() {
  // Formateador para números grandes
  const formatFollowers = (n) => {
    return n ? new Intl.NumberFormat('es-ES').format(n) : '0';
  };
  const [view, setView] = useState('grid'); // 'grid' or 'list'
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">{t('Grupos')}</Typography>
        <Box>
          <Tooltip title={t('Vista de cuadrícula')}>
            <IconButton
              onClick={() => setView('grid')}
              sx={{
                color: view === 'grid' ? '#1db954' : '#888',
                background: view === 'grid' ? 'rgba(29,185,84,0.08)' : 'transparent',
                mr: 1,
              }}
            >
              <GridViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('Vista de listado')}>
            <IconButton
              onClick={() => setView('list')}
              sx={{
                color: view === 'list' ? '#1db954' : '#888',
                background: view === 'list' ? 'rgba(29,185,84,0.08)' : 'transparent',
              }}
            >
              <ListIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {view === 'grid' && (
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
                        {t('Seguidores')}: {formatFollowers(followersById[f.id])}
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
      )}

      {/* List view will be implemented next */}
      {view === 'list' && (
        <Grid container spacing={2}>
          {[...favorites]
            .map((f) => ({
              ...f,
              followers: followersById[f.id] ?? 0,
            }))
            .sort((a, b) => b.followers - a.followers)
            .map((f, idx) => {
              const cover = f.images?.[1]?.url || f.images?.[0]?.url;
              let bgColor = 'background.paper';
              let textColor = undefined;
              // Tonos suaves y modernos para oro, plata y bronce
              if (idx === 0) {
                bgColor = '#f7e7b3';
                textColor = '#222';
              }
              if (idx === 1) {
                bgColor = '#e3e6ea';
                textColor = '#222';
              }
              if (idx === 2) {
                bgColor = '#e7c7a3';
                textColor = '#222';
              }
              return (
                <Grid item key={f.id} xs={12} sm={6} md={4} lg={3} xl={2.4}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      backgroundColor: bgColor,
                      borderRadius: 2,
                      boxShadow: 1,
                      p: 2,
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: 3 },
                    }}
                    onClick={() => window.open(`https://open.spotify.com/artist/${f.id}`, '_blank')}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={f.name}
                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }}
                      />
                    ) : (
                      <Box sx={{ width: 56, height: 56, borderRadius: 8, bgcolor: '#eee' }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 700, mb: 0.5, color: textColor }}
                      >
                        {f.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: textColor || 'text.secondary' }}>
                        {t('Seguidores')}: {formatFollowers(f.followers)}
                      </Typography>
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
      )}
    </Container>
  );
}
