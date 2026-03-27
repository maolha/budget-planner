import { initializeApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"
import { getStorage, connectStorageEmulator } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyCIr02bHNI0NQps2W3GJNzLiVbaUFva1BY",
  authDomain: "budget-builder-6b535.firebaseapp.com",
  projectId: "budget-builder-6b535",
  storageBucket: "budget-builder-6b535.firebasestorage.app",
  messagingSenderId: "630784031814",
  appId: "1:630784031814:web:34aa01983f7ca9c4221e47",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://localhost:9099")
  connectFirestoreEmulator(db, "localhost", 8080)
  connectStorageEmulator(storage, "localhost", 9199)
}

export default app
