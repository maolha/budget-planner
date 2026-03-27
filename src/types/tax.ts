export interface TaxBracket {
  from: number
  to: number | null // null = unlimited
  baseTax: number
  rate: number // as decimal, e.g. 0.0077 for 0.77%
}

export interface TaxDeductions {
  pension3a: number
  professionalExpenses: number
  insurancePremiums: number
  childDeductions: number
  otherDeductions: number
}

export interface TaxBreakdown {
  taxableIncome: number
  federal: number
  cantonal: number
  municipal: number
  church: number
  total: number
  effectiveRate: number
}

export interface TaxConfig {
  canton: string
  municipality: string
  churchTax: boolean
  churchTaxRate: number
  municipalMultiplier: number
  cantonalSteuerfuss: number
  filingStatus: "single" | "married"
  numberOfChildren: number
}
