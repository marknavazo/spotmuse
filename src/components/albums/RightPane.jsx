import { Grid, TextField, Button, Box, CircularProgress, Paper, IconButton } from '@mui/material';

import SpotifyIcon from '../common/SpotifyIcon';
import AlbumCover from '../common/AlbumCover';

export default function RightPane({
  t,
  q,
  setQ,
  searchLoading,
  handleSearch,
  results,
  navigate,
  user,
  incrementAlbumPlay,
  saveAlbum,
  myAlbums,
}) {
  return (
    <Grid item xs={12} md={6} sx={{ p: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={9}>
          <TextField
            fullWidth
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('Buscar álbumes')}
          />
        </Grid>
        <Grid item xs={3}>
          <Button
            onClick={handleSearch}
            disabled={searchLoading}
            variant="contained"
            color="primary"
            sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
          >
            {searchLoading ? t('Buscando...') : 'Buscar'}
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 3 }} id="results-section">
        <Grid item xs={12}>
          {q && <h3>{t('Resultados')}</h3>}
          {searchLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CircularProgress size={20} />
              <span>{t('Buscando...')}</span>
            </Box>
          )}
          {q && (
            <Grid container spacing={2}>
              {results.map((album) => (
                <Grid item key={album.id} xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2 }}>
                    <AlbumCover
                      images={album.images}
                      alt={album.name}
                      onClick={() => navigate(`/album/${album.id}`)}
                      className="album-card-cover"
                    />
                    <div
                      style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      <strong
                        style={{
                          cursor: 'pointer',
                          color: '#1db954',
                          textDecoration: 'underline',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'inline-block',
                          maxWidth: '100%',
                        }}
                        onClick={() => navigate(`/album/${album.id}`)}
                        title={album.name}
                      >
                        {album.name}
                      </strong>
                    </div>
                    <div
                      style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={album.artists.map((a) => a.name).join(', ')}
                    >
                      {album.artists.map((a) => a.name).join(', ')}
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
                          window.open(`https://open.spotify.com/album/${album.id}`, '_blank');
                        }}
                        sx={{
                          color: '#1db954',
                          mt: 1,
                          display: 'inline-flex',
                          alignSelf: 'flex-start',
                        }}
                        aria-label={t('Escuchar en Spotify')}
                      >
                        <SpotifyIcon style={{ fontSize: 28 }} />
                      </IconButton>
                      <Button
                        variant="contained"
                        sx={{ mt: 1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                        onClick={() => saveAlbum(album)}
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
            </Grid>
          )}
        </Grid>
      </Grid>
    </Grid>
  );
}
