export interface NetWorthSnapshot {
  date: string
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  breakdown: {
    liquid: number
    investments: number
    property: number
    pension: number
    crypto: number
    other: number
    mortgages: number
    otherLiabilities: number
  }
}

export interface SavingsFlow {
  month: string
  income: number
  expenses: number
  savings: number
  cumulativeSavings: number
}
