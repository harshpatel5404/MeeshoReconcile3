import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

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

export const signInWithGoogle = () => {
  return signInWithRedirect(auth, googleProvider);
};

export const handleRedirectResult = () => {
  return getRedirectResult(auth);
};

export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logOut = () => {
  return signOut(auth);
};

export { auth as default };
