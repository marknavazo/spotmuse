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
  Typography,
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
import AlbumCover from '../common/AlbumCover';
import {
  incrementAlbumPlay,
  saveAlbum as saveAlbumService,
  recommendTo as recommendToService,
  acceptRecommendation as acceptRecommendationService,
  deleteRecommendation as deleteRecommendationService,
  subscribeMyAlbums,
  subscribeRecommendedToMe,
  subscribeAcceptedRecommendations,
  subscribeFriends,
  subscribeLists,
  subscribeListAlbumCounts,
  subscribeAllRatings,
} from '../../services/firebaseService';
import '../../styles/albums.scss';
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
  const [lists, setLists] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listAlbumCounts, setListAlbumCounts] = useState({});
  const [newListName, setNewListName] = useState('');
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState('');
  const [ownersByAlbumId, setOwnersByAlbumId] = useState({});
  const [concertsFilter, setConcertsFilter] = useState('');
  const [myRatings, setMyRatings] = useState({});
  const [avgRatings, setAvgRatings] = useState({});
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [sortKeyRecPend, setSortKeyRecPend] = useState('albumName');
  const [sortDirRecPend, setSortDirRecPend] = useState('asc');
  const [sortKeyRecAcc, setSortKeyRecAcc] = useState('albumName');
  const [sortDirRecAcc, setSortDirRecAcc] = useState('asc');
  const [myFilter, setMyFilter] = useState('');
  const token = import.meta.env.VITE_SPOTIFY_TOKEN;
  const user = auth.currentUser;
  const isNarrow = useMediaQuery('(max-width:1500px)');

  useEffect(() => {
    if (!user) return;
    const unsubMy = subscribeMyAlbums(user.uid, (items) => {
      setMyAlbums(items);
      setMyLoading(false);
    });
    const unsubRec = subscribeRecommendedToMe(user.uid, (items) => {
      setRecommended(items);
      setRecLoading(false);
    });
    const unsubRecAccepted = subscribeAcceptedRecommendations(user.uid, (items) => {
      setAcceptedRecs(items);
    });
    const unsubFriends = subscribeFriends(user.uid, (items) => {
      setFriends(items);
      setFriendsLoading(false);
    });
    const unsubLists = subscribeLists(user.uid, (items) => {
      setLists(items);
      setListsLoading(false);
    });
    const unsubListAlbums = subscribeListAlbumCounts(user.uid, (counts) =>
      setListAlbumCounts(counts)
    );
    return () => {
      unsubMy();
      unsubRec();
      unsubRecAccepted();
      unsubFriends();
      unsubLists();
      unsubListAlbums();
    };
  }, [user]);

  // Subscribe to ratings to show my score and global average
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeAllRatings((items) => {
      const myMap = {};
      const totals = {};
      const counts = {};
      items.forEach((data) => {
        if (!data.albumId || typeof data.value !== 'number') return;
        if (data.uid === user.uid) myMap[data.albumId] = data.value;
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

  async function createList() {
    if (!user) return;
    const name = newListName.trim();
    if (!name) return toast.error(t('Nombre de lista requerido'));
    try {
      await addDoc(collection(db, 'lists'), {
        owner: user.uid,
        name,
        createdAt: new Date().toISOString(),
      });
      setNewListName('');
      toast.success(t('Lista creada'));
    } catch (_e) {
      toast.error(t('Error al crear lista'));
    }
  }

  async function deleteList(id) {
    try {
      await deleteDoc(doc(db, 'lists', id));
      toast.success(t('Lista eliminada'));
    } catch (_e) {
      toast.error(t('Error al eliminar lista'));
    }
  }

  async function startEditList(list) {
    setEditingListId(list.id);
    setEditingListName(list.name || '');
  }

  async function saveEditList() {
    if (!editingListId) return;
    const name = editingListName.trim();
    if (!name) return toast.error(t('Nombre de lista requerido'));
    try {
      await setDoc(doc(db, 'lists', editingListId), { name }, { merge: true });
      setEditingListId(null);
      setEditingListName('');
      toast.success(t('Lista actualizada'));
    } catch (_e) {
      toast.error(t('Error al actualizar lista'));
    }
  }

  async function saveAlbum(album) {
    if (!user) return;
    try {
      await saveAlbumService(user.uid, album);
      toast.success(t('Álbum guardado'));
      await refreshOwnersForAlbum(album.albumId || album.id);
    } catch (_error) {
      toast.error(t('Error al guardar álbum'));
    }
  }

  async function _addAlbumToList(listId, album) {
    if (!user) return;
    if (!listId) return;
    try {
      const albumId = album.albumId || album.id;
      // prevent duplicates within list
      const name = album.name;
      const artists = Array.isArray(album.artists)
        ? album.artists.map((a) => a.name ?? a).join(', ')
        : album.artists || '';
      const images = album.images || [];
      const releaseDate = album.releaseDate || album.release_date || null;
      await addDoc(collection(db, 'listAlbums'), {
        owner: user.uid,
        listId,
        albumId,
        name,
        artists,
        images,
        releaseDate,
        createdAt: serverTimestamp(),
      });
      toast.success(t('Álbum añadido a la lista'));
    } catch (_e) {
      toast.error(t('Error al añadir a la lista'));
    }
  }

  async function deleteAlbum(albumId) {
    try {
      await deleteDoc(doc(db, 'albums', albumId));
      toast.success('Álbum eliminado');
      // Refresh owners map after deletion
      await refreshAllOwners();
    } catch (_error) {
      toast.error('Error al eliminar álbum');
    }
  }

  async function refreshOwnersForAlbum(albumId) {
    try {
      const snap = await getDocs(query(collection(db, 'albums'), where('albumId', '==', albumId)));
      const owners = snap.docs.map((d) => d.data().owner).filter(Boolean);
      setOwnersByAlbumId((prev) => ({ ...prev, [albumId]: owners }));
    } catch (_e) {}
  }

  async function refreshAllOwners() {
    try {
      // Build a set of albumIds currently visible across lists
      const albumIds = new Set();
      myAlbums.forEach((a) => albumIds.add(a.albumId));
      results.forEach((r) => albumIds.add(r.albumId || r.id));
      recommended.forEach((rec) => albumIds.add(rec.albumId));
      acceptedRecs.forEach((rec) => albumIds.add(rec.albumId));
      for (const id of albumIds) {
        await refreshOwnersForAlbum(id);
      }
    } catch (_e) {}
  }

  useEffect(() => {
    // Whenever lists change, refresh owners map for visible items
    refreshAllOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAlbums, results, recommended, acceptedRecs]);

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

  // Combine saved albums with accepted recommendations (even if not saved),
  // preferring the saved album entry when duplicates by albumId exist.
  const acceptedAsAlbums = acceptedRecs.map((r) => ({
    id: r.id,
    owner: user?.uid,
    albumId: r.albumId,
    name: r.albumName,
    artists: r.artist,
    images: r.images || [],
    releaseDate: r.releaseDate,
    addedAt: r.createdAt || r.acceptedAt || null,
    viaRecommendation: true,
    recommendedBy: r.from,
  }));
  const byId = new Map();
  acceptedAsAlbums.forEach((a) => {
    if (!byId.has(a.albumId)) byId.set(a.albumId, a);
  });
  myAlbums.forEach((a) => {
    // overwrite with real saved album
    byId.set(a.albumId, a);
  });
  const myAlbumsCombined = Array.from(byId.values());

  const sortedMyAlbums = [...myAlbumsCombined].sort((a, b) => {
    const va = getValueForSort(a, sortKey);
    const vb = getValueForSort(b, sortKey);
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
  const filteredMyAlbums = sortedMyAlbums.filter((a) => {
    if (!myFilter) return true;
    const ql = myFilter.toLowerCase();
    const fields = [a.name, a.artists, a.releaseDate, a.albumId];
    return fields.filter(Boolean).some((v) => String(v).toLowerCase().includes(ql));
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

  async function _recommendTo(album, toUid) {
    if (!user) return toast.error('Accede para recomendar');
    try {
      await recommendToService(user.uid, album, toUid);
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
    try {
      await acceptRecommendationService(user.uid, rec);
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
      await deleteRecommendationService(recId);
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
              {t('Mis álbumes')} ({myAlbumsCombined.length})
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
            <Button
              onClick={() => setActiveTab('lists')}
              sx={{
                bgcolor: activeTab === 'lists' ? '#1db954' : '#2a2a2a',
                '&:hover': { bgcolor: activeTab === 'lists' ? '#1ed760' : '#3a3a3a' },
              }}
            >
              {t('Listas')} ({lists.length})
            </Button>
          </ButtonGroup>

          {activeTab === 'myAlbums' && (
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
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell
                        onClick={() => toggleSort('name')}
                        sx={{ cursor: 'pointer', width: 200 }}
                      >
                        {t('Nombre')} {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </TableCell>
                      <TableCell
                        onClick={() => toggleSort('artists')}
                        sx={{ cursor: 'pointer', width: 220 }}
                      >
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
                    {filteredMyAlbums.map((a) => (
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
                            onClick={() => searchByArtist(a.artists)}
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
                          >
                            {a.artists}
                          </span>
                        </TableCell>
                        <TableCell>
                          {a.releaseDate ? new Date(a.releaseDate).getFullYear() : '-'}
                        </TableCell>
                        <TableCell>
                          {typeof avgRatings[a.albumId] === 'number'
                            ? Number(avgRatings[a.albumId]).toFixed(1)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {typeof myRatings[a.albumId] === 'number' ? myRatings[a.albumId] : '-'}
                        </TableCell>
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
                        <TableCell>{t('Añadido por')}</TableCell>
                        <TableCell>{t('Media')}</TableCell>
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
                          <TableCell sx={{ p: 0 }}>
                            <AlbumCover
                              images={r.images}
                              alt={r.albumName}
                              onClick={() => navigate(`/album/${r.albumId}`)}
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
                                window.open(
                                  `https://open.spotify.com/album/${r.albumId}`,
                                  '_blank'
                                );
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
                        <TableCell>{t('Añadido por')}</TableCell>
                        <TableCell>{t('Media')}</TableCell>
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
                          <TableCell sx={{ p: 0 }}>
                            <AlbumCover
                              images={r.images}
                              alt={r.albumName}
                              onClick={() => navigate(`/album/${r.albumId}`)}
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
                                window.open(
                                  `https://open.spotify.com/album/${r.albumId}`,
                                  '_blank'
                                );
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
              <Grid container spacing={1} sx={{ mt: 1 }}>
                {news.map((album) => (
                  <Grid item key={album.id} xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2 }}>
                      <AlbumCover
                        images={album.images}
                        alt={album.name}
                        className="album-card-cover"
                        onClick={() => navigate(`/album/${album.id}`)}
                      />
                      <div
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <strong
                          className="link-underline"
                          onClick={() => navigate(`/album/${album.id}`)}
                          title={album.name}
                        >
                          {album.name}
                        </strong>
                      </div>
                      <div
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={album.artists?.map((a) => a.name).join(', ')}
                      >
                        {album.artists?.map((a) => a.name).join(', ')}
                      </div>
                      <div style={{ color: '#999', fontSize: '0.9em', marginTop: 4 }}>
                        {album.release_date ? new Date(album.release_date).getFullYear() : ''}
                      </div>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <IconButton
                          onClick={() => {
                            if (user && album.id) {
                              incrementAlbumPlay(user.uid, album.id).catch(() => {});
                            }
                            const url =
                              album.external_urls?.spotify ||
                              `https://open.spotify.com/album/${album.id}`;
                            window.open(url, '_blank');
                          }}
                          sx={{
                            color: '#1db954',
                            mt: 1,
                            display: 'inline-flex',
                            alignSelf: 'flex-start',
                          }}
                          aria-label={t('Escuchar en Spotify')}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                        <Button
                          variant="contained"
                          sx={{ mt: 1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                          onClick={() =>
                            saveAlbum({
                              id: album.id,
                              name: album.name,
                              artists: album.artists,
                              images: album.images,
                              release_date: album.release_date,
                            })
                          }
                          disabled={myAlbums.some((a) => (a.albumId || a.album?.id) === album.id)}
                        >
                          {myAlbums.some((a) => (a.albumId || a.album?.id) === album.id)
                            ? t('Ya en tu colección')
                            : t('Añadir a mi colección')}
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

          {activeTab === 'lists' && (
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
                              style={{
                                cursor: 'pointer',
                                color: '#1db954',
                                textDecoration: 'underline',
                              }}
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
                    <Grid item key={album.id} xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2 }}>
                        <AlbumCover
                          images={album.images}
                          alt={album.name}
                          onClick={() => navigate(`/album/${album.id}`)}
                          className="album-card-cover"
                        />
                        <div
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <strong
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
                            onClick={() => navigate(`/album/${album.id}`)}
                            title={album.name}
                          >
                            {album.name}
                          </strong>
                        </div>
                        <div
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={album.artists.map((a) => a.name).join(', ')}
                        >
                          {album.artists.map((a) => a.name).join(', ')}
                        </div>
                        <div style={{ color: '#999', fontSize: '0.9em', marginTop: 4 }}>
                          {album.release_date ? new Date(album.release_date).getFullYear() : ''}
                        </div>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <IconButton
                            onClick={() => {
                              if (user && album.id) {
                                incrementAlbumPlay(user.uid, album.id).catch(() => {});
                              }
                              window.open(`https://open.spotify.com/album/${album.id}`, '_blank');
                            }}
                            sx={{
                              color: '#1db954',
                              mt: 1,
                              display: 'inline-flex',
                              alignSelf: 'flex-start',
                            }}
                            aria-label={t('Escuchar en Spotify')}
                          >
                            <PlayArrowIcon />
                          </IconButton>
                          <Button
                            variant="contained"
                            sx={{ mt: 1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}
                            onClick={() => saveAlbum(album)}
                            disabled={myAlbums.some((a) => (a.albumId || a.album?.id) === album.id)}
                          >
                            {myAlbums.some((a) => (a.albumId || a.album?.id) === album.id)
                              ? t('Ya en tu colección')
                              : t('Añadir a mi colección')}
                          </Button>
                        </Box>
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
                  <AlbumCover images={selectedAlbum.images} alt={selectedAlbum.name} size={60} />
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
          {/* Friend selection should appear here; removed misplaced add-to-collection button */}
          {friends && friends.length > 0 ? (
            <List>
              {friends.map((friend) => (
                <ListItem key={friend.id} disablePadding>
                  <ListItemButton
                    onClick={() => _recommendTo(selectedAlbum, friend.friendUid)}
                    sx={{ '&:hover': { bgcolor: 'rgba(29, 185, 84, 0.1)' }, borderRadius: 1 }}
                  >
                    <ListItemText primary={friend.friendName} secondary={friend.friendUid} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">{t('No tienes amigos añadidos aún')}</Typography>
          )}
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
