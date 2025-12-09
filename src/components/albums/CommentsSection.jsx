import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import {
  addComment as addCommentService,
  editComment as editCommentService,
  deleteComment as deleteCommentService,
  subscribeCommentsForAlbum,
} from '../../services/firebaseService';

export default function CommentsSection({ albumId, user, friends }) {
  const { t } = useTranslation();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (!albumId || !user) return;
    setCommentsLoading(true);
    const allowed = [user.uid, ...friends.map((f) => f.friendUid)];
    const unsub = subscribeCommentsForAlbum(albumId, allowed, (items) => {
      setComments(items);
      setCommentsLoading(false);
    });
    return () => unsub();
  }, [albumId, user, friends]);

  async function addComment() {
    if (!user || !albumId) return toast.error(t('Accede para comentar'));
    const text = newComment.trim();
    if (!text) return;
    try {
      await addCommentService(user.uid, albumId, text);
      setNewComment('');
      toast.success(t('Comentario añadido'));
    } catch (_e) {
      toast.error(t('Error al añadir comentario'));
    }
  }

  async function deleteComment(id) {
    try {
      await deleteCommentService(id);
      toast.success(t('Comentario eliminado'));
    } catch (_e) {
      toast.error(t('Error al eliminar comentario'));
    }
  }

  function startEditComment(c) {
    setEditingId(c.id);
    setEditingText(c.text || '');
  }

  async function saveEditComment() {
    if (!editingId) return;
    const text = editingText.trim();
    if (!text) return;
    try {
      await editCommentService(editingId, text);
      setEditingId(null);
      setEditingText('');
      toast.success(t('Comentario editado'));
    } catch (_e) {
      toast.error(t('Error al editar comentario'));
    }
  }

  return (
    <Box sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('Comentarios')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('Escribe un comentario')}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button
          variant="contained"
          sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
          onClick={addComment}
        >
          {t('Añadir')}
        </Button>
      </Box>
      {commentsLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <span>{t('Cargando...')}</span>
        </Box>
      ) : comments.length === 0 ? (
        <Typography color="text.secondary">{t('No hay comentarios')}</Typography>
      ) : (
        <List dense>
          {comments.map((c) => {
            const author =
              c.uid === user?.uid
                ? t('Tú')
                : friends.find((f) => f.friendUid === c.uid)?.friendName || c.uid;
            const ts = c.createdAt?.toDate
              ? new Date(c.createdAt.toDate()).toLocaleString()
              : c.createdAt
                ? new Date(c.createdAt).toLocaleString()
                : '';
            const editedFlag = c.edited ? ` (${t('editado')})` : '';
            const isMine = c.uid === user?.uid;
            return (
              <ListItem
                key={c.id}
                alignItems="flex-start"
                sx={{ alignItems: 'flex-start' }}
                secondaryAction={
                  isMine && editingId !== c.id ? (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {editingId === c.id ? (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                            onClick={saveEditComment}
                          >
                            {t('Guardar')}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => {
                              setEditingId(null);
                              setEditingText('');
                            }}
                          >
                            {t('Cancelar')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <IconButton
                            size="small"
                            aria-label={t('Editar')}
                            onClick={() => startEditComment(c)}
                            sx={{ color: '#1db954' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label={t('Eliminar')}
                            onClick={() => deleteComment(c.id)}
                            sx={{ color: '#ff4d4f' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  ) : null
                }
              >
                {editingId === c.id ? (
                  <Box sx={{ width: '100%', pr: 0 }}>
                    <TextField
                      fullWidth
                      size="small"
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          saveEditComment();
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditingText('');
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                        onClick={saveEditComment}
                      >
                        {t('Guardar')}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => {
                          setEditingId(null);
                          setEditingText('');
                        }}
                      >
                        {t('Cancelar')}
                      </Button>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: 'block' }}
                    >
                      {author} • {ts}
                      {editedFlag}
                    </Typography>
                  </Box>
                ) : (
                  <ListItemText primary={c.text} secondary={`${author} • ${ts}${editedFlag}`} />
                )}
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
}
