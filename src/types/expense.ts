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
  group?: string // "Fixed Costs" | "Daily Living" | "Lifestyle" | "Savings & Investments"
  scenarioId?: string
}

export interface CategoryRule {
  id: string
  pattern: string // normalized description (lowercased, trimmed)
  categoryId: string
  categoryKey: string // e.g. "groceries", "restaurants"
  exampleDescription: string // original description for display
  createdAt: Timestamp
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
