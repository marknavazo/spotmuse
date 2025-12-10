import React from 'react';
import { Box, Paper, Typography, IconButton, Button } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';

import SpotifyIcon from '../common/SpotifyIcon';
import AlbumCover from '../common/AlbumCover';

export default function AlbumCard({
  a,
  t,
  avgRatings,
  myRatings,
  user,
  navigate,
  incrementAlbumPlay,
  openRecommendDialog,
  deleteAlbum,
}) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'stretch',
        mb: 2,
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 0 }}>
        <Box
          sx={{
            flex: '0 0 90px',
            width: '90px',
            maxWidth: '90px',
            cursor: 'pointer',
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'flex-start',
          }}
          onClick={() => navigate(`/album/${a.albumId}`)}
        >
          <AlbumCover
            images={a.images || (a.album && a.album.images)}
            alt={a.name}
            className="album-card-cover"
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{ color: '#1db954', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}
            onClick={() => navigate(`/album/${a.albumId}`)}
          >
            {a.name}
          </Typography>
          <Typography variant="body2" sx={{ color: '#888', mb: 0.5 }}>
            {a.artists}
          </Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            {t('Año')}: {a.releaseDate ? new Date(a.releaseDate).getFullYear() : '-'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            {t('Nota')}:{' '}
            {typeof avgRatings[a.albumId] === 'number'
              ? Number(avgRatings[a.albumId]).toFixed(1)
              : '-'}
            {typeof myRatings[a.albumId] === 'number' ? ` (${myRatings[a.albumId]})` : ''}
          </Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            {t('Añadido')}:{' '}
            {a.addedAt && a.addedAt.toDate
              ? new Date(a.addedAt.toDate()).toLocaleDateString()
              : a.addedAt
                ? new Date(a.addedAt).toLocaleDateString()
                : '-'}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 0, mb: 0, pt: 0, pb: 0 }}>
        <IconButton
          onClick={() => {
            if (user && a.albumId) {
              incrementAlbumPlay(user.uid, a.albumId).catch(() => {});
            }
            window.open(`https://open.spotify.com/album/${a.albumId}`, '_blank');
          }}
          sx={{ color: '#1db954' }}
        >
          <SpotifyIcon style={{ fontSize: 28 }} />
        </IconButton>
        <IconButton onClick={() => openRecommendDialog(a)}>
          <ShareIcon />
        </IconButton>
        <IconButton onClick={() => deleteAlbum(a.id)} color="error">
          <DeleteIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
