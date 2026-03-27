import type { TaxDeductions } from "./types"

// Swiss standard deduction amounts for Zurich (2025/2026)

// Pillar 3a maximum contribution
export const MAX_3A_EMPLOYED = 7056
export const MAX_3A_SELF_EMPLOYED = 35280

// Professional expense deduction (flat rate if no receipts)
export const PROFESSIONAL_EXPENSE_FLAT_FEDERAL = 2000
export const PROFESSIONAL_EXPENSE_FLAT_CANTONAL = 2000

// Insurance premium deductions (federal)
export const INSURANCE_DEDUCTION_SINGLE = 1800
export const INSURANCE_DEDUCTION_MARRIED = 3600
export const INSURANCE_DEDUCTION_PER_CHILD = 700

// Child deduction (federal, per child)
export const CHILD_DEDUCTION_FEDERAL = 6700

// Child deduction (Zurich cantonal, per child)
export const CHILD_DEDUCTION_CANTONAL = 9000

// Dual-income deduction (married couples, both working)
// Federal: lesser of 50% of lower income or CHF 13,900
export const DUAL_INCOME_MAX_FEDERAL = 13900
export const DUAL_INCOME_RATE = 0.5

/**
 * Calculate standard deductions based on family situation.
 */
export function calculateStandardDeductions(
  filingStatus: "single" | "married",
  numberOfChildren: number,
  pension3aContribution: number,
  isDualIncome: boolean,
  lowerIncome?: number,
  otherDeductionsAmount?: number
): TaxDeductions {
  const pension3a = Math.min(pension3aContribution, MAX_3A_EMPLOYED)
  const professionalExpenses = PROFESSIONAL_EXPENSE_FLAT_FEDERAL

  let insurancePremiums: number
  if (filingStatus === "married") {
    insurancePremiums =
      INSURANCE_DEDUCTION_MARRIED + numberOfChildren * INSURANCE_DEDUCTION_PER_CHILD
  } else {
    insurancePremiums =
      INSURANCE_DEDUCTION_SINGLE + numberOfChildren * INSURANCE_DEDUCTION_PER_CHILD
  }

  const childDeductionPerChild = CHILD_DEDUCTION_FEDERAL

  let dualIncomeDeduction = 0
  if (filingStatus === "married" && isDualIncome && lowerIncome) {
    dualIncomeDeduction = Math.min(lowerIncome * DUAL_INCOME_RATE, DUAL_INCOME_MAX_FEDERAL)
  }

  return {
    pension3a,
    professionalExpenses,
    insurancePremiums,
    childDeductionPerChild,
    dualIncomeDeduction,
    otherDeductions: otherDeductionsAmount ?? 0,
  }
}

/**
 * Sum all deductions into a total.
 */
export function totalDeductions(
  deductions: TaxDeductions,
  numberOfChildren: number
): number {
  return (
    deductions.pension3a +
    deductions.professionalExpenses +
    deductions.insurancePremiums +
    deductions.childDeductionPerChild * numberOfChildren +
    deductions.dualIncomeDeduction +
    deductions.otherDeductions
  )
}
