import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
let app: any;

if (getApps().length === 0) {
  try {
    // Try to use service account from environment variables first
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || "reconme-fbee1",
      });
      console.log('Firebase initialized with service account from environment');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Use Application Default Credentials (for Vercel/Cloud environments)
      app = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "reconme-fbee1",
      });
      console.log('Firebase initialized with project ID from environment');
    } else {
      // Fallback to basic configuration
      app = initializeApp({
        projectId: "reconme-fbee1",
      });
      console.log('Firebase initialized with default configuration');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // Fallback initialization
    app = initializeApp({
      projectId: "reconme-fbee1",
    });
  }
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);

export async function verifyFirebaseToken(idToken: string) {
  try {
    console.log('Attempting to verify Firebase token...');
    
    if (!idToken) {
      throw new Error('No token provided');
    }

    // Clean the token (remove 'Bearer ' prefix if present)
    const cleanToken = idToken.replace(/^Bearer\s+/i, '');
    
    const decodedToken = await auth.verifyIdToken(cleanToken);
    
    console.log('Token verified successfully for user:', decodedToken.uid);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Firebase ID token has expired')) {
        throw new Error('Token expired - please log in again');
      } else if (error.message.includes('Firebase ID token has invalid signature')) {
        throw new Error('Invalid token signature');
      } else if (error.message.includes('Firebase ID token has no "kid" claim')) {
        throw new Error('Invalid token format');
      }
    }
    
    throw new Error('Invalid Firebase token');
  }
}
