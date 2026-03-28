import { useEffect, useState, useCallback } from "react"
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store"
import type { Scenario, LifeEvent } from "@/types"

export function useScenarios() {
  const { familyId } = useAuthStore()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familyId) {
      setScenarios([])
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(collection(db, "families", familyId, "scenarios"))
    return onSnapshot(
      q,
      (snap) => {
        setScenarios(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Scenario))
        setLoading(false)
      },
      (err) => {
        console.error("[useScenarios] Firestore listener error:", err)
        setLoading(false)
      }
    )
  }, [familyId])

  const baseScenario = scenarios.find((s) => s.isBase) ?? null
  const alternativeScenarios = scenarios.filter((s) => !s.isBase)

  const saveBaseEvents = useCallback(
    async (events: LifeEvent[]) => {
      if (!familyId) throw new Error("No family")
      const existing = scenarios.find((s) => s.isBase)
      const id = existing?.id ?? doc(collection(db, "families", familyId, "scenarios")).id
      await setDoc(doc(db, "families", familyId, "scenarios", id), {
        name: "Base Timeline",
        isBase: true,
        lifeEvents: events,
        updatedAt: serverTimestamp(),
        ...(!existing && { createdAt: serverTimestamp() }),
      }, { merge: true })
    },
    [familyId, scenarios]
  )

  const addScenario = useCallback(
    async (name: string) => {
      if (!familyId) throw new Error("No family")
      const ref = doc(collection(db, "families", familyId, "scenarios"))
      await setDoc(ref, {
        name,
        isBase: false,
        lifeEvents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return ref.id
    },
    [familyId]
  )

  const updateScenario = useCallback(
    async (id: string, data: { name?: string; lifeEvents?: LifeEvent[] }) => {
      if (!familyId) throw new Error("No family")
      await setDoc(
        doc(db, "families", familyId, "scenarios", id),
        { ...data, updatedAt: serverTimestamp() },
        { merge: true }
      )
    },
    [familyId]
  )

  const deleteScenario = useCallback(
    async (id: string) => {
      if (!familyId) throw new Error("No family")
      await deleteDoc(doc(db, "families", familyId, "scenarios", id))
    },
    [familyId]
  )

  return {
    baseScenario,
    baseEvents: baseScenario?.lifeEvents ?? [],
    alternativeScenarios,
    loading,
    saveBaseEvents,
    addScenario,
    updateScenario,
    deleteScenario,
  }
}
