import { getFirestore, doc, setDoc, serverTimestamp, increment, getDoc } from 'firebase/firestore';

import { firebaseApp } from './firebaseConfig';

export const db = getFirestore(firebaseApp);

// Increment per-user album play counter in `albumPlays` collection
// Doc id: `${uid}_${albumId}`; fields: { uid, albumId, count, updatedAt }
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

// Get current play info for user+album
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
