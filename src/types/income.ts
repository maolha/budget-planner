import type { Timestamp } from "firebase/firestore"

export type IncomeType = "salary" | "bonus" | "freelance" | "investment" | "rental" | "other"

export interface IncomeRecord {
  id: string
  memberId: string
  employer: string
  jobTitle?: string
  type: IncomeType
  annualGross: number
  annualNet?: number
  bonus?: number
  startDate: string
  endDate?: string | null
  isProjection: boolean
  scenarioId?: string
  createdAt: Timestamp
}
