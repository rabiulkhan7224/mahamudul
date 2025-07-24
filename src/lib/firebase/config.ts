
import { initializeApp, getApps, getApp } from "firebase/app";
// import { getAuth } from "firebase/auth"; // Temporarily disabled for local auth

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if the config is correctly set up
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("your-api-key")) {
    console.error("Firebase API Key is missing or is a placeholder. Please set it in your .env file. You can find it in your Firebase project settings under 'SDK setup and configuration'.");
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const auth = getAuth(app); // Temporarily disabled

export { app }; // Temporarily removed auth export
