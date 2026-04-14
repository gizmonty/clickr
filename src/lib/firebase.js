import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyA_pJH5cGh_PFQkBEVwhAXtPaW8UW06Qro",
  authDomain: "clickr-c47c7.firebaseapp.com",
  projectId: "clickr-c47c7",
  storageBucket: "clickr-c47c7.firebasestorage.app",
  messagingSenderId: "975944689287",
  appId: "1:975944689287:web:9e0216e791ab235d5f7a22",
  measurementId: "G-9SWN1384BZ",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
