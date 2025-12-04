import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Error404() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
        {t('Página no encontrada')}
      </Typography>
      <Typography variant="body1" sx={{ color: '#999', mb: 3 }}>
        {t('La ruta que buscas no existe o ha sido movida.')}
      </Typography>
      <Button
        variant="contained"
        sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
        onClick={() => navigate('/')}
      >
        {t('Volver al inicio')}
      </Button>
    </Box>
  );
}
