import { useEffect, useState, useCallback } from "react"
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store"
import type { Asset } from "@/types"

export function useAssets() {
  const { familyId } = useAuthStore()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familyId) {
      setAssets([])
      setLoading(false)
      return
    }

    const q = query(
      collection(db, "families", familyId, "assets"),
      orderBy("type")
    )

    return onSnapshot(q, (snap) => {
      setAssets(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Asset))
      setLoading(false)
    })
  }, [familyId])

  const addAsset = useCallback(
    async (data: Omit<Asset, "id" | "createdAt" | "updatedAt" | "valueHistory">) => {
      if (!familyId) throw new Error("No family")
      const ref = doc(collection(db, "families", familyId, "assets"))
      await setDoc(ref, {
        ...data,
        valueHistory: [
          { date: new Date().toISOString().split("T")[0], value: data.currentValue },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return ref.id
    },
    [familyId]
  )

  const updateAsset = useCallback(
    async (id: string, data: Partial<Asset>) => {
      if (!familyId) throw new Error("No family")
      await setDoc(
        doc(db, "families", familyId, "assets", id),
        { ...data, updatedAt: serverTimestamp() },
        { merge: true }
      )
    },
    [familyId]
  )

  const deleteAsset = useCallback(
    async (id: string) => {
      if (!familyId) throw new Error("No family")
      await deleteDoc(doc(db, "families", familyId, "assets", id))
    },
    [familyId]
  )

  return { assets, loading, addAsset, updateAsset, deleteAsset }
}
