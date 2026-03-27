export interface TaxBracket {
  from: number
  to: number | null
  baseTax: number
  rate: number // decimal, e.g. 0.0077 = 0.77%
}

export interface TaxInput {
  grossIncome: number
  filingStatus: "single" | "married"
  numberOfChildren: number
  churchTax: boolean
  churchTaxRate: number // decimal
  municipalMultiplier: number
  cantonalSteuerfuss: number // decimal
  deductions: TaxDeductions
}

export interface TaxDeductions {
  pension3a: number
  professionalExpenses: number
  insurancePremiums: number
  childDeductionPerChild: number
  dualIncomeDeduction: number
  otherDeductions: number
}

export interface TaxBreakdown {
  grossIncome: number
  totalDeductions: number
  taxableIncome: number
  federal: number
  cantonal: number
  municipal: number
  church: number
  total: number
  effectiveRate: number
  monthlyTax: number
}
