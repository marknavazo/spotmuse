import { useEffect, useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Avatar,
  Box,
  IconButton,
  Paper,
  Grid,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  useMediaQuery,
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import toast from 'react-hot-toast';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTranslation } from 'react-i18next';
import { MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import AlbumCover from '../common/AlbumCover';
import { searchArtists } from '../../services/spotifyService';
import { storage } from '../../firebase/storage';
import { db } from '../../firebase/firestore';
import auth from '../../firebase/auth';

export default function ProfilePage() {
  const user = auth.currentUser;
  const [form, setForm] = useState({
    fullName: '',
    birthDate: '',
    residence: '',
    photoURL: '',
    preferredLanguage: '',
    favoriteArtists: [],
  });
  const [_loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language);
  const [artistQuery, setArtistQuery] = useState('');
  const [artistResults, setArtistResults] = useState([]);
  const [artistLoading, setArtistLoading] = useState(false);
  const isNarrow = useMediaQuery('(max-width:1500px)');

  useEffect(() => {
    setLoading(true);
    const ref = doc(db, 'users', user.uid);
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) setForm(snap.data());
        const langFromProfile = snap.exists() ? snap.data().preferredLanguage : null;
        if (langFromProfile) {
          setLang(langFromProfile);
          i18n.changeLanguage(langFromProfile);
        }
      })
      .finally(() => setLoading(false));
  }, [user, i18n]);

  function handleLangChange(e) {
    const newLang = e.target.value;
    setLang(newLang);
    setForm((prev) => ({ ...prev, preferredLanguage: newLang }));
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      setForm({ ...form, photoURL });
      toast.success('Foto subida correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user) return toast.error(t('No autenticado'));
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { ...form, uid: user.uid, preferredLanguage: lang },
        { merge: true }
      );
      i18n.changeLanguage(lang);
      toast.success(t('Perfil guardado correctamente'));
    } catch (_error) {
      toast.error(t('Error al guardar el perfil'));
    }
  }

  async function handleArtistSearch() {
    if (!artistQuery) return;
    setArtistLoading(true);
    try {
      const items = await searchArtists(artistQuery);
      setArtistResults(items);
    } catch (_e) {
      toast.error(t('Error buscando artistas'));
    } finally {
      setArtistLoading(false);
    }
  }

  function addFavoriteArtist(artist) {
    const exists = form.favoriteArtists?.some((a) => a.id === artist.id);
    if (exists) return toast.error(t('Este artista ya está en tus favoritos'));
    const newFavs = [
      ...(form.favoriteArtists || []),
      { id: artist.id, name: artist.name, images: artist.images },
    ];
    setForm((prev) => ({ ...prev, favoriteArtists: newFavs }));
    // Persist immediately
    if (user) {
      setDoc(
        doc(db, 'users', user.uid),
        {
          favoriteArtists: newFavs,
          uid: user.uid,
          preferredLanguage: form.preferredLanguage || '',
        },
        { merge: true }
      ).catch(() => {});
    }
    toast.success(t('Artista añadido a favoritos'));
  }

  function removeFavoriteArtist(id) {
    const newFavs = (form.favoriteArtists || []).filter((a) => a.id !== id);
    setForm((prev) => ({ ...prev, favoriteArtists: newFavs }));
    // Persist immediately
    if (user) {
      setDoc(
        doc(db, 'users', user.uid),
        {
          favoriteArtists: newFavs,
          uid: user.uid,
          preferredLanguage: form.preferredLanguage || '',
        },
        { merge: true }
      ).catch(() => {});
    }
  }

  if (!user) return <Typography>{t('Accede para editar tu perfil')}</Typography>;

  return (
    <Container maxWidth={false} sx={{ px: 0 }}>
      <Grid container spacing={0}>
        {/* Left: user configuration */}
        <Grid
          item
          xs={12}
          md={isNarrow ? 12 : 6}
          sx={{ p: 3, borderRight: isNarrow ? 'none' : '1px solid #333', order: isNarrow ? 1 : 0 }}
        >
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
            {t('Mi Perfil')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar src={form.photoURL} sx={{ width: 120, height: 120, mb: 2 }}>
              {form.fullName?.[0]?.toUpperCase()}
            </Avatar>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="photo-upload"
              type="file"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
            <label htmlFor="photo-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<PhotoCamera />}
                disabled={uploading}
                sx={{
                  borderColor: '#1db954',
                  color: '#1db954',
                  '&:hover': { borderColor: '#1ed760', bgcolor: 'rgba(29, 185, 84, 0.1)' },
                }}
              >
                {uploading ? t('Subiendo...') : t('Cambiar foto')}
              </Button>
            </label>
          </Box>

          <TextField
            label={t('Nombre y apellidos')}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
          />
          <TextField
            type="date"
            label={t('Fecha de nacimiento')}
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('Lugar de residencia')}
            value={form.residence}
            onChange={(e) => setForm({ ...form, residence: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
          />
          <Box sx={{ mt: 2, mb: 2 }}>
            <FormControl variant="standard" sx={{ minWidth: 120 }}>
              <InputLabel>{t('Idioma')}</InputLabel>
              <Select value={lang} onChange={handleLangChange} label={t('Idioma')}>
                <MenuItem value="es">{t('Español')}</MenuItem>
                <MenuItem value="en">{t('Inglés')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="contained"
            onClick={save}
            sx={{ mt: 1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
          >
            {t('Guardar')}
          </Button>
        </Grid>

        {/* Right: favorite artists search and list */}
        <Grid item xs={12} md={isNarrow ? 12 : 6} sx={{ p: 3, order: isNarrow ? 2 : 0 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
              {t('Grupos Favoritos')}
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={9}>
                <TextField
                  fullWidth
                  placeholder={t('Buscar artistas en Spotify')}
                  value={artistQuery}
                  onChange={(e) => setArtistQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleArtistSearch()}
                />
              </Grid>
              <Grid item xs={3}>
                <Button
                  variant="contained"
                  onClick={handleArtistSearch}
                  disabled={artistLoading}
                  sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                >
                  {artistLoading ? t('Buscando...') : t('Buscar')}
                </Button>
              </Grid>
            </Grid>

            {artistLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <CircularProgress size={20} />
                <span>{t('Buscando...')}</span>
              </Box>
            )}

            <List dense sx={{ mt: 2 }}>
              {artistResults.map((ar) => (
                <ListItem
                  key={ar.id}
                  disableGutters
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'stretch',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                    borderRadius: 1,
                  }}
                  secondaryAction={
                    <Button
                      variant="outlined"
                      onClick={() => addFavoriteArtist(ar)}
                      sx={{ borderColor: '#1db954', color: '#1db954' }}
                      disabled={(form.favoriteArtists || []).some((a) => a.id === ar.id)}
                    >
                      {(form.favoriteArtists || []).some((a) => a.id === ar.id)
                        ? t('Ya en tus favoritos')
                        : t('Añadir')}
                    </Button>
                  }
                >
                  <ListItemButton
                    onClick={() =>
                      window.open(`https://open.spotify.com/artist/${ar.id}`, '_blank')
                    }
                    sx={{ width: '100%', '&:hover': { bgcolor: 'transparent' } }}
                  >
                    {/* Mostrar imagen del grupo si existe */}
                    {ar.images?.[0]?.url && (
                      <Avatar
                        src={ar.images[0].url}
                        alt={ar.name}
                        sx={{ width: 40, height: 40, mr: 2 }}
                      />
                    )}
                    <ListItemText
                      primary={ar.name}
                      secondary={t('Seguidores') + ': ' + (ar.followers?.total || 0)}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            <Typography variant="h6" sx={{ mt: 3, fontWeight: 700 }}>
              {t('Tus grupos favoritos')} ({(form.favoriteArtists || []).length})
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {[...(form.favoriteArtists || [])]
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map((f) => (
                  <Grid item key={f.id} xs={12} sm={6}>
                    <Paper
                      sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AlbumCover images={f.images} alt={f.name} size={48} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{f.name}</div>
                        </div>
                      </Box>
                      <IconButton onClick={() => removeFavoriteArtist(f.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Paper>
                  </Grid>
                ))}
              {(form.favoriteArtists || []).length === 0 && (
                <Grid item xs={12}>
                  <Typography color="text.secondary">
                    {t('Aún no tienes artistas favoritos')}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Save button moved above; bottom area removed */}
    </Container>
  );
}
