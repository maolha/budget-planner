import { useEffect } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth"
import { query, collection, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useAuthStore } from "@/store"

const googleProvider = new GoogleAuthProvider()

export function useAuth() {
  const { user, loading, familyId, setUser, setLoading, setFamilyId } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        // Find user's family
        const q = query(
          collection(db, "families"),
          where("ownerId", "==", firebaseUser.uid)
        )
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          setFamilyId(snapshot.docs[0].id)
        }
      } else {
        setFamilyId(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [setUser, setLoading, setFamilyId])

  const signIn = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName })
    return credential
  }

  const signInWithGoogle = async () => {
    return signInWithPopup(auth, googleProvider)
  }

  const signOut = async () => {
    return firebaseSignOut(auth)
  }

  return {
    user,
    loading,
    familyId,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user,
  }
}
