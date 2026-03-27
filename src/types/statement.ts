import type { Timestamp } from "firebase/firestore"

export interface ColumnMapping {
  date: string
  amount: string
  description: string
  balance?: string
  category?: string
}

export type DuplicateResolution = "keep_bank" | "keep_cc" | "keep_both" | "pending"

export interface FlaggedDuplicate {
  bankTransactionDate: string
  bankAmount: number
  bankDescription: string
  possibleCcTotal: number
  ccStatementId?: string
  userResolution: DuplicateResolution
}

export type StatementStatus = "pending" | "mapped" | "reviewed" | "imported"

export interface UploadedStatement {
  id: string
  fileName: string
  fileUrl: string
  uploadedAt: Timestamp
  accountType: "bank" | "credit_card"
  accountName?: string
  periodStart: string
  periodEnd: string
  totalTransactions: number
  importedTransactions: number
  status: StatementStatus
  columnMapping: ColumnMapping
  flaggedDuplicates: FlaggedDuplicate[]
}
