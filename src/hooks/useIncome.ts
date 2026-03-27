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
import type { IncomeRecord } from "@/types"

export function useIncome() {
  const { familyId } = useAuthStore()
  const [incomes, setIncomes] = useState<IncomeRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familyId) {
      setIncomes([])
      setLoading(false)
      return
    }

    const q = query(
      collection(db, "families", familyId, "incomeRecords"),
      orderBy("startDate", "desc")
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as IncomeRecord
      )
      setIncomes(records)
      setLoading(false)
    })

    return unsubscribe
  }, [familyId])

  const addIncome = useCallback(
    async (data: Omit<IncomeRecord, "id" | "createdAt">) => {
      if (!familyId) throw new Error("No family")
      const ref = doc(collection(db, "families", familyId, "incomeRecords"))
      await setDoc(ref, { ...data, createdAt: serverTimestamp() })
      return ref.id
    },
    [familyId]
  )

  const updateIncome = useCallback(
    async (id: string, data: Partial<IncomeRecord>) => {
      if (!familyId) throw new Error("No family")
      await setDoc(doc(db, "families", familyId, "incomeRecords", id), data, {
        merge: true,
      })
    },
    [familyId]
  )

  const deleteIncome = useCallback(
    async (id: string) => {
      if (!familyId) throw new Error("No family")
      await deleteDoc(doc(db, "families", familyId, "incomeRecords", id))
    },
    [familyId]
  )

  const totalAnnualGross = incomes
    .filter((i) => !i.endDate && !i.isProjection)
    .reduce((sum, i) => sum + i.annualGross + (i.bonus ?? 0), 0)

  const totalMonthlyGross = Math.round(totalAnnualGross / 12)

  return {
    incomes,
    loading,
    addIncome,
    updateIncome,
    deleteIncome,
    totalAnnualGross,
    totalMonthlyGross,
  }
}
