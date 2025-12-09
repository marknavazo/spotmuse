import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  increment,
  getDoc,
} from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';

import { db } from '../firebase/firestore';

// Plays
export async function incrementAlbumPlay(uid, albumId) {
  if (!uid || !albumId) return;
  const id = `${uid}_${albumId}`;
  const ref = doc(db, 'albumPlays', id);
  await setDoc(
    ref,
    {
      uid,
      albumId,
      count: increment(1),
      updatedAt: serverTimestamp(),
      lastPlayedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getAlbumPlayInfo(uid, albumId) {
  if (!uid || !albumId) return { count: 0, lastPlayedAt: null };
  const id = `${uid}_${albumId}`;
  const ref = doc(db, 'albumPlays', id);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : null;
  return {
    count: typeof data?.count === 'number' ? data.count : 0,
    lastPlayedAt: data?.lastPlayedAt || data?.updatedAt || null,
  };
}

// Ratings
export async function getMyRating(uid, albumId) {
  if (!uid || !albumId) return 0;
  const ratingId = `${uid}_${albumId}`;
  const ref = doc(collection(db, 'ratings'), ratingId);
  const snap = await getDoc(ref);
  const d = snap.exists() ? snap.data() : null;
  return d?.value || 0;
}

export async function saveMyRating(uid, albumId, value) {
  if (!uid || !albumId) return;
  const ratingId = `${uid}_${albumId}`;
  const ref = doc(collection(db, 'ratings'), ratingId);
  await setDoc(ref, { uid, albumId, value, updatedAt: serverTimestamp() }, { merge: true });
}

// Comments
export async function addComment(uid, albumId, text) {
  if (!uid || !albumId || !text) return;
  await addDoc(collection(db, 'comments'), {
    albumId,
    uid,
    text,
    createdAt: serverTimestamp(),
    edited: false,
  });
}

export async function editComment(commentId, text) {
  if (!commentId || !text) return;
  await setDoc(
    doc(db, 'comments', commentId),
    { text, edited: true, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteComment(commentId) {
  if (!commentId) return;
  await deleteDoc(doc(db, 'comments', commentId));
}

// Favorites
export async function toggleFavoriteTrack(uid, albumId, track) {
  if (!uid || !albumId || !track?.id) return;
  // Check existing favorite docs
  const qFav = query(
    collection(db, 'trackFavorites'),
    where('uid', '==', uid),
    where('albumId', '==', albumId),
    where('trackId', '==', track.id)
  );
  const snap = await getDocs(qFav);
  if (!snap.empty) {
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'trackFavorites', d.id))));
  } else {
    await addDoc(collection(db, 'trackFavorites'), {
      uid,
      albumId,
      trackId: track.id,
      trackName: track.name,
      createdAt: serverTimestamp(),
    });
  }
}

// Albums & recommendations
export async function saveAlbum(uid, album) {
  if (!uid || !album) return;
  const albumId = album.albumId || album.id;
  const name = album.name;
  const artists = Array.isArray(album.artists)
    ? album.artists.map((a) => a.name ?? a).join(', ')
    : album.artists || '';
  const images = album.images || [];
  const releaseDate = album.releaseDate || album.release_date || null;

  const qDup = query(
    collection(db, 'albums'),
    where('owner', '==', uid),
    where('albumId', '==', albumId)
  );
  const existing = await getDocs(qDup);
  if (!existing.empty) return;

  await addDoc(collection(db, 'albums'), {
    owner: uid,
    albumId,
    name,
    artists,
    images,
    releaseDate,
    addedAt: serverTimestamp(),
  });
}

export async function recommendTo(uidFrom, album, uidTo) {
  if (!uidFrom || !album || !uidTo) return;
  await addDoc(collection(db, 'recommendations'), {
    from: uidFrom,
    to: uidTo,
    albumId: album.albumId || album.id,
    albumName: album.name,
    artist: Array.isArray(album.artists)
      ? album.artists.map((a) => a.name ?? a).join(', ')
      : album.artists || '',
    images: album.images || [],
    releaseDate: album.releaseDate || album.release_date || null,
    accepted: false,
    createdAt: new Date().toISOString(),
  });
}

export async function acceptRecommendation(uid, recommendationDoc) {
  if (!uid || !recommendationDoc) return;
  await setDoc(doc(db, 'recommendations', recommendationDoc.id), {
    ...recommendationDoc,
    accepted: true,
  });
  await addDoc(collection(db, 'albums'), {
    owner: uid,
    albumId: recommendationDoc.albumId,
    name: recommendationDoc.albumName,
    artists: recommendationDoc.artist,
    images: recommendationDoc.images || [],
    releaseDate: recommendationDoc.releaseDate,
    addedAt: serverTimestamp(),
    viaRecommendation: true,
    recommendedBy: recommendationDoc.from,
  });
}

export async function deleteRecommendation(recId) {
  if (!recId) return;
  await deleteDoc(doc(db, 'recommendations', recId));
}

// Subscriptions (centralized listeners)
export function subscribeMyAlbums(uid, callback) {
  if (!uid || !callback) return () => {};
  const ref = collection(db, 'albums');
  const q1 = query(ref, where('owner', '==', uid));
  const unsub = onSnapshot(q1, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
  return unsub;
}

export function subscribeRecommendedToMe(uid, callback) {
  if (!uid || !callback) return () => {};
  const ref = collection(db, 'recommendations');
  const q2 = query(ref, where('to', '==', uid), where('accepted', '==', false));
  const unsub = onSnapshot(q2, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
  return unsub;
}

export function subscribeAcceptedRecommendations(uid, callback) {
  if (!uid || !callback) return () => {};
  const ref = collection(db, 'recommendations');
  const q = query(ref, where('to', '==', uid), where('accepted', '==', true));
  const unsub = onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
  return unsub;
}

export function subscribeFriends(uid, callback) {
  if (!uid || !callback) return () => {};
  const ref = collection(db, 'friends');
  const q = query(ref, where('userId', '==', uid));
  const unsub = onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
  return unsub;
}

export function subscribeLists(uid, callback) {
  if (!uid || !callback) return () => {};
  const ref = collection(db, 'lists');
  const q = query(ref, where('owner', '==', uid));
  const unsub = onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
  return unsub;
}

export function subscribeListAlbumCounts(uid, callback) {
  if (!uid || !callback) return () => {};
  const ref = collection(db, 'listAlbums');
  const q = query(ref, where('owner', '==', uid));
  const unsub = onSnapshot(q, (snap) => {
    const counts = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      const lid = data.listId;
      if (!lid) return;
      counts[lid] = (counts[lid] || 0) + 1;
    });
    callback(counts);
  });
  return unsub;
}

export function subscribeAllRatings(callback) {
  if (!callback) return () => {};
  const ref = collection(db, 'ratings');
  const unsub = onSnapshot(ref, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
  return unsub;
}

export function subscribeAverageRatingForAlbum(albumId, callback) {
  if (!albumId || !callback) return () => {};
  const ref = collection(db, 'ratings');
  const q = query(ref, where('albumId', '==', albumId));
  const unsub = onSnapshot(q, (snap) => {
    let total = 0;
    let count = 0;
    snap.docs.forEach((d) => {
      const data = d.data();
      if (typeof data.value === 'number') {
        total += data.value;
        count += 1;
      }
    });
    callback(count > 0 ? total / count : null);
  });
  return unsub;
}

export function subscribeListsForAlbum(uid, albumId, callback) {
  if (!uid || !albumId || !callback) return () => {};
  const laRef = collection(db, 'listAlbums');
  const qla = query(laRef, where('owner', '==', uid), where('albumId', '==', albumId));
  const unsub = onSnapshot(qla, (snap) => {
    const ids = snap.docs.map((d) => d.data().listId).filter(Boolean);
    callback(ids);
  });
  return unsub;
}

export function subscribeAlbumOwnersCount(albumId, uid, callback) {
  if (!albumId || !callback) return () => {};
  const albumsRef = collection(db, 'albums');
  const qAlbums = query(albumsRef, where('albumId', '==', albumId));
  const unsub = onSnapshot(qAlbums, (snap) => {
    const count = snap.docs.length;
    const mine = uid ? snap.docs.some((d) => d.data().owner === uid) : false;
    callback({ count, mine });
  });
  return unsub;
}

export function subscribeCommentsForAlbum(albumId, allowedUids, callback) {
  if (!albumId || !callback) return () => {};
  const cRef = collection(db, 'comments');
  const qC = query(cRef, where('albumId', '==', albumId));
  const allowedSet = allowedUids ? new Set(allowedUids) : null;
  const unsub = onSnapshot(qC, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const filtered = allowedSet ? items.filter((c) => allowedSet.has(c.uid)) : items;
    filtered.sort((a, b) => {
      const ta = a.createdAt?.toDate
        ? a.createdAt.toDate().getTime()
        : Date.parse(a.createdAt || 0) || 0;
      const tb = b.createdAt?.toDate
        ? b.createdAt.toDate().getTime()
        : Date.parse(b.createdAt || 0) || 0;
      return tb - ta;
    });
    callback(filtered);
  });
  return unsub;
}

// Utility: resolve who recommended an album to a user (accepted recommendations)
export async function getRecommendedByName(uid, albumId) {
  if (!uid || !albumId) return '';
  try {
    const recSnap = await getDocs(
      query(
        collection(db, 'recommendations'),
        where('to', '==', uid),
        where('albumId', '==', albumId),
        where('accepted', '==', true)
      )
    );
    const first = recSnap.docs[0]?.data();
    if (!first?.from) return '';
    const friendsSnap = await getDocs(query(collection(db, 'friends'), where('userId', '==', uid)));
    const friends = friendsSnap.docs.map((d) => d.data());
    const match = friends.find((f) => f.friendUid === first.from);
    return match?.friendName || first.from;
  } catch {
    return '';
  }
}
