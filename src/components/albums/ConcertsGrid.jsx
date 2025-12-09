import { Box, CircularProgress, Grid, Paper, Button, TextField } from '@mui/material';
import PropTypes from 'prop-types';

export default function ConcertsGrid({
  t,
  concerts,
  concertsLoading,
  concertsFilter,
  setConcertsFilter,
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <h3>
        {t('Conciertos de tus favoritos')} ({concerts.length})
      </h3>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('Filtrar conciertos por cualquier campo')}
          value={concertsFilter}
          onChange={(e) => setConcertsFilter(e.target.value)}
        />
        <Button variant="outlined" onClick={() => setConcertsFilter('')}>
          {t('Limpiar')}
        </Button>
      </Box>
      {concertsLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={20} />
          <span>{t('Cargando...')}</span>
        </Box>
      )}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {concerts
          .filter((ev) => {
            if (!concertsFilter) return true;
            const ql = concertsFilter.toLowerCase();
            const fields = [ev.name, ev.artistName, ev.city, ev.venue, ev.date, ev.url];
            return fields.filter(Boolean).some((v) => String(v).toLowerCase().includes(ql));
          })
          .map((ev) => (
            <Grid item key={ev.id} xs={12} sm={6} md={4}>
              <Paper sx={{ p: 2 }}>
                <div style={{ fontWeight: 600 }}>{ev.name}</div>
                <div style={{ color: '#999' }}>{ev.artistName}</div>
                <div style={{ marginTop: 4 }}>
                  {ev.date ? new Date(ev.date).toLocaleDateString() : '-'}
                </div>
                <div style={{ color: '#777' }}>
                  {ev.city} {ev.venue ? `- ${ev.venue}` : ''}
                </div>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {ev.url && (
                    <Button
                      variant="contained"
                      sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                      onClick={() => window.open(ev.url, '_blank')}
                    >
                      {t('Ver entradas')}
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        {concerts.length === 0 && !concertsLoading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <span>{t('No hay conciertos próximos')}</span>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
}

ConcertsGrid.propTypes = {
  t: PropTypes.func.isRequired,
  concerts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
      artistName: PropTypes.string,
      city: PropTypes.string,
      venue: PropTypes.string,
      date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      url: PropTypes.string,
    })
  ).isRequired,
  concertsLoading: PropTypes.bool.isRequired,
  concertsFilter: PropTypes.string.isRequired,
  setConcertsFilter: PropTypes.func.isRequired,
};
