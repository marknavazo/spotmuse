import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Grid, Paper, Typography, Button, IconButton } from '@mui/material'
import { useTranslation } from 'react-i18next'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ShareIcon from '@mui/icons-material/Share'
import toast from 'react-hot-toast'
import auth from '../../firebase/auth'
import { db } from '../../firebase/firestore'
import { collection, addDoc } from 'firebase/firestore'
import { getAlbumById } from '../../services/spotifyService'

export default function AlbumDetail() {
  const { t } = useTranslation()
  const { albumId } = useParams()
  const [album, setAlbum] = useState(null)
  const user = auth.currentUser

  useEffect(() => {
    async function load() {
      try {
        const data = await getAlbumById(albumId)
        setAlbum(data)
      } catch (e) {
        toast.error(t('Error cargando álbum'))
      }
    }
    load()
  }, [albumId, t])

  async function saveAlbum() {
    if (!user || !album) return toast.error(t('Accede para guardar álbumes'))
    try {
      await addDoc(collection(db, 'albums'), {
        owner: user.uid,
        albumId: album.id,
        name: album.name,
        artists: album.artists.map(a=>a.name).join(', '),
        images: album.images,
        releaseDate: album.release_date,
        addedAt: new Date().toISOString()
      })
      toast.success(t('Álbum guardado'))
    } catch (error) {
      toast.error(t('Error al guardar álbum'))
    }
  }

  function recommendAlbum() {
    // We reuse the existing recommendation flow from AlbumsPage via dialog.
    // For now, simply open Spotify or show a toast; could navigate back to AlbumsPage and open dialog.
    toast(t('Abre la página de Álbumes para recomendar'))
  }

  if (!album) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>{t('Cargando álbum...')}</Typography>
      </Container>
    )
  }

  const cover = album.images?.[0]?.url
  const artists = album.artists?.map(a=>a.name).join(', ')
  const year = album.release_date ? new Date(album.release_date).getFullYear() : '-'

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={5}>
            <img src={cover} alt={album.name} style={{ width: '100%', borderRadius: 8 }} />
          </Grid>
          <Grid item xs={12} md={7}>
            <Typography variant="h4" gutterBottom>{album.name}</Typography>
            <Typography variant="subtitle1" gutterBottom>{artists}</Typography>
            <Typography variant="body2" sx={{ color: '#aaa' }}>{t('Año')}: {year}</Typography>
            <div style={{ marginTop: 16 }}>
              <IconButton onClick={() => window.open(`https://open.spotify.com/album/${album.id}`, '_blank')} sx={{ color: '#1db954' }}>
                <PlayArrowIcon />
              </IconButton>
            </div>
            <div style={{ marginTop: 16 }}>
              <Button variant="contained" sx={{ mr: 2, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }} onClick={saveAlbum}>
                {t('Guardar')}
              </Button>
              <Button 
                variant="contained"
                color="secondary"
                startIcon={<ShareIcon />}
                sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#2196f3' } }}
                onClick={recommendAlbum}
              >
                {t('Recomendar')}
              </Button>
            </div>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  )
}
