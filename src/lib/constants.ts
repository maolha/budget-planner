export const APP_NAME = "Budget Planner"

export const DEFAULT_CURRENCY = "CHF"
export const DEFAULT_CANTON = "ZH"
export const DEFAULT_MUNICIPALITY = "Zürich"

export type DefaultCategoryKey =
  | "rent"
  | "utilities"
  | "health_insurance"
  | "childcare"
  | "groceries"
  | "restaurants"
  | "transport"
  | "holidays"
  | "clothing"
  | "entertainment"
  | "education"
  | "subscriptions"
  | "personal_care"
  | "gifts"
  | "taxes"
  | "pension_3a"
  | "savings"
  | "other"

export interface DefaultCategoryDef {
  key: DefaultCategoryKey
  name: string
  icon: string
  color: string
  isFixed: boolean
  sortOrder: number
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategoryDef[] = [
  { key: "rent", name: "Rent", icon: "Home", color: "#3b82f6", isFixed: true, sortOrder: 1 },
  { key: "utilities", name: "Utilities", icon: "Zap", color: "#f59e0b", isFixed: true, sortOrder: 2 },
  { key: "health_insurance", name: "Health Insurance (KVG+VVG)", icon: "HeartPulse", color: "#ef4444", isFixed: true, sortOrder: 3 },
  { key: "childcare", name: "Childcare / Kita", icon: "Baby", color: "#ec4899", isFixed: true, sortOrder: 4 },
  { key: "groceries", name: "Groceries", icon: "ShoppingCart", color: "#22c55e", isFixed: false, sortOrder: 5 },
  { key: "restaurants", name: "Restaurants & Dining", icon: "UtensilsCrossed", color: "#f97316", isFixed: false, sortOrder: 6 },
  { key: "transport", name: "Transport (ZVV / Car)", icon: "Train", color: "#6366f1", isFixed: false, sortOrder: 7 },
  { key: "holidays", name: "Holidays & Travel", icon: "Plane", color: "#06b6d4", isFixed: false, sortOrder: 8 },
  { key: "clothing", name: "Clothing", icon: "Shirt", color: "#8b5cf6", isFixed: false, sortOrder: 9 },
  { key: "entertainment", name: "Entertainment", icon: "Clapperboard", color: "#d946ef", isFixed: false, sortOrder: 10 },
  { key: "education", name: "Education", icon: "GraduationCap", color: "#0ea5e9", isFixed: false, sortOrder: 11 },
  { key: "subscriptions", name: "Subscriptions", icon: "CreditCard", color: "#64748b", isFixed: false, sortOrder: 12 },
  { key: "personal_care", name: "Personal Care", icon: "Sparkles", color: "#f472b6", isFixed: false, sortOrder: 13 },
  { key: "gifts", name: "Gifts", icon: "Gift", color: "#a855f7", isFixed: false, sortOrder: 14 },
  { key: "taxes", name: "Taxes", icon: "Landmark", color: "#475569", isFixed: true, sortOrder: 15 },
  { key: "pension_3a", name: "Pension (3a)", icon: "PiggyBank", color: "#059669", isFixed: true, sortOrder: 16 },
  { key: "savings", name: "Savings", icon: "Wallet", color: "#10b981", isFixed: false, sortOrder: 17 },
  { key: "other", name: "Other", icon: "MoreHorizontal", color: "#94a3b8", isFixed: false, sortOrder: 18 },
]

export const ASSET_TYPES = [
  { value: "bank_account", label: "Bank Account" },
  { value: "savings_account", label: "Savings Account" },
  { value: "investment", label: "Investment Portfolio" },
  { value: "real_estate", label: "Real Estate" },
  { value: "pension_2nd_pillar", label: "Pension (2nd Pillar)" },
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
  { value: "education_start", label: "Education Start" },
  { value: "custom", label: "Custom Event" },
] as const
