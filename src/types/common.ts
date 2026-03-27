import type { Timestamp } from "firebase/firestore"

export interface DateRange {
  start: string // ISO date
  end?: string  // ISO date, null = ongoing
}

export interface TimestampedDoc {
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type Currency = "CHF" | "EUR" | "USD"

export type RecurrenceFrequency = "monthly" | "quarterly" | "semi-annual" | "annual"

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  amount: number
  startDate: string
  endDate?: string
}
