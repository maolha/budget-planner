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
      collection(db, "families", familyId, "incomeRecords")
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

  // Debug: log income data to help diagnose issues
  if (incomes.length > 0) {
    console.log("[useIncome] records:", incomes.length, "familyId:", familyId)
    incomes.forEach((i) =>
      console.log(`  ${i.employer}: gross=${i.annualGross} (${typeof i.annualGross}), endDate=${JSON.stringify(i.endDate)}, projection=${i.isProjection}`)
    )
  }

  const currentIncomes = incomes.filter((i) => {
    const hasEndDate = i.endDate !== null && i.endDate !== undefined && i.endDate !== ""
    return !hasEndDate && !i.isProjection
  })

  const totalAnnualGross = currentIncomes
    .reduce((sum, i) => sum + Number(i.annualGross || 0) + Number(i.bonus || 0), 0)

  console.log("[useIncome] current positions:", currentIncomes.length, "totalAnnualGross:", totalAnnualGross)

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
