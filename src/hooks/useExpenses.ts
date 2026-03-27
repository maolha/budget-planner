import { useEffect, useState, useCallback } from "react"
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store"
import type { Expense, ExpenseCategory } from "@/types"

export function useExpenses() {
  const { familyId } = useAuthStore()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listen to expense categories
  useEffect(() => {
    if (!familyId) {
      setCategories([])
      setCategoriesLoading(false)
      return
    }
    setCategoriesLoading(true)
    const q = query(
      collection(db, "families", familyId, "expenseCategories")
    )
    return onSnapshot(
      q,
      (snap) => {
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExpenseCategory))
        setCategoriesLoading(false)
      },
      (err) => {
        console.error("[useExpenses] Categories listener error:", err)
        setError(err.message)
        setCategoriesLoading(false)
      }
    )
  }, [familyId])

  // Listen to expenses
  useEffect(() => {
    if (!familyId) {
      setExpenses([])
      setExpensesLoading(false)
      return
    }
    setExpensesLoading(true)
    setError(null)
    const q = query(
      collection(db, "families", familyId, "expenses")
    )
    return onSnapshot(
      q,
      (snap) => {
        setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense))
        setExpensesLoading(false)
      },
      (err) => {
        console.error("[useExpenses] Expenses listener error:", err)
        setError(err.message)
        setExpensesLoading(false)
      }
    )
  }, [familyId])

  const loading = categoriesLoading || expensesLoading

  const addExpense = useCallback(
    async (data: Omit<Expense, "id" | "createdAt">) => {
      if (!familyId) throw new Error("No family")
      const ref = doc(collection(db, "families", familyId, "expenses"))
      await setDoc(ref, { ...data, createdAt: serverTimestamp() })
      return ref.id
    },
    [familyId]
  )

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!familyId) throw new Error("No family")
      await deleteDoc(doc(db, "families", familyId, "expenses", id))
    },
    [familyId]
  )

  const updateCategoryPriority = useCallback(
    async (categoryId: string, priority: number) => {
      if (!familyId) throw new Error("No family")
      await updateDoc(doc(db, "families", familyId, "expenseCategories", categoryId), {
        priority,
      })
    },
    [familyId]
  )

  const updateCategoryBudget = useCallback(
    async (categoryId: string, monthlyBudget: number) => {
      if (!familyId) throw new Error("No family")
      await updateDoc(doc(db, "families", familyId, "expenseCategories", categoryId), {
        monthlyBudget,
      })
    },
    [familyId]
  )

  // Aggregate: monthly total per category for a given month
  const getMonthlyTotals = useCallback(
    (yearMonth: string) => {
      const totals: Record<string, number> = {}
      for (const exp of expenses) {
        if (exp.date.substring(0, 7) === yearMonth) {
          totals[exp.categoryId] = (totals[exp.categoryId] ?? 0) + exp.amount
        }
      }
      return totals
    },
    [expenses]
  )

  const totalMonthlyExpenses = (() => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const totals = getMonthlyTotals(ym)
    return Object.values(totals).reduce((s, v) => s + v, 0)
  })()

  const totalMonthlyBudget = categories.reduce((s, c) => s + Number(c.monthlyBudget ?? 0), 0)

  return {
    expenses,
    categories,
    loading,
    error,
    addExpense,
    deleteExpense,
    updateCategoryPriority,
    updateCategoryBudget,
    getMonthlyTotals,
    totalMonthlyExpenses,
    totalMonthlyBudget,
  }
}
