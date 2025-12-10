import { useEffect, useState } from 'react';
import { Container, Typography, Paper, Grid, Button, Avatar, Box, IconButton } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';

import SpotifyIcon from '../common/SpotifyIcon';
import AlbumCover from '../common/AlbumCover';
import { db } from '../../firebase/firestore';
import auth from '../../firebase/auth';

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [userAlbums, setUserAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;
  const { t } = useTranslation();
  const [avgRatings, setAvgRatings] = useState({});
  const [ownersByAlbumId, setOwnersByAlbumId] = useState({});

  useEffect(() => {
    async function loadUserData() {
      try {
        // Load user profile
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }

        // Load user albums
        const albumsRef = collection(db, 'albums');
        const q = query(albumsRef, where('owner', '==', userId));
        const snapshot = await getDocs(q);
        setUserAlbums(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_error) {
        toast.error(t('Error al cargar el perfil'));
      } finally {
        setLoading(false);
      }
    }
    loadUserData();
  }, [userId, t]);

  // Subscribe to ratings to compute global averages
  useEffect(() => {
    const ratingsRef = collection(db, 'ratings');
    const unsub = onSnapshot(ratingsRef, (snap) => {
      const totals = {};
      const counts = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.albumId || typeof data.value !== 'number') return;
        totals[data.albumId] = (totals[data.albumId] || 0) + data.value;
        counts[data.albumId] = (counts[data.albumId] || 0) + 1;
      });
      const avgMap = {};
      Object.keys(totals).forEach((id) => {
        avgMap[id] = totals[id] / counts[id];
      });
      setAvgRatings(avgMap);
    });
    return () => unsub();
  }, []);

  // Refresh owners count for albums displayed on this profile
  useEffect(() => {
    async function refreshOwners() {
      const ids = new Set(userAlbums.map((a) => a.albumId));
      for (const id of ids) {
        const snap = await getDocs(query(collection(db, 'albums'), where('albumId', '==', id)));
        setOwnersByAlbumId((prev) => ({ ...prev, [id]: snap.docs.map((d) => d.data().owner) }));
      }
    }
    if (userAlbums.length) refreshOwners();
  }, [userAlbums]);

  async function addAlbumToMyCollection(album) {
    try {
      // Check if album already exists in user's collection
      const albumsRef = collection(db, 'albums');
      const q = query(
        albumsRef,
        where('owner', '==', currentUser.uid),
        where('albumId', '==', album.albumId)
      );
      const existing = await getDocs(q);

      if (!existing.empty) {
        toast.error('Ya tienes este álbum en tu colección');
        return;
      }

      await addDoc(collection(db, 'albums'), {
        owner: currentUser.uid,
        albumId: album.albumId,
        name: album.name,
        artists: album.artists,
        images: album.images,
        releaseDate: album.releaseDate,
        addedAt: new Date().toISOString(),
      });
      toast.success(t('Álbum añadido a tu colección'));
    } catch (_error) {
      toast.error(t('Error al añadir el álbum'));
    }
  }

  if (loading) {
    return (
      <Container>
        <Typography>{t('Cargando...')}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ px: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3, color: '#1db954' }}
      >
        {t('Volver')}
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar src={userProfile?.photoURL} sx={{ width: 100, height: 100 }}>
            {userProfile?.fullName?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4">{userProfile?.fullName || 'Usuario'}</Typography>
            <Typography variant="body1" color="text.secondary">
              {userProfile?.residence}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {userAlbums.length} {t('Álbumes')}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {userProfile?.favoriteArtists && userProfile.favoriteArtists.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('Grupos favoritos')}
          </Typography>
          <Grid container spacing={2}>
            {userProfile.favoriteArtists.map((f) => (
              <Grid item key={f.id} xs={12} sm={6} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AlbumCover images={f.images} alt={f.name} size={56} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {f.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <span
                        style={{ cursor: 'pointer', color: '#1db954', textDecoration: 'underline' }}
                        onClick={() =>
                          window.open(`https://open.spotify.com/artist/${f.id}`, '_blank')
                        }
                      >
                        {t('Ver en Spotify')}
                      </span>
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      <Typography variant="h5" sx={{ mb: 3 }}>
        {t('Álbumes de {{name}}', { name: userProfile?.fullName || t('Usuario') })}
      </Typography>

      <Grid container spacing={2} columns={12}>
        {userAlbums.map((album) => (
          <Grid item key={album.id} xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2 }}>
              <AlbumCover
                images={album.images}
                alt={album.name}
                onClick={() => navigate(`/album/${album.albumId}`)}
                className="album-card-cover"
              />
              <Typography
                variant="subtitle1"
                sx={{
                  mt: 1,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: '#1db954',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }}
                onClick={() => navigate(`/album/${album.albumId}`)}
                title={album.name}
              >
                {album.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }}
                title={album.artists}
              >
                {album.artists}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9em' }}>
                {album.releaseDate ? new Date(album.releaseDate).getFullYear() : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t('Media')}:{' '}
                {typeof avgRatings[album.albumId] === 'number'
                  ? Number(avgRatings[album.albumId]).toFixed(1)
                  : '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {t('Añadido por')}:{' '}
                {ownersByAlbumId[album.albumId]?.length
                  ? `${ownersByAlbumId[album.albumId].length} ${t('personas')}`
                  : '-'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => addAlbumToMyCollection(album)}
                  sx={{
                    bgcolor: '#1db954',
                    '&:hover': { bgcolor: '#1ed760' },
                  }}
                >
                  {t('Añadir a mi colección')}
                </Button>
                <IconButton
                  onClick={() =>
                    window.open(`https://open.spotify.com/album/${album.albumId}`, '_blank')
                  }
                  sx={{ color: '#1db954' }}
                  aria-label={t('Escuchar en Spotify')}
                >
                  <SpotifyIcon style={{ fontSize: 28 }} />
                </IconButton>
              </Box>
            </Paper>
          </Grid>
        ))}
        {userAlbums.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {t('Este usuario aún no tiene álbumes en su colección')}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
