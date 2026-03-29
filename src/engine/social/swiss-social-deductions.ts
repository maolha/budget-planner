/**
 * Swiss employee-side social security deductions (2025/2026 rates).
 *
 * These are mandatory payroll deductions withheld by the employer
 * before the employee receives their net salary. They also reduce
 * taxable income for income-tax purposes.
 *
 * Rates are the EMPLOYEE share only.
 */

// AHV / IV / EO — Old-age, disability & loss-of-earnings insurance
// Total rate 10.6%, split 50/50 → employee 5.3%
export const AHV_IV_EO_RATE = 0.053

// ALV — Unemployment insurance
// 2.2% total (1.1% employee) on salary up to CHF 148,200
// Above that: 1% "solidarity" contribution (0.5% employee) — no cap
export const ALV_RATE = 0.011
export const ALV_CEILING = 148200
export const ALV_SOLIDARITY_RATE = 0.005

// BVG — Occupational pension (2nd pillar)
// TOTAL contribution rates (employer + employee combined) by age bracket.
// Legal minimum (LPP):  25-34: 7%   35-44: 10%   45-54: 15%   55-65: 18%
// Most employers offer above-minimum plans with higher rates and salary caps.
// We use slightly above-minimum defaults that better reflect typical plans.
// Default split is 50/50, but employer can pay more.
//
// Coordinated salary = gross − coordination deduction (CHF 25,725 for 2025)
// Legal minimum cap is CHF 88,200 but most plans insure up to full salary.
export const BVG_COORDINATION_DEDUCTION = 25725
export const BVG_ENTRY_THRESHOLD = 22050
export const BVG_MAX_INSURED_SALARY = 860000 // effectively uncapped — most plans cover full salary
export const BVG_DEFAULT_EMPLOYEE_SPLIT = 50 // percent

// Typical total rates (above legal minimum, reflecting common employer plans)
export function bvgTotalRate(age: number): number {
  if (age < 25) return 0
  if (age <= 34) return 0.09
  if (age <= 44) return 0.13
  if (age <= 54) return 0.18
  return 0.22
}

// NBU — Non-occupational accident insurance (Nichtberufsunfall)
// Fully paid by employee. Rate varies by industry/insurer; ~1.2-1.6% is typical.
export const NBU_RATE = 0.014

export interface SocialDeductionsInput {
  annualGross: number
  age: number // current age of the employee
  bvgEmployeeSplit?: number // employee share as percentage (0-100), default 50
  bvgMonthlyOverride?: number | null // if set, use this instead of default BVG calc
}

export interface SocialDeductionsBreakdown {
  ahvIvEo: number
  alv: number
  alvSolidarity: number
  bvg: number
  nbu: number
  total: number
  rates: {
    ahvIvEo: number
    alv: number
    alvSolidarity: number
    bvg: number
    nbu: number
    effective: number
  }
}

/**
 * Calculate annual employee-side social deductions from gross salary.
 */
export function calculateSocialDeductions(
  input: SocialDeductionsInput
): SocialDeductionsBreakdown {
  const { annualGross, age, bvgEmployeeSplit, bvgMonthlyOverride } = input
  const employeeSplitPct = (bvgEmployeeSplit ?? BVG_DEFAULT_EMPLOYEE_SPLIT) / 100

  // AHV/IV/EO — flat rate on full gross
  const ahvIvEo = Math.round(annualGross * AHV_IV_EO_RATE)

  // ALV — 1.1% up to ceiling
  const alvBase = Math.min(annualGross, ALV_CEILING)
  const alv = Math.round(alvBase * ALV_RATE)

  // ALV solidarity — 0.5% on income above ceiling
  const alvSolidarity =
    annualGross > ALV_CEILING
      ? Math.round((annualGross - ALV_CEILING) * ALV_SOLIDARITY_RATE)
      : 0

  // BVG — use override if provided, otherwise calculate total rate × employee split
  let bvg = 0
  if (bvgMonthlyOverride != null && bvgMonthlyOverride > 0) {
    bvg = Math.round(bvgMonthlyOverride * 12)
  } else {
    const totalRate = bvgTotalRate(age)
    if (annualGross >= BVG_ENTRY_THRESHOLD && totalRate > 0) {
      const coordinatedSalary = Math.min(
        Math.max(annualGross - BVG_COORDINATION_DEDUCTION, 0),
        BVG_MAX_INSURED_SALARY - BVG_COORDINATION_DEDUCTION
      )
      bvg = Math.round(coordinatedSalary * totalRate * employeeSplitPct)
    }
  }

  // NBU — flat rate on full gross
  const nbu = Math.round(annualGross * NBU_RATE)

  const total = ahvIvEo + alv + alvSolidarity + bvg + nbu

  return {
    ahvIvEo,
    alv,
    alvSolidarity,
    bvg,
    nbu,
    total,
    rates: {
      ahvIvEo: AHV_IV_EO_RATE,
      alv: ALV_RATE,
      alvSolidarity: annualGross > ALV_CEILING ? ALV_SOLIDARITY_RATE : 0,
      bvg: annualGross > 0 ? bvg / annualGross : 0,
      nbu: NBU_RATE,
      effective: annualGross > 0 ? total / annualGross : 0,
    },
  }
}

/**
 * Calculate combined social deductions for multiple income records.
 */
export function calculateTotalSocialDeductions(
  records: Array<{ annualGross: number; age: number; bvgEmployeeSplit?: number; bvgMonthlyOverride?: number | null }>
): SocialDeductionsBreakdown {
  const results = records.map((r) => calculateSocialDeductions(r))

  const combined: SocialDeductionsBreakdown = {
    ahvIvEo: 0,
    alv: 0,
    alvSolidarity: 0,
    bvg: 0,
    nbu: 0,
    total: 0,
    rates: { ahvIvEo: AHV_IV_EO_RATE, alv: ALV_RATE, alvSolidarity: 0, bvg: 0, nbu: NBU_RATE, effective: 0 },
  }

  const totalGross = records.reduce((s, r) => s + r.annualGross, 0)

  for (const r of results) {
    combined.ahvIvEo += r.ahvIvEo
    combined.alv += r.alv
    combined.alvSolidarity += r.alvSolidarity
    combined.bvg += r.bvg
    combined.nbu += r.nbu
    combined.total += r.total
  }

  combined.rates.effective = totalGross > 0 ? combined.total / totalGross : 0

  return combined
}
