import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  useMediaQuery,
  Typography,
  Paper,
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
} from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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

import RecommendedTables from './RecommendedTables';
import MyAlbumsTable from './MyAlbumsTable';
import NewsGrid from './NewsGrid';
import ConcertsGrid from './ConcertsGrid';
import ListsTable from './ListsTable';
import RightPane from './RightPane';

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
      for (const data of items) {
        if (!data.albumId || typeof data.value !== 'number') continue;
        if (data.uid === user.uid) myMap[data.albumId] = data.value;
        totals[data.albumId] = (totals[data.albumId] || 0) + data.value;
        counts[data.albumId] = (counts[data.albumId] || 0) + 1;
      }
      const avgMap = {};
      for (const id of Object.keys(totals)) {
        avgMap[id] = totals[id] / counts[id];
      }
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
        for (const e of artistEvents) {
          events.push({ ...e, artistName: fav.name });
        }
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
      for (const a of myAlbums) albumIds.add(a.albumId);
      for (const r of results) albumIds.add(r.albumId || r.id);
      for (const rec of recommended) albumIds.add(rec.albumId);
      for (const rec of acceptedRecs) albumIds.add(rec.albumId);
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
  for (const a of acceptedAsAlbums) {
    if (!byId.has(a.albumId)) byId.set(a.albumId, a);
  }
  for (const a of myAlbums) {
    // overwrite with real saved album
    byId.set(a.albumId, a);
  }
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
            <MyAlbumsTable
              t={t}
              myAlbumsCombined={filteredMyAlbums}
              myLoading={myLoading}
              myFilter={myFilter}
              setMyFilter={setMyFilter}
              avgRatings={avgRatings}
              myRatings={myRatings}
              ownersByAlbumId={ownersByAlbumId}
              user={user}
              toggleSort={toggleSort}
              sortKey={sortKey}
              sortDir={sortDir}
              navigate={navigate}
              incrementAlbumPlay={incrementAlbumPlay}
              openRecommendDialog={openRecommendDialog}
              deleteAlbum={deleteAlbum}
            />
          )}

          {activeTab === 'recommended' && (
            <RecommendedTables
              t={t}
              recLoading={recLoading}
              sortedRecommended={sortedRecommended}
              sortedAcceptedRecs={sortedAcceptedRecs}
              avgRatings={avgRatings}
              ownersByAlbumId={ownersByAlbumId}
              user={user}
              navigate={navigate}
              incrementAlbumPlay={incrementAlbumPlay}
              toggleSortRecPend={toggleSortRecPend}
              sortKeyRecPend={sortKeyRecPend}
              sortDirRecPend={sortDirRecPend}
              toggleSortRecAcc={toggleSortRecAcc}
              sortKeyRecAcc={sortKeyRecAcc}
              sortDirRecAcc={sortDirRecAcc}
              getRecommenderName={getRecommenderName}
              acceptRecommendation={acceptRecommendation}
              deleteRecommendation={deleteRecommendation}
            />
          )}

          {activeTab === 'news' && (
            <NewsGrid
              t={t}
              news={news}
              newsLoading={newsLoading}
              user={user}
              navigate={navigate}
              incrementAlbumPlay={incrementAlbumPlay}
              saveAlbum={saveAlbum}
              myAlbums={myAlbums}
            />
          )}

          {activeTab === 'concerts' && (
            <ConcertsGrid
              t={t}
              concerts={concerts}
              concertsLoading={concertsLoading}
              concertsFilter={concertsFilter}
              setConcertsFilter={setConcertsFilter}
            />
          )}

          {activeTab === 'lists' && (
            <ListsTable
              t={t}
              lists={lists}
              listsLoading={listsLoading}
              newListName={newListName}
              setNewListName={setNewListName}
              editingListId={editingListId}
              editingListName={editingListName}
              setEditingListName={setEditingListName}
              startEditList={startEditList}
              saveEditList={saveEditList}
              deleteList={deleteList}
              listAlbumCounts={listAlbumCounts}
              navigate={navigate}
              createList={createList}
            />
          )}
        </Grid>

        {/* Right: Search and results (or top on narrow) */}
        <RightPane
          t={t}
          q={q}
          setQ={setQ}
          searchLoading={searchLoading}
          handleSearch={handleSearch}
          results={results}
          navigate={navigate}
          user={user}
          incrementAlbumPlay={incrementAlbumPlay}
          saveAlbum={saveAlbum}
          myAlbums={myAlbums}
        />
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('Recomendar a un amigo')}</DialogTitle>
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
