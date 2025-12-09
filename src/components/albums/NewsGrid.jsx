import { Box, CircularProgress, Grid, IconButton, Paper, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import AlbumCover from '../common/AlbumCover';

export default function NewsGrid({
  t,
  news,
  newsLoading,
  user,
  navigate,
  incrementAlbumPlay,
  saveAlbum,
  myAlbums,
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <h3>
        {t('Novedades basadas en tus favoritos')} ({news.length})
      </h3>
      {newsLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={20} />
          <span>{t('Cargando...')}</span>
        </Box>
      )}
      <Grid container spacing={1} sx={{ mt: 1 }}>
        {news.map((album) => (
          <Grid item key={album.id} xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <AlbumCover
                images={album.images}
                alt={album.name}
                className="album-card-cover"
                onClick={() => navigate(`/album/${album.id}`)}
              />
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <strong
                  className="link-underline"
                  onClick={() => navigate(`/album/${album.id}`)}
                  title={album.name}
                >
                  {album.name}
                </strong>
              </div>
              <div
                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                title={album.artists?.map((a) => a.name).join(', ')}
              >
                {album.artists?.map((a) => a.name).join(', ')}
              </div>
              <div style={{ color: '#999', fontSize: '0.9em', marginTop: 4 }}>
                {album.release_date ? new Date(album.release_date).getFullYear() : ''}
              </div>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <IconButton
                  onClick={() => {
                    if (user && album.id) {
                      incrementAlbumPlay(user.uid, album.id).catch(() => {});
                    }
                    const url =
                      album.external_urls?.spotify || `https://open.spotify.com/album/${album.id}`;
                    window.open(url, '_blank');
                  }}
                  sx={{ color: '#1db954', mt: 1, display: 'inline-flex', alignSelf: 'flex-start' }}
                  aria-label={t('Escuchar en Spotify')}
                >
                  <PlayArrowIcon />
                </IconButton>
                <Button
                  variant="contained"
                  sx={{ mt: 1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                  onClick={() =>
                    saveAlbum({
                      id: album.id,
                      name: album.name,
                      artists: album.artists,
                      images: album.images,
                      release_date: album.release_date,
                    })
                  }
                  disabled={myAlbums.some((a) => (a.albumId || a.album?.id) === album.id)}
                >
                  {myAlbums.some((a) => (a.albumId || a.album?.id) === album.id)
                    ? t('Ya en tu colección')
                    : t('Añadir a mi colección')}
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
        {news.length === 0 && !newsLoading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <span>{t('No hay novedades recientes')}</span>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
}
