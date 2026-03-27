import { useEffect, useState, useCallback, useMemo } from "react"
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId) {
      setIncomes([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const q = query(
      collection(db, "families", familyId, "incomeRecords")
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as IncomeRecord
        )
        setIncomes(records)
        setLoading(false)
      },
      (err) => {
        console.error("[useIncome] Firestore listener error:", err)
        setError(err.message)
        setLoading(false)
      }
    )

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

  const today = new Date().toISOString().split("T")[0]
  const currentIncomes = incomes.filter((i) => {
    if (i.isProjection) return false
    if (!i.endDate) return true
    return i.endDate >= today
  })

  const totalAnnualGross = currentIncomes
    .reduce((sum, i) => sum + Number(i.annualGross || 0) + Number(i.bonus || 0), 0)

  const totalMonthlyGross = Math.round(totalAnnualGross / 12)

  // Build a 24-month cash flow timeline with bonus payout timing
  // Records with no endDate project indefinitely; records with endDate stop when it's passed
  const incomeTimeline = useMemo(() => {
    const timeline: Array<{
      month: string       // YYYY-MM
      baseIncome: number  // monthly salary (gross)
      bonusIncome: number // bonus paid this month (gross)
      totalIncome: number
    }> = []

    for (let i = 0; i < 24; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() + i)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const calMonth = d.getMonth() + 1 // 1-12

      let baseIncome = 0
      let bonusIncome = 0

      for (const inc of currentIncomes) {
        // Skip if this income has ended before this month
        if (inc.endDate && inc.endDate < ym) continue

        const monthlyBase = Math.round(Number(inc.annualGross || 0) / 12)
        baseIncome += monthlyBase

        const bonus = Number(inc.bonus || 0)
        if (bonus <= 0) continue

        const freq = inc.bonusFrequency ?? "annual"
        const payoutMonths = inc.bonusPayoutMonths?.length
          ? inc.bonusPayoutMonths
          : getDefaultPayoutMonths(freq)

        if (payoutMonths.includes(calMonth)) {
          bonusIncome += Math.round(bonus / payoutMonths.length)
        }
      }

      timeline.push({ month: ym, baseIncome, bonusIncome, totalIncome: baseIncome + bonusIncome })
    }

    return timeline
  }, [currentIncomes])

  return {
    incomes,
    loading,
    error,
    addIncome,
    updateIncome,
    deleteIncome,
    totalAnnualGross,
    totalMonthlyGross,
    incomeTimeline,
  }
}

function getDefaultPayoutMonths(freq: string): number[] {
  switch (freq) {
    case "monthly": return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    case "quarterly": return [3, 6, 9, 12]
    case "semi-annual": return [6, 12]
    case "annual": return [12]
    default: return [12]
  }
}
