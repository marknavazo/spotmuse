import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import AlbumCover from '../common/AlbumCover';

export default function RecommendDialog({ open, onClose, album, friends, onRecommend }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('Recomendar a un amigo')}</DialogTitle>
      <DialogContent>
        {album && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#2a2a2a' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <AlbumCover images={album.images} alt={album.name} size={60} />
              </Grid>
              <Grid item xs>
                <div>
                  <strong>{album.name}</strong>
                </div>
                <div style={{ color: '#999', fontSize: '0.9em' }}>
                  {album.artists?.map((a) => a.name).join(', ')}
                </div>
              </Grid>
            </Grid>
          </Paper>
        )}
        <List>
          {friends.map((friend) => (
            <ListItem key={friend.id} disablePadding>
              <ListItemButton
                onClick={() => onRecommend(friend.friendUid)}
                sx={{ '&:hover': { bgcolor: 'rgba(29, 185, 84, 0.1)' }, borderRadius: 1 }}
              >
                <ListItemText primary={friend.friendName} secondary={friend.friendUid} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant="outlined"
          color="error"
          sx={{
            borderColor: '#ff4d4f',
            color: '#ff4d4f',
            '&:hover': { borderColor: '#ff6b6d', bgcolor: 'rgba(255,77,79,0.08)' },
          }}
        >
          {t('Cancelar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
