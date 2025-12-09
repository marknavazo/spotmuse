import PropTypes from 'prop-types';
MyAlbumsTable.propTypes = {
  t: PropTypes.func.isRequired,
  myAlbumsCombined: PropTypes.arrayOf(
    PropTypes.shape({
      albumId: PropTypes.string.isRequired,
      name: PropTypes.string,
      artists: PropTypes.string,
      images: PropTypes.array,
      releaseDate: PropTypes.string,
      addedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    })
  ).isRequired,
  myLoading: PropTypes.bool.isRequired,
  myFilter: PropTypes.string.isRequired,
  setMyFilter: PropTypes.func.isRequired,
  avgRatings: PropTypes.object.isRequired,
  myRatings: PropTypes.object.isRequired,
  ownersByAlbumId: PropTypes.object.isRequired,
  user: PropTypes.object,
  toggleSort: PropTypes.func.isRequired,
  sortKey: PropTypes.string.isRequired,
  sortDir: PropTypes.string.isRequired,
  navigate: PropTypes.func.isRequired,
  incrementAlbumPlay: PropTypes.func.isRequired,
  openRecommendDialog: PropTypes.func.isRequired,
  deleteAlbum: PropTypes.func.isRequired,
};
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';

import AlbumCover from '../common/AlbumCover';

function AlbumsHeader({ t, sortKey, sortDir, toggleSort }) {
  return (
    <TableHead>
      <TableRow>
        <TableCell></TableCell>
        <TableCell onClick={() => toggleSort('name')} sx={{ cursor: 'pointer', width: 200 }}>
          {t('Nombre')} {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableCell>
        <TableCell onClick={() => toggleSort('artists')} sx={{ cursor: 'pointer', width: 220 }}>
          {t('Artistas')} {sortKey === 'artists' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableCell>
        <TableCell onClick={() => toggleSort('year')} sx={{ cursor: 'pointer' }}>
          {t('Año')} {sortKey === 'year' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableCell>
        <TableCell onClick={() => toggleSort('avg')} sx={{ cursor: 'pointer' }}>
          {t('Media')} {sortKey === 'avg' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableCell>
        <TableCell onClick={() => toggleSort('my')} sx={{ cursor: 'pointer' }}>
          {t('Mi puntuación')} {sortKey === 'my' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableCell>
        <TableCell onClick={() => toggleSort('added')} sx={{ cursor: 'pointer' }}>
          {t('Añadido')} {sortKey === 'added' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </TableCell>
        <TableCell></TableCell>
      </TableRow>
    </TableHead>
  );
}

function AlbumRow({
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
    <TableRow key={a.id}>
      <TableCell sx={{ p: 0 }}>
        <AlbumCover
          images={a.images || a.album?.images}
          alt={a.name}
          onClick={() => navigate(`/album/${a.albumId}`)}
        />
      </TableCell>
      <TableCell sx={{ maxWidth: 200 }}>
        <span
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
          onClick={() => navigate(`/album/${a.albumId}`)}
        >
          {a.name}
        </span>
      </TableCell>
      <TableCell sx={{ maxWidth: 220 }}>
        <span
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
          onClick={() => navigate(`/album/${a.albumId}`)}
        >
          {a.artists}
        </span>
      </TableCell>
      <TableCell>{a.releaseDate ? new Date(a.releaseDate).getFullYear() : '-'}</TableCell>
      <TableCell>
        {typeof avgRatings[a.albumId] === 'number' ? Number(avgRatings[a.albumId]).toFixed(1) : '-'}
      </TableCell>
      <TableCell>{typeof myRatings[a.albumId] === 'number' ? myRatings[a.albumId] : '-'}</TableCell>
      <TableCell>
        {a.addedAt?.toDate
          ? new Date(a.addedAt.toDate()).toLocaleDateString()
          : a.addedAt
            ? new Date(a.addedAt).toLocaleDateString()
            : '-'}
      </TableCell>
      <TableCell>
        <IconButton
          onClick={() => {
            if (user && a.albumId) {
              incrementAlbumPlay(user.uid, a.albumId).catch(() => {});
            }
            window.open(`https://open.spotify.com/album/${a.albumId}`, '_blank');
          }}
          sx={{ color: '#1db954' }}
        >
          <PlayArrowIcon />
        </IconButton>
        <IconButton onClick={() => openRecommendDialog(a)}>
          <ShareIcon />
        </IconButton>
        <IconButton onClick={() => deleteAlbum(a.id)} color="error">
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

export default function MyAlbumsTable({
  t,
  myAlbumsCombined,
  myLoading,
  myFilter,
  setMyFilter,
  avgRatings,
  myRatings,
  user,
  toggleSort,
  sortKey,
  sortDir,
  navigate,
  incrementAlbumPlay,
  openRecommendDialog,
  deleteAlbum,
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <h3>
        {t('Mis álbumes')} ({myAlbumsCombined.length})
      </h3>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('Buscar en mis álbumes')}
          value={myFilter}
          onChange={(e) => setMyFilter(e.target.value)}
        />
        <Button
          variant="outlined"
          onClick={() => setMyFilter('')}
          sx={{
            borderColor: '#1db954',
            color: '#1db954',
            fontWeight: 600,
            px: 2,
            '&:hover': { borderColor: '#1ed760', bgcolor: 'rgba(29,185,84,0.1)' },
          }}
        >
          {t('Limpiar')}
        </Button>
      </Box>
      {myLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={20} />
          <span>{t('Cargando...')}</span>
        </Box>
      )}
      <TableContainer>
        <Table>
          <AlbumsHeader t={t} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} />
          <TableBody>
            {myAlbumsCombined.map((a) => (
              <AlbumRow
                key={a.id}
                a={a}
                t={t}
                avgRatings={avgRatings}
                myRatings={myRatings}
                user={user}
                navigate={navigate}
                incrementAlbumPlay={incrementAlbumPlay}
                openRecommendDialog={openRecommendDialog}
                deleteAlbum={deleteAlbum}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
