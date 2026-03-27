import type { Timestamp } from "firebase/firestore"
import type { RecurrenceRule } from "./common"

export interface ExpenseCategory {
  id: string
  name: string
  icon: string
  color: string
  priority: number // 0-5
  isDefault: boolean
  sortOrder: number
  monthlyBudget?: number
  recommendedBudget?: number
  isFixed: boolean
  scenarioId?: string
}

export interface Expense {
  id: string
  categoryId: string
  amount: number
  date: string
  description?: string
  isRecurring: boolean
  recurrenceRule?: RecurrenceRule
  source: "manual" | "csv_import"
  statementId?: string
  scenarioId?: string
  createdAt: Timestamp
}
