import type { TaxBracket } from "./types"

// Swiss Federal Income Tax Brackets 2025/2026
// Source: Swiss Federal Tax Administration (ESTV)

export const FEDERAL_BRACKETS_SINGLE: TaxBracket[] = [
  { from: 0, to: 18500, baseTax: 0, rate: 0 },
  { from: 18500, to: 33200, baseTax: 0, rate: 0.0077 },
  { from: 33200, to: 43500, baseTax: 113.19, rate: 0.0088 },
  { from: 43500, to: 58000, baseTax: 203.83, rate: 0.0264 },
  { from: 58000, to: 76100, baseTax: 586.63, rate: 0.0297 },
  { from: 76100, to: 82000, baseTax: 1124.40, rate: 0.0594 },
  { from: 82000, to: 108800, baseTax: 1474.74, rate: 0.066 },
  { from: 108800, to: 141500, baseTax: 3243.54, rate: 0.088 },
  { from: 141500, to: 184900, baseTax: 6121.34, rate: 0.11 },
  { from: 184900, to: 793400, baseTax: 10895.34, rate: 0.132 },
  { from: 793400, to: null, baseTax: 91317.34, rate: 0.115 },
]

export const FEDERAL_BRACKETS_MARRIED: TaxBracket[] = [
  { from: 0, to: 32000, baseTax: 0, rate: 0 },
  { from: 32000, to: 53400, baseTax: 0, rate: 0.01 },
  { from: 53400, to: 61300, baseTax: 214.00, rate: 0.02 },
  { from: 61300, to: 79100, baseTax: 372.00, rate: 0.03 },
  { from: 79100, to: 94900, baseTax: 906.00, rate: 0.04 },
  { from: 94900, to: 108600, baseTax: 1538.00, rate: 0.05 },
  { from: 108600, to: 120500, baseTax: 2223.00, rate: 0.06 },
  { from: 120500, to: 130500, baseTax: 2937.00, rate: 0.07 },
  { from: 130500, to: 138300, baseTax: 3637.00, rate: 0.08 },
  { from: 138300, to: 144200, baseTax: 4261.00, rate: 0.09 },
  { from: 144200, to: 148200, baseTax: 4792.00, rate: 0.10 },
  { from: 148200, to: 150300, baseTax: 5192.00, rate: 0.11 },
  { from: 150300, to: 152300, baseTax: 5423.00, rate: 0.12 },
  { from: 152300, to: 940800, baseTax: 5663.00, rate: 0.13 },
  { from: 940800, to: null, baseTax: 108168.00, rate: 0.115 },
]

/**
 * Calculate federal tax from bracket tables.
 * Uses the progressive bracket method: baseTax + (income - bracketFrom) * rate
 */
export function calculateFederalTax(
  taxableIncome: number,
  filingStatus: "single" | "married"
): number {
  const brackets =
    filingStatus === "married" ? FEDERAL_BRACKETS_MARRIED : FEDERAL_BRACKETS_SINGLE

  if (taxableIncome <= 0) return 0

  for (let i = brackets.length - 1; i >= 0; i--) {
    const bracket = brackets[i]
    if (taxableIncome > bracket.from) {
      const taxableInBracket = bracket.to
        ? Math.min(taxableIncome, bracket.to) - bracket.from
        : taxableIncome - bracket.from
      return Math.round((bracket.baseTax + taxableInBracket * bracket.rate) * 100) / 100
    }
  }

  return 0
}
