import { calculateFederalTax } from "./federal-rates"
import { ZURICH_CANTONAL_STEUERFUSS, getMunicipalMultiplier } from "./zurich-cantonal"
import { totalDeductions, calculateStandardDeductions } from "./deductions"
import type { TaxInput, TaxBreakdown } from "./types"

/**
 * Main Zurich tax calculation engine.
 *
 * Flow:
 * 1. Gross income → apply deductions → taxable income
 * 2. Federal tax from bracket tables
 * 3. Cantonal "simple state tax" (same brackets, different rate applied via Steuerfuss)
 * 4. Municipal tax = cantonal base × municipal multiplier
 * 5. Church tax = cantonal base × church rate (optional)
 * 6. Total = federal + cantonal + municipal + church
 */
export function calculateZurichTax(input: TaxInput): TaxBreakdown {
  const { grossIncome, filingStatus, numberOfChildren, deductions } = input

  // Calculate total deductions
  const totalDed = totalDeductions(deductions, numberOfChildren)
  const taxableIncome = Math.max(0, grossIncome - totalDed)

  // Federal tax
  const federal = calculateFederalTax(taxableIncome, filingStatus)

  // Cantonal tax: Use the federal "simple tax" as base, multiplied by cantonal Steuerfuss
  // In Zurich, the cantonal tax uses its own bracket system, but for simplification
  // we use the federal base multiplied by the Steuerfuss
  const cantonalBase = federal * input.cantonalSteuerfuss
  const cantonal = Math.round(cantonalBase * 100) / 100

  // Municipal tax
  const municipalMultiplier = input.municipalMultiplier
  const municipal = Math.round(cantonalBase * municipalMultiplier * 100) / 100

  // Church tax
  let church = 0
  if (input.churchTax) {
    church = Math.round(cantonalBase * input.churchTaxRate * 100) / 100
  }

  const total = Math.round((federal + cantonal + municipal + church) * 100) / 100
  const effectiveRate = grossIncome > 0 ? total / grossIncome : 0
  const monthlyTax = Math.round((total / 12) * 100) / 100

  return {
    grossIncome,
    totalDeductions: totalDed,
    taxableIncome,
    federal,
    cantonal,
    municipal,
    church,
    total,
    effectiveRate,
    monthlyTax,
  }
}

/**
 * Convenience function with sensible Zurich defaults.
 */
export function calculateTaxSimple(
  grossIncome: number,
  filingStatus: "single" | "married",
  numberOfChildren: number,
  options?: {
    municipality?: string
    churchTax?: boolean
    pension3a?: number
    isDualIncome?: boolean
    lowerIncome?: number
    otherDeductions?: number
  }
): TaxBreakdown {
  const { municipality, churchTax, pension3a, isDualIncome, lowerIncome, otherDeductions } = options ?? {}

  const deductions = calculateStandardDeductions(
    filingStatus,
    numberOfChildren,
    pension3a ?? 0,
    isDualIncome ?? false,
    lowerIncome,
    otherDeductions ?? 0
  )

  return calculateZurichTax({
    grossIncome,
    filingStatus,
    numberOfChildren,
    churchTax: churchTax ?? false,
    churchTaxRate: 0.10,
    municipalMultiplier: getMunicipalMultiplier(municipality ?? "Zürich"),
    cantonalSteuerfuss: ZURICH_CANTONAL_STEUERFUSS,
    deductions,
  })
}
