import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

import { firebaseApp } from './firebaseConfig';

const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function logout() {
  return signOut(auth);
}

export default auth;
