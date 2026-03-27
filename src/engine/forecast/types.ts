import type { LifeEvent } from "@/types"

export interface ForecastMonth {
  date: string // YYYY-MM
  income: number
  expenses: number
  savings: number
  netWorth: number
  events: string[] // labels of events that trigger this month
}

export interface ForecastInput {
  startDate: string // YYYY-MM
  endDate: string   // YYYY-MM
  initialNetWorth: number
  monthlyIncome: number
  monthlyExpenses: number
  lifeEvents: LifeEvent[]
  investmentReturnRate: number // annual, decimal
}

export interface ForecastResult {
  months: ForecastMonth[]
  totalIncome: number
  totalExpenses: number
  finalNetWorth: number
  scenarioName?: string
}
