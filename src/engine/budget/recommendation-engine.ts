import type { BudgetRecommendation, CategoryBudget, ConfidenceLevel } from "./types"
import { ZURICH_CATEGORY_DEFAULTS, getAdjustedRange } from "./zurich-defaults"

interface RecommendationInput {
  monthlyNetIncome: number
  numAdults: number
  numChildren: number
  priorities: Record<string, number> // categoryKey → 0-5
  fixedOverrides?: Record<string, number> // manual overrides for fixed costs
  monthlyTax?: number // from tax engine
}

/**
 * Priority-based budget recommendation engine.
 *
 * Algorithm:
 * 1. Allocate fixed expenses first (rent, insurance, childcare, taxes, pension)
 * 2. Weight remaining discretionary budget by priority using p^1.5 scaling
 * 3. Clamp allocations to Zurich-reasonable bounds
 * 4. Redistribute excess from clamped categories
 * 5. Return recommendations with confidence indicator
 */
export function calculateBudgetRecommendation(
  input: RecommendationInput
): BudgetRecommendation {
  const { monthlyNetIncome, numAdults, numChildren, priorities, fixedOverrides, monthlyTax } = input

  const categories: CategoryBudget[] = []

  // Step 1: Allocate fixed expenses
  let fixedTotal = 0
  const fixedCategories = ZURICH_CATEGORY_DEFAULTS.filter((d) => d.isFixed)

  for (const cat of fixedCategories) {
    const range = getAdjustedRange(cat.key, numAdults, numChildren)
    let amount: number

    if (fixedOverrides?.[cat.key] !== undefined) {
      amount = fixedOverrides[cat.key]
    } else if (cat.key === "taxes" && monthlyTax !== undefined) {
      amount = monthlyTax
    } else if (cat.key === "childcare" && numChildren === 0) {
      amount = 0
    } else {
      // Use midpoint of Zurich range as default
      amount = Math.round((range.min + range.max) / 2)
    }

    fixedTotal += amount
    categories.push({
      categoryKey: cat.key,
      categoryName: cat.name,
      priority: 5, // Fixed costs are always max priority
      isFixed: true,
      recommendedMonthly: amount,
      zurichMin: range.min,
      zurichMax: range.max,
      weight: 0,
    })
  }

  // Step 2: Calculate remaining budget for discretionary spending
  const remainingBudget = Math.max(0, monthlyNetIncome - fixedTotal)

  // Step 3: Weight discretionary categories by priority
  const discretionaryCategories = ZURICH_CATEGORY_DEFAULTS.filter((d) => !d.isFixed)
  let totalWeight = 0
  const weightedCats: Array<{
    cat: (typeof discretionaryCategories)[0]
    priority: number
    weight: number
    range: { min: number; max: number }
  }> = []

  for (const cat of discretionaryCategories) {
    const priority = priorities[cat.key] ?? 3
    // Priority 0 = skip entirely, 1-5 uses p^1.5 for exponential scaling
    const weight = priority === 0 ? 0 : Math.pow(priority, 1.5)
    totalWeight += weight
    const range = getAdjustedRange(cat.key, numAdults, numChildren)
    weightedCats.push({ cat, priority, weight, range })
  }

  // Step 4: Allocate proportionally, then clamp to bounds
  let discretionaryTotal = 0
  let excess = 0

  const discretionaryAllocations = weightedCats.map(({ cat, priority, weight, range }) => {
    let rawAllocation = totalWeight > 0 ? (weight / totalWeight) * remainingBudget : 0

    // Clamp to Zurich-reasonable bounds
    if (rawAllocation < range.min && priority > 0) {
      excess -= range.min - rawAllocation
      rawAllocation = range.min
    } else if (rawAllocation > range.max) {
      excess += rawAllocation - range.max
      rawAllocation = range.max
    }

    const recommended = Math.round(rawAllocation)
    discretionaryTotal += recommended

    return {
      categoryKey: cat.key,
      categoryName: cat.name,
      priority,
      isFixed: false,
      recommendedMonthly: recommended,
      zurichMin: range.min,
      zurichMax: range.max,
      weight,
    } satisfies CategoryBudget
  })

  // Step 5: Redistribute excess proportionally to unclamped categories
  if (excess > 0) {
    const redistributable = discretionaryAllocations.filter(
      (a) => a.priority > 0 && a.recommendedMonthly < a.zurichMax
    )
    const redistWeight = redistributable.reduce((sum, a) => sum + a.weight, 0)

    if (redistWeight > 0) {
      for (const alloc of redistributable) {
        const share = (alloc.weight / redistWeight) * excess
        const newAmount = Math.min(alloc.recommendedMonthly + share, alloc.zurichMax)
        const delta = Math.round(newAmount) - alloc.recommendedMonthly
        alloc.recommendedMonthly += delta
        discretionaryTotal += delta
      }
    }
  }

  categories.push(...discretionaryAllocations)

  // Calculate savings and confidence
  const totalExpenses = fixedTotal + discretionaryTotal
  const savingsTarget = monthlyNetIncome - totalExpenses
  const savingsRate = monthlyNetIncome > 0 ? savingsTarget / monthlyNetIncome : 0

  let confidence: ConfidenceLevel
  if (totalExpenses > monthlyNetIncome * 0.95) {
    confidence = "tight"
  } else if (totalExpenses > monthlyNetIncome * 0.75) {
    confidence = "comfortable"
  } else {
    confidence = "surplus"
  }

  return {
    totalMonthlyNet: monthlyNetIncome,
    fixedTotal,
    discretionaryTotal,
    savingsTarget: Math.round(savingsTarget),
    categories,
    confidence,
    savingsRate: Math.round(savingsRate * 1000) / 1000,
  }
}
