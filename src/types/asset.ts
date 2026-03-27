import type { Timestamp } from "firebase/firestore"
import type { Currency } from "./common"

export type AssetType =
  | "bank_account"
  | "savings_account"
  | "investment"
  | "real_estate"
  | "pension_2nd_pillar"
  | "pension_3a"
  | "crypto"
  | "other_liquid"
  | "other_illiquid"
  // Liability types
  | "personal_loan"
  | "auto_loan"
  | "student_loan"
  | "credit_card"
  | "other_liability"

export const LIABILITY_TYPES: AssetType[] = [
  "personal_loan",
  "auto_loan",
  "student_loan",
  "credit_card",
  "other_liability",
]

export interface Asset {
  id: string
  name: string
  type: AssetType
  subtype?: string
  currentValue: number
  currency: Currency
  institution?: string

  // Property-specific
  purchasePrice?: number
  mortgageBalance?: number
  mortgageRate?: number
  mortgageEndDate?: string

  // Investment-specific
  annualReturnRate?: number

  // Liability-specific
  interestRate?: number
  monthlyPayment?: number

  // History
  valueHistory: AssetSnapshot[]

  scenarioId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface AssetSnapshot {
  date: string
  value: number
}
