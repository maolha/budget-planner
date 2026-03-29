import { useEffect, useState, useCallback } from "react"
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store"
import type { CategoryRule } from "@/types"
import type { ColumnMapping } from "@/engine/csv/types"

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

/** Create a stable fingerprint from a set of CSV headers. */
export function headersFingerprint(headers: string[]): string {
  return headers
    .map((h) => h.toLowerCase().trim())
    .sort()
    .join("|")
    .replace(/[^a-z0-9|]/g, "_")
    .slice(0, 128)
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

  // ── Saved column mappings ───────────────────────────────────────────────

  /** Save a column mapping keyed by the headers fingerprint. */
  const saveColumnMapping = useCallback(
    async (headers: string[], mapping: ColumnMapping) => {
      if (!familyId) return
      const fp = headersFingerprint(headers)
      const ref = doc(db, "families", familyId, "columnMappings", fp)
      await setDoc(ref, { ...mapping, savedAt: serverTimestamp() })
    },
    [familyId]
  )

  /** Load a previously saved column mapping for these headers (or null). */
  const loadColumnMapping = useCallback(
    async (headers: string[]): Promise<ColumnMapping | null> => {
      if (!familyId) return null
      const fp = headersFingerprint(headers)
      const snap = await getDoc(
        doc(db, "families", familyId, "columnMappings", fp)
      )
      if (!snap.exists()) return null
      const data = snap.data()
      // Validate that the saved columns still exist in the current headers
      const valid = (col: string | undefined) =>
        col && headers.includes(col) ? col : ""
      return {
        date: valid(data.date) ?? "",
        amount: valid(data.amount) ?? "",
        description: valid(data.description) ?? "",
        balance: valid(data.balance) || undefined,
        category: valid(data.category) || undefined,
      }
    },
    [familyId]
  )

  /** Build a lookup map: normalized pattern → categoryKey */
  const ruleMap = new Map(rules.map((r) => [r.pattern, r.categoryKey]))

  return {
    rules,
    ruleMap,
    loading,
    addRule,
    deleteRule,
    saveColumnMapping,
    loadColumnMapping,
  }
}
