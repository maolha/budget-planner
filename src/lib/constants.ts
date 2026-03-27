export const APP_NAME = "Budget Planner"

export const DEFAULT_CURRENCY = "CHF"
export const DEFAULT_CANTON = "ZH"
export const DEFAULT_MUNICIPALITY = "Zürich"

export type DefaultCategoryKey =
  | "housing"
  | "health_insurance"
  | "childcare"
  | "groceries"
  | "restaurants"
  | "transport"
  | "car"
  | "holidays"
  | "clothing"
  | "leisure"
  | "household"
  | "personal_expenses"
  | "personal_care"
  | "communication"
  | "gifts"
  | "taxes"
  | "pension_3a"
  | "bvg"
  | "investments"
  | "other"

export interface DefaultCategoryDef {
  key: DefaultCategoryKey
  name: string
  icon: string
  color: string
  isFixed: boolean
  sortOrder: number
  typicalMonthly?: number // from Hauser Excel data
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategoryDef[] = [
  { key: "housing", name: "Housing & Energy", icon: "Home", color: "#3b82f6", isFixed: true, sortOrder: 1, typicalMonthly: 2800 },
  { key: "health_insurance", name: "Health Insurance", icon: "HeartPulse", color: "#ef4444", isFixed: true, sortOrder: 2, typicalMonthly: 1500 },
  { key: "childcare", name: "Childcare / Kita", icon: "Baby", color: "#ec4899", isFixed: true, sortOrder: 3, typicalMonthly: 2100 },
  { key: "taxes", name: "Taxes", icon: "Landmark", color: "#475569", isFixed: true, sortOrder: 4 },
  { key: "pension_3a", name: "Pension (3a)", icon: "PiggyBank", color: "#059669", isFixed: true, sortOrder: 5, typicalMonthly: 1176 },
  { key: "bvg", name: "Pension Buy-in (BVG)", icon: "Shield", color: "#0d9488", isFixed: false, sortOrder: 6 },
  { key: "groceries", name: "Groceries & Food", icon: "ShoppingCart", color: "#22c55e", isFixed: false, sortOrder: 7, typicalMonthly: 700 },
  { key: "restaurants", name: "Restaurants & Bars", icon: "UtensilsCrossed", color: "#f97316", isFixed: false, sortOrder: 8, typicalMonthly: 1000 },
  { key: "household", name: "Household", icon: "Sofa", color: "#a78bfa", isFixed: false, sortOrder: 9, typicalMonthly: 1000 },
  { key: "personal_expenses", name: "Personal Expenses", icon: "User", color: "#f472b6", isFixed: false, sortOrder: 10, typicalMonthly: 2000 },
  { key: "holidays", name: "Holidays & Travel", icon: "Plane", color: "#06b6d4", isFixed: false, sortOrder: 11, typicalMonthly: 1500 },
  { key: "transport", name: "Public Transport", icon: "Train", color: "#6366f1", isFixed: false, sortOrder: 12, typicalMonthly: 500 },
  { key: "car", name: "Car", icon: "Car", color: "#64748b", isFixed: false, sortOrder: 13, typicalMonthly: 500 },
  { key: "leisure", name: "Leisure & Sports", icon: "Dumbbell", color: "#d946ef", isFixed: false, sortOrder: 14, typicalMonthly: 800 },
  { key: "personal_care", name: "Personal Care & Wellness", icon: "Sparkles", color: "#fb923c", isFixed: false, sortOrder: 15, typicalMonthly: 330 },
  { key: "communication", name: "Phone, Internet & Media", icon: "Smartphone", color: "#0ea5e9", isFixed: false, sortOrder: 16, typicalMonthly: 260 },
  { key: "clothing", name: "Clothing & Shoes", icon: "Shirt", color: "#8b5cf6", isFixed: false, sortOrder: 17, typicalMonthly: 300 },
  { key: "gifts", name: "Gifts", icon: "Gift", color: "#a855f7", isFixed: false, sortOrder: 18, typicalMonthly: 500 },
  { key: "investments", name: "Investments & Crypto", icon: "TrendingUp", color: "#10b981", isFixed: false, sortOrder: 19 },
  { key: "other", name: "Other", icon: "MoreHorizontal", color: "#94a3b8", isFixed: false, sortOrder: 20 },
]

export const ASSET_TYPES = [
  { value: "bank_account", label: "Bank Account" },
  { value: "savings_account", label: "Savings Account" },
  { value: "investment", label: "Investment Portfolio" },
  { value: "real_estate", label: "Real Estate" },
  { value: "pension_2nd_pillar", label: "Pension (2nd Pillar / BVG)" },
  { value: "pension_3a", label: "Pension (3a)" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "other_liquid", label: "Other (Liquid)" },
  { value: "other_illiquid", label: "Other (Illiquid)" },
] as const

export const LIFE_EVENT_TYPES = [
  { value: "new_child", label: "New Child" },
  { value: "salary_change", label: "Salary Change" },
  { value: "job_change", label: "Job Change" },
  { value: "apartment_change", label: "Apartment Change" },
  { value: "retirement", label: "Retirement" },
  { value: "mortgage_change", label: "Mortgage Change" },
  { value: "large_purchase", label: "Large Purchase" },
  { value: "pension_buyin", label: "BVG Einkauf" },
  { value: "education_start", label: "Education Start" },
  { value: "business_start", label: "Business Start (Betalane)" },
  { value: "custom", label: "Custom Event" },
] as const
