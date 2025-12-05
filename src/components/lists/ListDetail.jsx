import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Grid, CircularProgress, Box, IconButton } from '@mui/material';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { db } from '../../firebase/firestore';

export default function ListDetail() {
  const { listId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [listInfo, setListInfo] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubAlbums = () => {};
    async function init() {
      try {
        // Load list info
        const snap = await getDoc(doc(db, 'lists', listId));
        if (snap.exists()) {
          setListInfo({ id: snap.id, ...snap.data() });
        }
        // Subscribe to albums associated to this list
        const laRef = collection(db, 'listAlbums');
        const q = query(laRef, where('listId', '==', listId));
        unsubAlbums = onSnapshot(q, (s) => {
          setAlbums(s.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
      } catch {
        setLoading(false);
      }
    }
    init();
    return () => unsubAlbums();
  }, [listId]);

  return (
    <Container maxWidth={false} sx={{ px: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        {listInfo ? (
          <div>
            <h2 style={{ margin: 0 }}>{listInfo.name}</h2>
            <div style={{ color: '#999' }}>
              {t('Creada')}:{' '}
              {listInfo.createdAt ? new Date(listInfo.createdAt).toLocaleDateString() : '-'}
            </div>
          </div>
        ) : (
          <div>{t('Cargando...')}</div>
        )}
      </Paper>
      <Paper sx={{ p: 2 }}>
        <h3>
          {t('Álbumes en la lista')} ({albums.length})
        </h3>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} />
            <span>{t('Cargando...')}</span>
          </Box>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {albums.map((a) => (
            <Grid item key={a.id} xs={12} sm={6} md={2}>
              <Paper sx={{ p: 2 }}>
                <img
                  src={a.images?.[0]?.url}
                  alt={a.name}
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/album/${a.albumId}`)}
                />
                <IconButton
                  onClick={() =>
                    window.open(`https://open.spotify.com/album/${a.albumId}`, '_blank')
                  }
                  sx={{ color: '#1db954', mt: 1, display: 'inline-flex', alignSelf: 'flex-start' }}
                  aria-label={t('Escuchar en Spotify')}
                >
                  <PlayArrowIcon />
                </IconButton>
                <div>
                  <strong
                    style={{ cursor: 'pointer', color: '#1db954', textDecoration: 'underline' }}
                    onClick={() => navigate(`/album/${a.albumId}`)}
                  >
                    {a.name}
                  </strong>
                </div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.artists}
                </div>
                <div style={{ color: '#999', fontSize: '0.9em', marginTop: 4 }}>
                  {a.releaseDate ? new Date(a.releaseDate).getFullYear() : ''}
                </div>
              </Paper>
            </Grid>
          ))}
          {!loading && albums.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <span>{t('No hay álbumes en esta lista')}</span>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Container>
  );
}
