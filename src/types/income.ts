import type { Timestamp } from "firebase/firestore"

export type IncomeType = "salary" | "bonus" | "freelance" | "investment" | "rental" | "other"

export type BonusFrequency = "annual" | "semi-annual" | "quarterly" | "monthly" | "none"

export interface IncomeRecord {
  id: string
  memberId: string
  employer: string
  jobTitle?: string
  type: IncomeType
  annualGross: number
  annualNet?: number
  bonus?: number
  bonusFrequency?: BonusFrequency
  bonusPayoutMonths?: number[] // 1-12 (Jan=1, Dec=12)
  bvgEmployeeSplit?: number | null // employee share of BVG as % (0-100), default 50
  bvgMonthly?: number | null // custom BVG employee contribution per month (overrides default calc)
  startDate: string
  endDate?: string | null
  isProjection: boolean
  scenarioId?: string
  createdAt: Timestamp
}
