// Quick Setup Configuration
// This file contains all the configuration needed for the application
// For security, actual values are stored in environment variables

export const firebaseConfig = {
  apiKey: "AIzaSyCLtVv-8X3mBfKeCkS_Q0nqk-7DoPfDo4c",
  authDomain: "reconme-fbee1.firebaseapp.com",
  databaseURL: "https://reconme-fbee1-default-rtdb.firebaseio.com",
  projectId: "reconme-fbee1",
  storageBucket: "reconme-fbee1.firebasestorage.app",
  messagingSenderId: "511599323860",
  appId: "1:511599323860:web:38ac9cf5e061ff350e2941"
};

export const databaseConfig = {
  url: "postgresql://postgres:$Harsh98@db.tepwrjnmaosalngjffvy.supabase.co:5432/postgres"
};

export const testCredentials = {
  email: "test@gmail.com",
  password: "test1234"
};

// Quick setup function for new developers
export function setupEnvironment() {
  console.log("=== Meesho Payment Reconciliation Setup ===");
  console.log("1. Set these environment variables in Replit Secrets:");
  console.log("   VITE_FIREBASE_PROJECT_ID:", firebaseConfig.projectId);
  console.log("   VITE_FIREBASE_APP_ID:", firebaseConfig.appId);
  console.log("   VITE_FIREBASE_API_KEY:", firebaseConfig.apiKey);
  console.log("   VITE_FIREBASE_MESSAGING_SENDER_ID:", firebaseConfig.messagingSenderId);
  console.log("   DATABASE_URL:", databaseConfig.url);
  console.log("");
  console.log("2. Test login credentials:");
  console.log("   Email:", testCredentials.email);
  console.log("   Password:", testCredentials.password);
  console.log("");
  console.log("3. Run 'npm install' then 'npm run dev'");
}

// Uncomment the line below to run setup
// setupEnvironment();