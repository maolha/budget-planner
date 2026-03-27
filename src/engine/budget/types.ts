export interface CategoryBudget {
  categoryKey: string
  categoryName: string
  priority: number
  isFixed: boolean
  recommendedMonthly: number
  zurichMin: number
  zurichMax: number
  weight: number
}

export type ConfidenceLevel = "tight" | "comfortable" | "surplus"

export interface BudgetRecommendation {
  totalMonthlyNet: number
  fixedTotal: number
  discretionaryTotal: number
  savingsTarget: number
  categories: CategoryBudget[]
  confidence: ConfidenceLevel
  savingsRate: number
}

export interface ZurichDefaults {
  key: string
  name: string
  isFixed: boolean
  monthlyMin: number
  monthlyMax: number
  // Scaling factors for family size
  perAdultMultiplier: number
  perChildMultiplier: number
}
