import React, { useEffect, useState } from 'react'
import { Container, Grid, TextField, Button, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, ButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemButton, CircularProgress, Box } from '@mui/material'
import { searchAlbums } from '../../services/spotifyService'
import toast from 'react-hot-toast'
import auth from '../../firebase/auth'
import { collection, query, where, getDocs, addDoc, setDoc, doc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase/firestore'
import ShareIcon from '@mui/icons-material/Share'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'

export default function AlbumsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [myAlbums, setMyAlbums] = useState([])
  const [myLoading, setMyLoading] = useState(true)
  const [recommended, setRecommended] = useState([])
  const [recLoading, setRecLoading] = useState(true)
  const [acceptedRecs, setAcceptedRecs] = useState([])
  const [activeTab, setActiveTab] = useState('myAlbums')
  const [friends, setFriends] = useState([])
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const token = import.meta.env.VITE_SPOTIFY_TOKEN
  const user = auth.currentUser

  useEffect(() => {
    if (!user) return
    // subscribe to my albums
    const myRef = collection(db, 'albums')
    const q1 = query(myRef, where('owner', '==', user.uid))
    const unsubMy = onSnapshot(q1, snap => {
      setMyAlbums(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setMyLoading(false)
    })
    // subscribe to recommendations directed to me and pending
    const recRef = collection(db, 'recommendations')
    const q2 = query(recRef, where('to', '==', user.uid), where('accepted', '==', false))
    const unsubRec = onSnapshot(q2, snap => {
      setRecommended(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setRecLoading(false)
    })
    // accepted recommendations (history)
    const q2b = query(recRef, where('to', '==', user.uid), where('accepted', '==', true))
    const unsubRecAccepted = onSnapshot(q2b, snap => {
      setAcceptedRecs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    // load friends list
    const friendsRef = collection(db, 'friends')
    const q3 = query(friendsRef, where('userId', '==', user.uid))
    const unsubFriends = onSnapshot(q3, snap => {
      setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setFriendsLoading(false)
    })
    return () => { unsubMy(); unsubRec(); unsubRecAccepted(); unsubFriends(); }
  }, [user])

  async function handleSearch() {
    if (!q) return
    setSearchLoading(true)
    try {
      const r = await searchAlbums(q, token)
      setResults(r)
    } finally {
      setSearchLoading(false)
    }
  }

  async function searchByArtist(artistName) {
    setQ(artistName)
    setSearchLoading(true)
    try {
      const r = await searchAlbums(artistName, token)
      setResults(r)
    } finally {
      setSearchLoading(false)
    }
    // Scroll to results
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  async function saveAlbum(album) {
    if (!user) return toast.error('Accede para guardar álbumes')
    try {
      await addDoc(collection(db, 'albums'), {
        owner: user.uid,
        albumId: album.id,
        name: album.name,
        artists: album.artists.map(a=>a.name).join(', '),
        images: album.images,
        releaseDate: album.release_date,
        addedAt: new Date().toISOString()
      })
      toast.success('Álbum guardado')
    } catch (error) {
      toast.error('Error al guardar álbum')
    }
  }

  async function deleteAlbum(albumId) {
    try {
      await deleteDoc(doc(db, 'albums', albumId))
      toast.success('Álbum eliminado')
    } catch (error) {
      toast.error('Error al eliminar álbum')
    }
  }

  async function recommendTo(album, toUid) {
    if (!user) return toast.error('Accede para recomendar')
    try {
      await addDoc(collection(db, 'recommendations'), {
        from: user.uid,
        to: toUid,
        albumId: album.albumId || album.id,
        albumName: album.name,
        artist: album.artists,
        images: album.images,
        releaseDate: album.releaseDate,
        accepted: false,
        createdAt: new Date().toISOString()
      })
      toast.success('Recomendación enviada')
      setOpenDialog(false)
    } catch (error) {
      toast.error('Error al enviar recomendación')
    }
  }

  function openRecommendDialog(album) {
    if (friends.length === 0) {
      return toast.error('Añade amigos primero en la sección Amigos')
    }
    setSelectedAlbum(album)
    setOpenDialog(true)
  }

  async function acceptRecommendation(rec) {
    // mark accepted and add to my albums
    try {
      await setDoc(doc(db, 'recommendations', rec.id), { ...rec, accepted: true })
      await addDoc(collection(db, 'albums'), {
        owner: user.uid,
        albumId: rec.albumId,
        name: rec.albumName,
        artists: rec.artist,
        images: rec.images || [],
        releaseDate: rec.releaseDate,
        addedAt: new Date().toISOString(),
        viaRecommendation: true,
        recommendedBy: rec.from
      })
      toast.success('Álbum aceptado y agregado a tu colección')
    } catch (error) {
      toast.error('Error al aceptar recomendación')
    }
  }

  function getRecommenderName(uid) {
    const f = friends.find(fr => fr.friendUid === uid)
    return f?.friendName || uid
  }

  async function deleteRecommendation(recId) {
    try {
      await deleteDoc(doc(db, 'recommendations', recId))
      toast.success(t('Recomendación eliminada'))
    } catch (error) {
      toast.error(t('Error al eliminar recomendación'))
    }
  }

  return (
    <Container maxWidth={false} sx={{ px: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={9}>
          <TextField 
            fullWidth 
            value={q} 
            onChange={e => setQ(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
            placeholder={t('Buscar álbumes')} 
          />
        </Grid>
        <Grid item xs={3}>
          <Button onClick={handleSearch} disabled={searchLoading} variant="contained" color="primary" sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}>{searchLoading ? t('Buscando...') : 'Buscar'}</Button>
        </Grid>
      </Grid>

      <Grid container spacing={4} sx={{ mt: 3 }}>
        <Grid item xs={12}>
          <ButtonGroup variant="contained" sx={{ mb: 2 }}>
            <Button 
              onClick={() => setActiveTab('myAlbums')} 
              sx={{ 
                bgcolor: activeTab === 'myAlbums' ? '#1db954' : '#2a2a2a',
                '&:hover': { bgcolor: activeTab === 'myAlbums' ? '#1ed760' : '#3a3a3a' }
              }}
            >
              {t('Mis álbumes')} ({myAlbums.length})
            </Button>
            <Button 
              onClick={() => setActiveTab('recommended')} 
              sx={{ 
                bgcolor: activeTab === 'recommended' ? '#1db954' : '#2a2a2a',
                '&:hover': { bgcolor: activeTab === 'recommended' ? '#1ed760' : '#3a3a3a' }
              }}
            >
              {t('Recomendados')} ({recommended.length})
            </Button>
          </ButtonGroup>

          {activeTab === 'myAlbums' && (
            <Paper sx={{ p:2 }}>
              <h3>{t('Mis álbumes')} ({myAlbums.length})</h3>
              {myLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CircularProgress size={20} />
                  <span>{t('Cargando...')}</span>
                </Box>
              )}
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('Portada')}</TableCell>
                      <TableCell>{t('Nombre')}</TableCell>
                      <TableCell>{t('Artistas')}</TableCell>
                      <TableCell>{t('Año')}</TableCell>
                      <TableCell>{t('Acciones')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {myAlbums.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <img 
                            src={a.images?.[2]?.url || a.images?.[0]?.url} 
                            alt={a.name} 
                            style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} 
                            onClick={() => navigate(`/album/${a.albumId}`)}
                          />
                        </TableCell>
                        <TableCell>
                          <span 
                            style={{ cursor: 'pointer', color: '#1db954', textDecoration: 'underline' }}
                            onClick={() => navigate(`/album/${a.albumId}`)}
                          >
                            {a.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span 
                            onClick={() => searchByArtist(a.artists)} 
                            style={{ 
                              cursor: 'pointer', 
                              color: '#1db954',
                              textDecoration: 'underline',
                              '&:hover': { color: '#1ed760' }
                            }}
                          >
                            {a.artists}
                          </span>
                        </TableCell>
                        <TableCell>{a.releaseDate ? new Date(a.releaseDate).getFullYear() : '-'}</TableCell>
                        <TableCell>
                        <IconButton onClick={() => window.open(`https://open.spotify.com/album/${a.albumId}`, '_blank')} sx={{ color: '#1db954' }}>
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
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {activeTab === 'recommended' && (
            <>
              <Paper sx={{ p:2, mb:3 }}>
                <h3>{t('Álbumes recomendados por mis amigos (pendientes)')} ({recommended.length})</h3>
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
                        <TableCell>{t('Portada')}</TableCell>
                        <TableCell>{t('Álbum')}</TableCell>
                        <TableCell>{t('Artista')}</TableCell>
                        <TableCell>{t('Año')}</TableCell>
                        <TableCell>{t('Recomendado por')}</TableCell>
                        <TableCell>{t('Acciones')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recommended.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <img 
                              src={r.images?.[2]?.url || r.images?.[0]?.url} 
                              alt={r.albumName} 
                              style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} 
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
                          <TableCell>{r.releaseDate ? new Date(r.releaseDate).getFullYear() : '-'}</TableCell>
                          <TableCell>{getRecommenderName(r.from)}</TableCell>
                          <TableCell>
                            <IconButton onClick={() => window.open(`https://open.spotify.com/album/${r.albumId}`, '_blank')} sx={{ color: '#1db954' }}>
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
              <Paper sx={{ p:2 }}>
                <h3>{t('Recomendaciones aceptadas')} ({acceptedRecs.length})</h3>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('Portada')}</TableCell>
                        <TableCell>{t('Álbum')}</TableCell>
                        <TableCell>{t('Artista')}</TableCell>
                        <TableCell>{t('Año')}</TableCell>
                        <TableCell>{t('Recomendado por')}</TableCell>
                        <TableCell>{t('Acciones')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {acceptedRecs.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <img 
                              src={r.images?.[2]?.url || r.images?.[0]?.url} 
                              alt={r.albumName} 
                              style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} 
                            />
                          </TableCell>
                          <TableCell>{r.albumName}</TableCell>
                          <TableCell>{r.artist}</TableCell>
                          <TableCell>{r.releaseDate ? new Date(r.releaseDate).getFullYear() : '-'}</TableCell>
                          <TableCell>{getRecommenderName(r.from)}</TableCell>
                          <TableCell>
                            <IconButton onClick={() => window.open(`https://open.spotify.com/album/${r.albumId}`, '_blank')} sx={{ color: '#1db954' }}>
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
          )}
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 3 }} id="results-section">
        <Grid item xs={12}>
          <h3>Resultados</h3>
          {searchLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CircularProgress size={20} />
              <span>{t('Buscando...')}</span>
            </Box>
          )}
          <Grid container spacing={2}>
            {results.map(album => (
              <Grid item key={album.id} xs={12} sm={6} md={4}>
                <Paper sx={{ p:2 }}>
                  <img 
                    src={album.images?.[0]?.url} 
                    alt="" 
                    style={{ width: '100%', height: 160, objectFit: 'cover', cursor: 'pointer' }} 
                    onClick={() => navigate(`/album/${album.id}`)}
                  />
                  <div>
                    <strong 
                      style={{ cursor: 'pointer', color: '#1db954', textDecoration: 'underline' }}
                      onClick={() => navigate(`/album/${album.id}`)}
                    >
                      {album.name}
                    </strong>
                  </div>
                  <div>{album.artists.map(a=>a.name).join(', ')}</div>
                  <div style={{ color: '#999', fontSize: '0.9em', marginTop: 4 }}>{album.release_date ? new Date(album.release_date).getFullYear() : ''}</div>
                  <Button variant="contained" sx={{ mt:1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }} onClick={() => saveAlbum(album)}>Guardar</Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Recomendar a un amigo</DialogTitle>
        <DialogContent>
          {selectedAlbum && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: '#2a2a2a' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <img 
                    src={selectedAlbum.images?.[2]?.url || selectedAlbum.images?.[0]?.url} 
                    alt={selectedAlbum.name}
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                  />
                </Grid>
                <Grid item xs>
                  <div><strong>{selectedAlbum.name}</strong></div>
                  <div style={{ color: '#999', fontSize: '0.9em' }}>{selectedAlbum.artists}</div>
                </Grid>
              </Grid>
            </Paper>
          )}
          <List>
            {friends.map(friend => (
              <ListItem key={friend.id} disablePadding>
                <ListItemButton 
                  onClick={() => recommendTo(selectedAlbum, friend.friendUid)}
                  sx={{ 
                    '&:hover': { bgcolor: 'rgba(29, 185, 84, 0.1)' },
                    borderRadius: 1
                  }}
                >
                  <ListItemText 
                    primary={friend.friendName} 
                    secondary={friend.friendUid}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            color="error"
            sx={{ borderColor: '#ff4d4f', color: '#ff4d4f', '&:hover': { borderColor: '#ff6b6d', bgcolor: 'rgba(255,77,79,0.08)' } }}
          >
            {t('Cancelar')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
