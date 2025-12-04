import { useEffect, useState } from 'react';
import { Container, Typography, Paper, Grid, Button, Avatar, Box } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';

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
                  <img
                    src={f.images?.[2]?.url || f.images?.[0]?.url}
                    alt={f.name}
                    style={{ width: 56, height: 56, borderRadius: 4, objectFit: 'cover' }}
                  />
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

      <Grid container spacing={2}>
        {userAlbums.map((album) => (
          <Grid item key={album.id} xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <img
                src={album.images?.[0]?.url || album.images?.[2]?.url}
                alt={album.name}
                style={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/album/${album.albumId}`)}
              />
              <Typography
                variant="subtitle1"
                sx={{
                  mt: 1,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: '#1db954',
                  textDecoration: 'underline',
                }}
                onClick={() => navigate(`/album/${album.albumId}`)}
              >
                {album.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {album.artists}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9em' }}>
                {album.releaseDate ? new Date(album.releaseDate).getFullYear() : ''}
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
                <Button
                  variant="outlined"
                  sx={{
                    color: '#1db954',
                    borderColor: '#1db954',
                    '&:hover': { borderColor: '#1ed760' },
                  }}
                  onClick={() =>
                    window.open(`https://open.spotify.com/album/${album.albumId}`, '_blank')
                  }
                >
                  {t('Play')}
                </Button>
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
