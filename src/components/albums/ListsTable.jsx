import PropTypes from 'prop-types';
import {
  Box,
  CircularProgress,
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

export default function ListsTable({
  t,
  lists,
  listsLoading,
  newListName,
  setNewListName,
  editingListId,
  editingListName,
  setEditingListName,
  startEditList,
  saveEditList,
  deleteList,
  listAlbumCounts,
  navigate,
  createList,
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <h3>
        {t('Mis listas')} ({lists.length})
      </h3>
      {listsLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={20} />
          <span>{t('Cargando...')}</span>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder={t('Nombre de la nueva lista')}
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
        />
        <Button
          variant="contained"
          sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
          onClick={createList}
        >
          {t('Crear lista')}
        </Button>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('Nombre')}</TableCell>
              <TableCell>{t('Creada')}</TableCell>
              <TableCell>{t('Álbumes')}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lists.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  {editingListId === l.id ? (
                    <TextField
                      size="small"
                      value={editingListName}
                      onChange={(e) => setEditingListName(e.target.value)}
                    />
                  ) : (
                    <span
                      style={{ cursor: 'pointer', color: '#1db954', textDecoration: 'underline' }}
                      onClick={() => navigate(`/list/${l.id}`)}
                      title={l.name}
                    >
                      {l.name}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  {Array.isArray(listAlbumCounts?.[l.id])
                    ? listAlbumCounts[l.id].length
                    : listAlbumCounts?.[l.id] || 0}
                </TableCell>
                <TableCell>
                  {editingListId === l.id ? (
                    <Button
                      onClick={saveEditList}
                      sx={{ mr: 1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                      variant="contained"
                    >
                      {t('Guardar')}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => startEditList(l)}
                      sx={{ mr: 1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                      variant="contained"
                    >
                      {t('Editar')}
                    </Button>
                  )}
                  <Button onClick={() => deleteList(l.id)} color="error" variant="outlined">
                    {t('Eliminar')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {lists.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  {t('No tienes listas aún')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

ListsTable.propTypes = {
  t: PropTypes.func.isRequired,
  lists: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      owner: PropTypes.string,
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    })
  ).isRequired,
  listsLoading: PropTypes.bool.isRequired,
  newListName: PropTypes.string.isRequired,
  setNewListName: PropTypes.func.isRequired,
  editingListId: PropTypes.string,
  editingListName: PropTypes.string.isRequired,
  setEditingListName: PropTypes.func.isRequired,
  startEditList: PropTypes.func.isRequired,
  saveEditList: PropTypes.func.isRequired,
  deleteList: PropTypes.func.isRequired,
  listAlbumCounts: PropTypes.object.isRequired,
  navigate: PropTypes.func.isRequired,
  createList: PropTypes.func.isRequired,
};
