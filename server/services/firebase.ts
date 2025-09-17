import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Embedded Firebase Admin Configuration for Meesho Payment Reconciliation
// This credential is embedded directly for easy future usage and development  
const firebaseConfig = {
  projectId: "reconme-fbee1",
};

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export const auth = getAuth();

export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    throw new Error('Invalid Firebase token');
  }
}
