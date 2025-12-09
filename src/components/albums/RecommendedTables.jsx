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
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';

import AlbumCover from '../common/AlbumCover';

export default function RecommendedTables({
  t,
  recLoading,
  sortedRecommended,
  sortedAcceptedRecs,
  avgRatings,
  ownersByAlbumId,
  user,
  navigate,
  incrementAlbumPlay,
  toggleSortRecPend,
  sortKeyRecPend,
  sortDirRecPend,
  toggleSortRecAcc,
  sortKeyRecAcc,
  sortDirRecAcc,
  getRecommenderName,
  acceptRecommendation,
  deleteRecommendation,
}) {
  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <h3>
          {t('Álbumes recomendados por mis amigos (pendientes)')} ({sortedRecommended.length})
        </h3>
        {recLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CircularProgress size={20} />
            <span>{t('Cargando...')}</span>
          </Box>
        )}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell
                  onClick={() => toggleSortRecPend('albumName')}
                  sx={{ cursor: 'pointer' }}
                >
                  {t('Álbum')}{' '}
                  {sortKeyRecPend === 'albumName' ? (sortDirRecPend === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell onClick={() => toggleSortRecPend('artist')} sx={{ cursor: 'pointer' }}>
                  {t('Artista')}{' '}
                  {sortKeyRecPend === 'artist' ? (sortDirRecPend === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell onClick={() => toggleSortRecPend('year')} sx={{ cursor: 'pointer' }}>
                  {t('Año')}{' '}
                  {sortKeyRecPend === 'year' ? (sortDirRecPend === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell>{t('Añadido por')}</TableCell>
                <TableCell>{t('Media')}</TableCell>
                <TableCell onClick={() => toggleSortRecPend('from')} sx={{ cursor: 'pointer' }}>
                  {t('Recomendado por')}{' '}
                  {sortKeyRecPend === 'from' ? (sortDirRecPend === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRecommended.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ p: 0 }}>
                    <AlbumCover
                      images={r.images}
                      alt={r.albumName}
                      onClick={() => navigate(`/album/${r.albumId}`)}
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      style={{ cursor: 'pointer', color: '#1db954', textDecoration: 'underline' }}
                      onClick={() => navigate(`/album/${r.albumId}`)}
                    >
                      {r.albumName}
                    </span>
                  </TableCell>
                  <TableCell>{r.artist}</TableCell>
                  <TableCell>
                    {r.releaseDate ? new Date(r.releaseDate).getFullYear() : '-'}
                  </TableCell>
                  <TableCell>
                    {ownersByAlbumId[r.albumId]?.length
                      ? `${ownersByAlbumId[r.albumId].length} ${t('personas')}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {typeof avgRatings[r.albumId] === 'number'
                      ? Number(avgRatings[r.albumId]).toFixed(1)
                      : '-'}
                  </TableCell>
                  <TableCell>{getRecommenderName(r.from)}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        if (user && r.albumId) {
                          incrementAlbumPlay(user.uid, r.albumId).catch(() => {});
                        }
                        window.open(`https://open.spotify.com/album/${r.albumId}`, '_blank');
                      }}
                      sx={{ color: '#1db954' }}
                    >
                      <PlayArrowIcon />
                    </IconButton>
                    <IconButton onClick={() => acceptRecommendation(r)} color="success">
                      <CheckIcon />
                    </IconButton>
                    <IconButton onClick={() => deleteRecommendation(r.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <h3>
          {t('Recomendaciones aceptadas')} ({sortedAcceptedRecs.length})
        </h3>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell onClick={() => toggleSortRecAcc('albumName')} sx={{ cursor: 'pointer' }}>
                  {t('Álbum')}{' '}
                  {sortKeyRecAcc === 'albumName' ? (sortDirRecAcc === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell onClick={() => toggleSortRecAcc('artist')} sx={{ cursor: 'pointer' }}>
                  {t('Artista')}{' '}
                  {sortKeyRecAcc === 'artist' ? (sortDirRecAcc === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell onClick={() => toggleSortRecAcc('year')} sx={{ cursor: 'pointer' }}>
                  {t('Año')} {sortKeyRecAcc === 'year' ? (sortDirRecAcc === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell>{t('Añadido por')}</TableCell>
                <TableCell>{t('Media')}</TableCell>
                <TableCell onClick={() => toggleSortRecAcc('from')} sx={{ cursor: 'pointer' }}>
                  {t('Recomendado por')}{' '}
                  {sortKeyRecAcc === 'from' ? (sortDirRecAcc === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedAcceptedRecs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ p: 0 }}>
                    <AlbumCover
                      images={r.images}
                      alt={r.albumName}
                      onClick={() => navigate(`/album/${r.albumId}`)}
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      style={{ cursor: 'pointer', color: '#1db954', textDecoration: 'underline' }}
                      onClick={() => navigate(`/album/${r.albumId}`)}
                    >
                      {r.albumName}
                    </span>
                  </TableCell>
                  <TableCell>{r.artist}</TableCell>
                  <TableCell>
                    {r.releaseDate ? new Date(r.releaseDate).getFullYear() : '-'}
                  </TableCell>
                  <TableCell>
                    {ownersByAlbumId[r.albumId]?.length
                      ? `${ownersByAlbumId[r.albumId].length} ${t('personas')}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {typeof avgRatings[r.albumId] === 'number'
                      ? Number(avgRatings[r.albumId]).toFixed(1)
                      : '-'}
                  </TableCell>
                  <TableCell>{getRecommenderName(r.from)}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        if (user && r.albumId) {
                          incrementAlbumPlay(user.uid, r.albumId).catch(() => {});
                        }
                        window.open(`https://open.spotify.com/album/${r.albumId}`, '_blank');
                      }}
                      sx={{ color: '#1db954' }}
                    >
                      <PlayArrowIcon />
                    </IconButton>
                    <IconButton onClick={() => deleteRecommendation(r.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  );
}
