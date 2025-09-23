import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";

// Embedded Firebase Configuration for Meesho Payment Reconciliation
// These credentials are embedded directly for easy future usage and development
const firebaseConfig = {
  apiKey: "AIzaSyCLtVv-8X3mBfKeCkS_Q0nqk-7DoPfDo4c",
  authDomain: "reconme-fbee1.firebaseapp.com",
  databaseURL: "https://reconme-fbee1-default-rtdb.firebaseio.com",
  projectId: "reconme-fbee1",
  storageBucket: "reconme-fbee1.firebasestorage.app",
  messagingSenderId: "511599323860",
  appId: "1:511599323860:web:38ac9cf5e061ff350e2941",
};

// Initialize Firebase only if no apps exist
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const signInWithGoogle = async () => {
  try {
    // Try popup first for better UX
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    // If popup is blocked or fails, fallback to redirect
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      return signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
};

export const handleRedirectResult = () => {
  return getRedirectResult(auth);
};

export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update the user's display name if provided
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, {
      displayName: displayName
    });
  }
  
  return userCredential;
};

export const logOut = () => {
  return signOut(auth);
};

export { auth as default };
