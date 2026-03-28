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
import type { CategoryRule } from "@/types"

/** Normalize a description to create a stable matching key. */
export function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\d{2}[./-]\d{2}[./-]\d{2,4}/g, "") // strip dates
    .replace(/\d+/g, "") // strip numbers (amounts, refs)
    .replace(/[^a-zäöüéèàâ ]/g, " ") // keep letters only
    .replace(/\s+/g, " ")
    .trim()
}

export function useCategoryRules() {
  const { familyId } = useAuthStore()
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familyId) {
      setRules([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(collection(db, "families", familyId, "categoryRules"))
    return onSnapshot(
      q,
      (snap) => {
        setRules(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CategoryRule)
        )
        setLoading(false)
      },
      (err) => {
        console.error("[useCategoryRules] listener error:", err)
        setLoading(false)
      }
    )
  }, [familyId])

  const addRule = useCallback(
    async (data: Omit<CategoryRule, "id" | "createdAt">) => {
      if (!familyId) throw new Error("No family")
      // Use the pattern as the doc ID so duplicates overwrite
      const docId = data.pattern.replace(/\s+/g, "_").slice(0, 128)
      const ref = doc(db, "families", familyId, "categoryRules", docId)
      await setDoc(ref, { ...data, createdAt: serverTimestamp() })
      return ref.id
    },
    [familyId]
  )

  const deleteRule = useCallback(
    async (id: string) => {
      if (!familyId) throw new Error("No family")
      await deleteDoc(doc(db, "families", familyId, "categoryRules", id))
    },
    [familyId]
  )

  /** Build a lookup map: normalized pattern → categoryKey */
  const ruleMap = new Map(rules.map((r) => [r.pattern, r.categoryKey]))

  return { rules, ruleMap, loading, addRule, deleteRule }
}
