import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAoiSLbntckQuqepwHGzJ-xHCQVN6NLh_I",
  authDomain: "chitti-app-edfb1.firebaseapp.com",
  projectId: "chitti-app-edfb1",
  storageBucket: "chitti-app-edfb1.firebasestorage.app",
  messagingSenderId: "447142533670",
  appId: "1:447142533670:web:06d96ae14bfab70e3164e7",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
