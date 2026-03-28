import { useEffect, useState, useCallback } from "react"
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  getDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store"
import type { Asset } from "@/types"

export function useAssets() {
  const { familyId } = useAuthStore()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId) {
      setAssets([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const q = query(
      collection(db, "families", familyId, "assets")
    )

    return onSnapshot(
      q,
      (snap) => {
        setAssets(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Asset))
        setLoading(false)
      },
      (err) => {
        console.error("[useAssets] Firestore listener error:", err)
        setError(err.message)
        setLoading(false)
      }
    )
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

  const updateAssetValue = useCallback(
    async (id: string, newValue: number) => {
      if (!familyId) throw new Error("No family")
      const ref = doc(db, "families", familyId, "assets", id)
      const snap = await getDoc(ref)
      const existing = (snap.data()?.valueHistory ?? []) as Array<{ date: string; value: number }>
      const today = new Date().toISOString().split("T")[0]
      // Append new entry (don't replace same-day — each update is a snapshot)
      const updated = [...existing, { date: today, value: newValue }]
        .sort((a, b) => a.date.localeCompare(b.date))
      await setDoc(ref, {
        currentValue: newValue,
        valueHistory: updated,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    },
    [familyId]
  )

  const addHistoricValue = useCallback(
    async (id: string, date: string, value: number) => {
      if (!familyId) throw new Error("No family")
      const ref = doc(db, "families", familyId, "assets", id)
      const snap = await getDoc(ref)
      const existing = (snap.data()?.valueHistory ?? []) as Array<{ date: string; value: number }>
      const updated = [...existing, { date, value }]
        .sort((a, b) => a.date.localeCompare(b.date))
      // Update currentValue to the latest entry
      const latest = updated[updated.length - 1]
      await setDoc(ref, {
        currentValue: latest.value,
        valueHistory: updated,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    },
    [familyId]
  )

  const deleteHistoricValue = useCallback(
    async (id: string, index: number) => {
      if (!familyId) throw new Error("No family")
      const ref = doc(db, "families", familyId, "assets", id)
      const snap = await getDoc(ref)
      const existing = (snap.data()?.valueHistory ?? []) as Array<{ date: string; value: number }>
      const updated = existing.filter((_, i) => i !== index)
      const latest = updated[updated.length - 1]
      await setDoc(ref, {
        currentValue: latest?.value ?? 0,
        valueHistory: updated,
        updatedAt: serverTimestamp(),
      }, { merge: true })
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

  return { assets, loading, error, addAsset, updateAsset, updateAssetValue, addHistoricValue, deleteHistoricValue, deleteAsset }
}
