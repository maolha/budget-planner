import type { ZurichDefaults } from "./types"

/**
 * Zurich cost-of-living reference ranges (monthly, in CHF).
 * Based on typical downtown Zurich household spending.
 *
 * perAdultMultiplier: how much each additional adult adds (1.0 = doubles)
 * perChildMultiplier: how much each child adds (0.3 = 30% of base)
 */
export const ZURICH_CATEGORY_DEFAULTS: ZurichDefaults[] = [
  // Fixed costs
  {
    key: "rent",
    name: "Rent",
    isFixed: true,
    monthlyMin: 2200,
    monthlyMax: 4500,
    perAdultMultiplier: 0.0, // rent is per household
    perChildMultiplier: 0.15, // slightly more space needed
  },
  {
    key: "utilities",
    name: "Utilities",
    isFixed: true,
    monthlyMin: 150,
    monthlyMax: 350,
    perAdultMultiplier: 0.2,
    perChildMultiplier: 0.1,
  },
  {
    key: "health_insurance",
    name: "Health Insurance (KVG+VVG)",
    isFixed: true,
    monthlyMin: 350,
    monthlyMax: 550,
    perAdultMultiplier: 1.0, // per person
    perChildMultiplier: 0.25, // children ~25% of adult premium
  },
  {
    key: "childcare",
    name: "Childcare / Kita",
    isFixed: true,
    monthlyMin: 0,
    monthlyMax: 2600,
    perAdultMultiplier: 0.0,
    perChildMultiplier: 1.0, // per child in Kita
  },
  {
    key: "taxes",
    name: "Taxes",
    isFixed: true,
    monthlyMin: 0,
    monthlyMax: 0, // calculated by tax engine
    perAdultMultiplier: 0.0,
    perChildMultiplier: 0.0,
  },
  {
    key: "pension_3a",
    name: "Pension (3a)",
    isFixed: true,
    monthlyMin: 0,
    monthlyMax: 588, // 7056 / 12
    perAdultMultiplier: 1.0,
    perChildMultiplier: 0.0,
  },

  // Discretionary costs
  {
    key: "groceries",
    name: "Groceries",
    isFixed: false,
    monthlyMin: 400,
    monthlyMax: 1200,
    perAdultMultiplier: 0.7,
    perChildMultiplier: 0.3,
  },
  {
    key: "restaurants",
    name: "Restaurants & Dining",
    isFixed: false,
    monthlyMin: 100,
    monthlyMax: 1500,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.2,
  },
  {
    key: "transport",
    name: "Transport (ZVV / Car)",
    isFixed: false,
    monthlyMin: 80,
    monthlyMax: 600,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.15,
  },
  {
    key: "holidays",
    name: "Holidays & Travel",
    isFixed: false,
    monthlyMin: 0,
    monthlyMax: 2000,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.4,
  },
  {
    key: "clothing",
    name: "Clothing",
    isFixed: false,
    monthlyMin: 50,
    monthlyMax: 600,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.3,
  },
  {
    key: "entertainment",
    name: "Entertainment",
    isFixed: false,
    monthlyMin: 50,
    monthlyMax: 800,
    perAdultMultiplier: 0.7,
    perChildMultiplier: 0.2,
  },
  {
    key: "education",
    name: "Education",
    isFixed: false,
    monthlyMin: 0,
    monthlyMax: 500,
    perAdultMultiplier: 0.5,
    perChildMultiplier: 0.5,
  },
  {
    key: "subscriptions",
    name: "Subscriptions",
    isFixed: false,
    monthlyMin: 30,
    monthlyMax: 300,
    perAdultMultiplier: 0.3,
    perChildMultiplier: 0.1,
  },
  {
    key: "personal_care",
    name: "Personal Care",
    isFixed: false,
    monthlyMin: 30,
    monthlyMax: 300,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.2,
  },
  {
    key: "gifts",
    name: "Gifts",
    isFixed: false,
    monthlyMin: 0,
    monthlyMax: 400,
    perAdultMultiplier: 0.3,
    perChildMultiplier: 0.2,
  },
  {
    key: "savings",
    name: "Savings",
    isFixed: false,
    monthlyMin: 0,
    monthlyMax: 5000,
    perAdultMultiplier: 0.0,
    perChildMultiplier: 0.0,
  },
  {
    key: "other",
    name: "Other",
    isFixed: false,
    monthlyMin: 100,
    monthlyMax: 500,
    perAdultMultiplier: 0.3,
    perChildMultiplier: 0.1,
  },
]

/**
 * Get Zurich-adjusted range for a category based on family size.
 */
export function getAdjustedRange(
  key: string,
  numAdults: number,
  numChildren: number
): { min: number; max: number } {
  const defaults = ZURICH_CATEGORY_DEFAULTS.find((d) => d.key === key)
  if (!defaults) return { min: 0, max: 1000 }

  const adultFactor = 1 + (numAdults - 1) * defaults.perAdultMultiplier
  const childFactor = 1 + numChildren * defaults.perChildMultiplier

  const combinedFactor = Math.max(adultFactor, childFactor)

  return {
    min: Math.round(defaults.monthlyMin * combinedFactor),
    max: Math.round(defaults.monthlyMax * combinedFactor),
  }
}
