import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  TextField,
  Button,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Box,
  useMediaQuery,
} from '@mui/material';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  setDoc,
  doc,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import ShareIcon from '@mui/icons-material/Share';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { db } from '../../firebase/firestore';
import auth from '../../firebase/auth';
import { getArtistEvents } from '../../services/eventsService';
import { searchAlbums, getArtistAlbums } from '../../services/spotifyService';

export default function AlbumsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [myAlbums, setMyAlbums] = useState([]);
  const [myLoading, setMyLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const [recLoading, setRecLoading] = useState(true);
  const [acceptedRecs, setAcceptedRecs] = useState([]);
  const [activeTab, setActiveTab] = useState('myAlbums');
  const [friends, setFriends] = useState([]);
  const [_friendsLoading, setFriendsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [concerts, setConcerts] = useState([]);
  const [concertsLoading, setConcertsLoading] = useState(false);
  const [concertsFilter, setConcertsFilter] = useState('');
  const [myRatings, setMyRatings] = useState({});
  const [avgRatings, setAvgRatings] = useState({});
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [sortKeyRecPend, setSortKeyRecPend] = useState('albumName');
  const [sortDirRecPend, setSortDirRecPend] = useState('asc');
  const [sortKeyRecAcc, setSortKeyRecAcc] = useState('albumName');
  const [sortDirRecAcc, setSortDirRecAcc] = useState('asc');
  const token = import.meta.env.VITE_SPOTIFY_TOKEN;
  const user = auth.currentUser;
  const isNarrow = useMediaQuery('(max-width:1500px)');

  useEffect(() => {
    if (!user) return;
    // subscribe to my albums
    const myRef = collection(db, 'albums');
    const q1 = query(myRef, where('owner', '==', user.uid));
    const unsubMy = onSnapshot(q1, (snap) => {
      setMyAlbums(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setMyLoading(false);
    });
    // subscribe to recommendations directed to me and pending
    const recRef = collection(db, 'recommendations');
    const q2 = query(recRef, where('to', '==', user.uid), where('accepted', '==', false));
    const unsubRec = onSnapshot(q2, (snap) => {
      setRecommended(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setRecLoading(false);
    });
    // accepted recommendations (history)
    const q2b = query(recRef, where('to', '==', user.uid), where('accepted', '==', true));
    const unsubRecAccepted = onSnapshot(q2b, (snap) => {
      setAcceptedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    // load friends list
    const friendsRef = collection(db, 'friends');
    const q3 = query(friendsRef, where('userId', '==', user.uid));
    const unsubFriends = onSnapshot(q3, (snap) => {
      setFriends(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setFriendsLoading(false);
    });
    return () => {
      unsubMy();
      unsubRec();
      unsubRecAccepted();
      unsubFriends();
    };
  }, [user]);

  // Subscribe to ratings to show my score and global average
  useEffect(() => {
    if (!user) return;
    const ratingsRef = collection(db, 'ratings');
    const unsub = onSnapshot(ratingsRef, (snap) => {
      const myMap = {};
      const totals = {};
      const counts = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.albumId || typeof data.value !== 'number') return;
        // My ratings
        if (data.uid === user.uid) {
          myMap[data.albumId] = data.value;
        }
        // Global totals
        totals[data.albumId] = (totals[data.albumId] || 0) + data.value;
        counts[data.albumId] = (counts[data.albumId] || 0) + 1;
      });
      const avgMap = {};
      Object.keys(totals).forEach((id) => {
        avgMap[id] = totals[id] / counts[id];
      });
      setMyRatings(myMap);
      setAvgRatings(avgMap);
    });
    return () => unsub();
  }, [user]);

  async function handleSearch() {
    if (!q) return;
    setSearchLoading(true);
    try {
      const r = await searchAlbums(q, token);
      setResults(r);
    } finally {
      setSearchLoading(false);
    }
  }

  async function searchByArtist(artistName) {
    setQ(artistName);
    setSearchLoading(true);
    try {
      const r = await searchAlbums(artistName, token);
      setResults(r);
    } finally {
      setSearchLoading(false);
    }
    // Scroll to results
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async function loadNewsFromFavorites() {
    if (!user) return;
    setNewsLoading(true);
    try {
      // Load user favorites from profile
      const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      const meDoc = userSnap.docs[0]?.data();
      const favs = meDoc?.favoriteArtists || [];
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setMonth(now.getMonth() - 3);
      const releases = [];
      for (const fav of favs) {
        const items = await getArtistAlbums(fav.id, { include_groups: 'album,single', limit: 10 });
        for (const it of items) {
          const d = new Date(it.release_date);
          if (d >= cutoff) releases.push(it);
        }
      }
      const unique = {};
      for (const r of releases) unique[r.id] = r;
      setNews(Object.values(unique));
    } catch (_e) {
      toast.error(t('Error cargando novedades'));
    } finally {
      setNewsLoading(false);
    }
  }

  async function loadConcertsFromFavorites() {
    if (!user) return;
    setConcertsLoading(true);
    try {
      const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      const meDoc = userSnap.docs[0]?.data();
      const favs = meDoc?.favoriteArtists || [];
      const events = [];
      for (const fav of favs) {
        const artistEvents = await getArtistEvents(fav.name);
        artistEvents.forEach((e) => events.push({ ...e, artistName: fav.name }));
      }
      // Remove duplicates by id
      const byId = {};
      for (const ev of events) byId[ev.id] = ev;
      setConcerts(Object.values(byId));
    } catch (_e) {
      toast.error(t('Error cargando conciertos'));
    } finally {
      setConcertsLoading(false);
    }
  }

  async function saveAlbum(album) {
    if (!user) return;
    try {
      // Normalize album shape to match My Albums subscription (owner/albumId/name/artists/images/releaseDate)
      const albumId = album.albumId || album.id;
      const name = album.name;
      const artists = Array.isArray(album.artists)
        ? album.artists.map((a) => a.name ?? a).join(', ')
        : album.artists || '';
      const images = album.images || [];
      const releaseDate = album.releaseDate || album.release_date || null;

      // Duplicate check aligned with 'owner' and 'albumId'
      const qDup = query(
        collection(db, 'albums'),
        where('owner', '==', user.uid),
        where('albumId', '==', albumId)
      );
      const existing = await getDocs(qDup);
      if (!existing.empty) {
        toast(t('Este álbum ya está en tu colección'));
        return;
      }
      await addDoc(collection(db, 'albums'), {
        owner: user.uid,
        albumId,
        name,
        artists,
        images,
        releaseDate,
        addedAt: serverTimestamp(),
      });
      toast.success(t('Álbum guardado'));
    } catch (_error) {
      toast.error(t('Error al guardar álbum'));
    }
  }

  async function deleteAlbum(albumId) {
    try {
      await deleteDoc(doc(db, 'albums', albumId));
      toast.success('Álbum eliminado');
    } catch (_error) {
      toast.error('Error al eliminar álbum');
    }
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function getValueForSort(a, key) {
    switch (key) {
      case 'name':
        return a.name?.toLowerCase() || '';
      case 'artists':
        return a.artists?.toLowerCase() || '';
      case 'year':
        return a.releaseDate ? new Date(a.releaseDate).getFullYear() : -Infinity;
      case 'avg':
        return typeof avgRatings[a.albumId] === 'number' ? avgRatings[a.albumId] : -Infinity;
      case 'my':
        return typeof myRatings[a.albumId] === 'number' ? myRatings[a.albumId] : -Infinity;
      case 'added': {
        const ts = a.addedAt?.toDate ? a.addedAt.toDate() : a.addedAt ? new Date(a.addedAt) : null;
        return ts ? ts.getTime() : -Infinity;
      }
      default:
        return '';
    }
  }

  const sortedMyAlbums = [...myAlbums].sort((a, b) => {
    const va = getValueForSort(a, sortKey);
    const vb = getValueForSort(b, sortKey);
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function toggleSortRecPend(key) {
    if (sortKeyRecPend === key) {
      setSortDirRecPend((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKeyRecPend(key);
      setSortDirRecPend('asc');
    }
  }

  function toggleSortRecAcc(key) {
    if (sortKeyRecAcc === key) {
      setSortDirRecAcc((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKeyRecAcc(key);
      setSortDirRecAcc('asc');
    }
  }

  function getValueForSortRec(r, key) {
    switch (key) {
      case 'albumName':
        return r.albumName?.toLowerCase() || '';
      case 'artist':
        return r.artist?.toLowerCase() || '';
      case 'year':
        return r.releaseDate ? new Date(r.releaseDate).getFullYear() : -Infinity;
      case 'from':
        return getRecommenderName(r.from)?.toLowerCase() || '';
      default:
        return '';
    }
  }

  const sortedRecommended = [...recommended].sort((a, b) => {
    const va = getValueForSortRec(a, sortKeyRecPend);
    const vb = getValueForSortRec(b, sortKeyRecPend);
    if (va < vb) return sortDirRecPend === 'asc' ? -1 : 1;
    if (va > vb) return sortDirRecPend === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedAcceptedRecs = [...acceptedRecs].sort((a, b) => {
    const va = getValueForSortRec(a, sortKeyRecAcc);
    const vb = getValueForSortRec(b, sortKeyRecAcc);
    if (va < vb) return sortDirRecAcc === 'asc' ? -1 : 1;
    if (va > vb) return sortDirRecAcc === 'asc' ? 1 : -1;
    return 0;
  });

  async function recommendTo(album, toUid) {
    if (!user) return toast.error('Accede para recomendar');
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
        createdAt: new Date().toISOString(),
      });
      toast.success('Recomendación enviada');
      setOpenDialog(false);
    } catch (_error) {
      toast.error('Error al enviar recomendación');
    }
  }

  function openRecommendDialog(album) {
    if (friends.length === 0) {
      return toast.error('Añade amigos primero en la sección Amigos');
    }
    setSelectedAlbum(album);
    setOpenDialog(true);
  }

  async function acceptRecommendation(rec) {
    // mark accepted and add to my albums
    try {
      await setDoc(doc(db, 'recommendations', rec.id), { ...rec, accepted: true });
      await addDoc(collection(db, 'albums'), {
        owner: user.uid,
        albumId: rec.albumId,
        name: rec.albumName,
        artists: rec.artist,
        images: rec.images || [],
        releaseDate: rec.releaseDate,
        addedAt: new Date().toISOString(),
        viaRecommendation: true,
        recommendedBy: rec.from,
      });
      toast.success('Álbum aceptado y agregado a tu colección');
    } catch (_error) {
      toast.error('Error al aceptar recomendación');
    }
  }

  function getRecommenderName(uid) {
    const f = friends.find((fr) => fr.friendUid === uid);
    return f?.friendName || uid;
  }

  async function deleteRecommendation(recId) {
    try {
      await deleteDoc(doc(db, 'recommendations', recId));
      toast.success(t('Recomendación eliminada'));
    } catch (_error) {
      toast.error(t('Error al eliminar recomendación'));
    }
  }

  return (
    <Container maxWidth={false} sx={{ px: 0 }}>
      <Grid container spacing={0}>
        {/* Left: Tabs and contents (or bottom on narrow) */}
        <Grid
          item
          xs={12}
          md={isNarrow ? 12 : 6}
          sx={{ p: 3, borderRight: isNarrow ? 'none' : '1px solid #333', order: isNarrow ? 2 : 0 }}
        >
          <ButtonGroup variant="contained" sx={{ mb: 2 }}>
            <Button
              onClick={() => setActiveTab('myAlbums')}
              sx={{
                bgcolor: activeTab === 'myAlbums' ? '#1db954' : '#2a2a2a',
                '&:hover': { bgcolor: activeTab === 'myAlbums' ? '#1ed760' : '#3a3a3a' },
              }}
            >
              {t('Mis álbumes')} ({myAlbums.length})
            </Button>
            <Button
              onClick={() => setActiveTab('recommended')}
              sx={{
                bgcolor: activeTab === 'recommended' ? '#1db954' : '#2a2a2a',
                '&:hover': { bgcolor: activeTab === 'recommended' ? '#1ed760' : '#3a3a3a' },
              }}
            >
              {t('Recomendados')} ({recommended.length})
            </Button>
            <Button
              onClick={() => {
                setActiveTab('news');
                loadNewsFromFavorites();
              }}
              sx={{
                bgcolor: activeTab === 'news' ? '#1db954' : '#2a2a2a',
                '&:hover': { bgcolor: activeTab === 'news' ? '#1ed760' : '#3a3a3a' },
              }}
            >
              {t('Novedades')}
            </Button>
            <Button
              onClick={() => {
                setActiveTab('concerts');
                loadConcertsFromFavorites();
              }}
              sx={{
                bgcolor: activeTab === 'concerts' ? '#1db954' : '#2a2a2a',
                '&:hover': { bgcolor: activeTab === 'concerts' ? '#1ed760' : '#3a3a3a' },
              }}
            >
              {t('Conciertos')}
            </Button>
          </ButtonGroup>

          {activeTab === 'myAlbums' && (
            <Paper sx={{ p: 2 }}>
              <h3>
                {t('Mis álbumes')} ({myAlbums.length})
              </h3>
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
                      <TableCell></TableCell>
                      <TableCell onClick={() => toggleSort('name')} sx={{ cursor: 'pointer' }}>
                        {t('Nombre')} {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </TableCell>
                      <TableCell onClick={() => toggleSort('artists')} sx={{ cursor: 'pointer' }}>
                        {t('Artistas')}{' '}
                        {sortKey === 'artists' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </TableCell>
                      <TableCell onClick={() => toggleSort('year')} sx={{ cursor: 'pointer' }}>
                        {t('Año')} {sortKey === 'year' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </TableCell>
                      <TableCell onClick={() => toggleSort('avg')} sx={{ cursor: 'pointer' }}>
                        {t('Media')} {sortKey === 'avg' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </TableCell>
                      <TableCell onClick={() => toggleSort('my')} sx={{ cursor: 'pointer' }}>
                        {t('Mi puntuación')}{' '}
                        {sortKey === 'my' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </TableCell>
                      <TableCell onClick={() => toggleSort('added')} sx={{ cursor: 'pointer' }}>
                        {t('Añadido')} {sortKey === 'added' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedMyAlbums.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <img
                            src={a.images?.[2]?.url || a.images?.[0]?.url}
                            alt={a.name}
                            style={{
                              width: 50,
                              height: 50,
                              objectFit: 'cover',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                            onClick={() => navigate(`/album/${a.albumId}`)}
                          />
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              cursor: 'pointer',
                              color: '#1db954',
                              textDecoration: 'underline',
                            }}
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
                              '&:hover': { color: '#1ed760' },
                            }}
                          >
                            {a.artists}
                          </span>
                        </TableCell>
                        <TableCell>
                          {a.releaseDate ? new Date(a.releaseDate).getFullYear() : '-'}
                        </TableCell>
                        <TableCell>
                          {avgRatings[a.albumId] ? avgRatings[a.albumId].toFixed(1) : '-'}
                        </TableCell>
                        <TableCell>{myRatings[a.albumId] ?? '-'}</TableCell>
                        <TableCell>
                          {a.addedAt?.toDate
                            ? new Date(a.addedAt.toDate()).toLocaleDateString()
                            : a.addedAt
                              ? new Date(a.addedAt).toLocaleDateString()
                              : '-'}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() =>
                              window.open(`https://open.spotify.com/album/${a.albumId}`, '_blank')
                            }
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
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {activeTab === 'recommended' && (
            <>
              <Paper sx={{ p: 2, mb: 3 }}>
                <h3>
                  {t('Álbumes recomendados por mis amigos (pendientes)')} ({recommended.length})
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
                          {sortKeyRecPend === 'albumName'
                            ? sortDirRecPend === 'asc'
                              ? '▲'
                              : '▼'
                            : ''}
                        </TableCell>
                        <TableCell
                          onClick={() => toggleSortRecPend('artist')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('Artista')}{' '}
                          {sortKeyRecPend === 'artist'
                            ? sortDirRecPend === 'asc'
                              ? '▲'
                              : '▼'
                            : ''}
                        </TableCell>
                        <TableCell
                          onClick={() => toggleSortRecPend('year')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('Año')}{' '}
                          {sortKeyRecPend === 'year' ? (sortDirRecPend === 'asc' ? '▲' : '▼') : ''}
                        </TableCell>
                        <TableCell
                          onClick={() => toggleSortRecPend('from')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('Recomendado por')}{' '}
                          {sortKeyRecPend === 'from' ? (sortDirRecPend === 'asc' ? '▲' : '▼') : ''}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedRecommended.map((r) => (
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
                              style={{
                                cursor: 'pointer',
                                color: '#1db954',
                                textDecoration: 'underline',
                              }}
                              onClick={() => navigate(`/album/${r.albumId}`)}
                            >
                              {r.albumName}
                            </span>
                          </TableCell>
                          <TableCell>{r.artist}</TableCell>
                          <TableCell>
                            {r.releaseDate ? new Date(r.releaseDate).getFullYear() : '-'}
                          </TableCell>
                          <TableCell>{getRecommenderName(r.from)}</TableCell>
                          <TableCell>
                            <IconButton
                              onClick={() =>
                                window.open(`https://open.spotify.com/album/${r.albumId}`, '_blank')
                              }
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
                  {t('Recomendaciones aceptadas')} ({acceptedRecs.length})
                </h3>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell></TableCell>
                        <TableCell
                          onClick={() => toggleSortRecAcc('albumName')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('Álbum')}{' '}
                          {sortKeyRecAcc === 'albumName'
                            ? sortDirRecAcc === 'asc'
                              ? '▲'
                              : '▼'
                            : ''}
                        </TableCell>
                        <TableCell
                          onClick={() => toggleSortRecAcc('artist')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('Artista')}{' '}
                          {sortKeyRecAcc === 'artist' ? (sortDirRecAcc === 'asc' ? '▲' : '▼') : ''}
                        </TableCell>
                        <TableCell
                          onClick={() => toggleSortRecAcc('year')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('Año')}{' '}
                          {sortKeyRecAcc === 'year' ? (sortDirRecAcc === 'asc' ? '▲' : '▼') : ''}
                        </TableCell>
                        <TableCell
                          onClick={() => toggleSortRecAcc('from')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('Recomendado por')}{' '}
                          {sortKeyRecAcc === 'from' ? (sortDirRecAcc === 'asc' ? '▲' : '▼') : ''}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedAcceptedRecs.map((r) => (
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
                          <TableCell>
                            {r.releaseDate ? new Date(r.releaseDate).getFullYear() : '-'}
                          </TableCell>
                          <TableCell>{getRecommenderName(r.from)}</TableCell>
                          <TableCell>
                            <IconButton
                              onClick={() =>
                                window.open(`https://open.spotify.com/album/${r.albumId}`, '_blank')
                              }
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
          )}

          {activeTab === 'news' && (
            <Paper sx={{ p: 2 }}>
              <h3>
                {t('Novedades basadas en tus favoritos')} ({news.length})
              </h3>
              {newsLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CircularProgress size={20} />
                  <span>{t('Cargando...')}</span>
                </Box>
              )}
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {news.map((album) => (
                  <Grid item key={album.id} xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2 }}>
                      <img
                        src={album.images?.[0]?.url}
                        alt=""
                        style={{
                          width: '100%',
                          height: 160,
                          objectFit: 'cover',
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/album/${album.id}`)}
                      />
                      <div>
                        <strong
                          style={{
                            cursor: 'pointer',
                            color: '#1db954',
                            textDecoration: 'underline',
                          }}
                          onClick={() => navigate(`/album/${album.id}`)}
                        >
                          {album.name}
                        </strong>
                      </div>
                      <div>{album.artists?.map((a) => a.name).join(', ')}</div>
                      <div style={{ color: '#999', fontSize: '0.9em', marginTop: 4 }}>
                        {album.release_date ? new Date(album.release_date).getFullYear() : ''}
                      </div>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          variant="contained"
                          sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                          onClick={() =>
                            saveAlbum({
                              id: album.id,
                              name: album.name,
                              artists: album.artists,
                              images: album.images,
                              release_date: album.release_date,
                            })
                          }
                        >
                          {t('Guardar')}
                        </Button>
                        <Button
                          variant="outlined"
                          sx={{
                            borderColor: '#1db954',
                            color: '#1db954',
                            '&:hover': { borderColor: '#1ed760', color: '#1ed760' },
                          }}
                          onClick={() => {
                            const url =
                              album.external_urls?.spotify ||
                              `https://open.spotify.com/album/${album.id}`;
                            window.open(url, '_blank');
                          }}
                        >
                          {t('Escuchar en Spotify')}
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
                {news.length === 0 && !newsLoading && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <span>{t('No hay novedades recientes')}</span>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {activeTab === 'concerts' && (
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
          )}
        </Grid>

        {/* Right: Search and results (or top on narrow) */}
        <Grid item xs={12} md={isNarrow ? 12 : 6} sx={{ p: 3, order: isNarrow ? 1 : 0 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={9}>
              <TextField
                fullWidth
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('Buscar álbumes')}
              />
            </Grid>
            <Grid item xs={3}>
              <Button
                onClick={handleSearch}
                disabled={searchLoading}
                variant="contained"
                color="primary"
                sx={{ bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
              >
                {searchLoading ? t('Buscando...') : 'Buscar'}
              </Button>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 3 }} id="results-section">
            <Grid item xs={12}>
              {q && <h3>{t('Resultados')}</h3>}
              {searchLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CircularProgress size={20} />
                  <span>{t('Buscando...')}</span>
                </Box>
              )}
              {q && (
                <Grid container spacing={2}>
                  {results.map((album) => (
                    <Grid item key={album.id} xs={12} sm={6}>
                      <Paper sx={{ p: 2 }}>
                        <img
                          src={album.images?.[0]?.url}
                          alt=""
                          style={{
                            width: '100%',
                            height: 160,
                            objectFit: 'cover',
                            cursor: 'pointer',
                          }}
                          onClick={() => navigate(`/album/${album.id}`)}
                        />
                        <div>
                          <strong
                            style={{
                              cursor: 'pointer',
                              color: '#1db954',
                              textDecoration: 'underline',
                            }}
                            onClick={() => navigate(`/album/${album.id}`)}
                          >
                            {album.name}
                          </strong>
                        </div>
                        <div>{album.artists.map((a) => a.name).join(', ')}</div>
                        <div style={{ color: '#999', fontSize: '0.9em', marginTop: 4 }}>
                          {album.release_date ? new Date(album.release_date).getFullYear() : ''}
                        </div>
                        <Button
                          variant="contained"
                          sx={{ mt: 1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                          onClick={() => saveAlbum(album)}
                          disabled={myAlbums.some((a) => (a.albumId || a.album?.id) === album.id)}
                        >
                          {myAlbums.some((a) => (a.albumId || a.album?.id) === album.id)
                            ? t('Ya guardado')
                            : t('Guardar')}
                        </Button>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>
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
                  <div>
                    <strong>{selectedAlbum.name}</strong>
                  </div>
                  <div style={{ color: '#999', fontSize: '0.9em' }}>{selectedAlbum.artists}</div>
                </Grid>
              </Grid>
            </Paper>
          )}
          <List>
            {friends.map((friend) => (
              <ListItem key={friend.id} disablePadding>
                <ListItemButton
                  onClick={() => recommendTo(selectedAlbum, friend.friendUid)}
                  sx={{
                    '&:hover': { bgcolor: 'rgba(29, 185, 84, 0.1)' },
                    borderRadius: 1,
                  }}
                >
                  <ListItemText primary={friend.friendName} secondary={friend.friendUid} />
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
    </Container>
  );
}
