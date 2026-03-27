import type { ZurichDefaults } from "./types"

/**
 * Zurich cost-of-living reference ranges (monthly, in CHF).
 * Calibrated from actual Hauser family data (2018-2025) and Zurich averages.
 *
 * perAdultMultiplier: how much each additional adult adds (1.0 = doubles)
 * perChildMultiplier: how much each child adds (0.3 = 30% of base)
 */
export const ZURICH_CATEGORY_DEFAULTS: ZurichDefaults[] = [
  // Fixed costs
  {
    key: "housing",
    name: "Wohnen & Energie",
    isFixed: true,
    monthlyMin: 2200,
    monthlyMax: 4500,
    perAdultMultiplier: 0.0,
    perChildMultiplier: 0.15,
  },
  {
    key: "health_insurance",
    name: "Gesundheit / Krankenkasse",
    isFixed: true,
    monthlyMin: 1000,
    monthlyMax: 1800,
    perAdultMultiplier: 1.0,
    perChildMultiplier: 0.25,
  },
  {
    key: "childcare",
    name: "Kinderbetreuung / Kita",
    isFixed: true,
    monthlyMin: 0,
    monthlyMax: 5400,
    perAdultMultiplier: 0.0,
    perChildMultiplier: 1.0,
  },
  {
    key: "taxes",
    name: "Steuern",
    isFixed: true,
    monthlyMin: 0,
    monthlyMax: 0,
    perAdultMultiplier: 0.0,
    perChildMultiplier: 0.0,
  },
  {
    key: "pension_3a",
    name: "Säule 3a",
    isFixed: true,
    monthlyMin: 0,
    monthlyMax: 588,
    perAdultMultiplier: 1.0,
    perChildMultiplier: 0.0,
  },
  {
    key: "bvg",
    name: "BVG Einkauf",
    isFixed: false,
    monthlyMin: 0,
    monthlyMax: 3000,
    perAdultMultiplier: 0.0,
    perChildMultiplier: 0.0,
  },

  // Discretionary — calibrated from Hauser actual spending
  {
    key: "groceries",
    name: "Nahrung & Getränke",
    isFixed: false,
    monthlyMin: 400,
    monthlyMax: 1200,
    perAdultMultiplier: 0.7,
    perChildMultiplier: 0.3,
  },
  {
    key: "restaurants",
    name: "Restaurant, Bar & Club",
    isFixed: false,
    monthlyMin: 200,
    monthlyMax: 1500,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.1,
  },
  {
    key: "household",
    name: "Haushalt",
    isFixed: false,
    monthlyMin: 300,
    monthlyMax: 1200,
    perAdultMultiplier: 0.3,
    perChildMultiplier: 0.2,
  },
  {
    key: "personal_expenses",
    name: "Persönliche Auslagen",
    isFixed: false,
    monthlyMin: 500,
    monthlyMax: 2500,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.2,
  },
  {
    key: "holidays",
    name: "Ferien & Reisen",
    isFixed: false,
    monthlyMin: 0,
    monthlyMax: 3000,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.4,
  },
  {
    key: "transport",
    name: "Verkehr / ÖV",
    isFixed: false,
    monthlyMin: 100,
    monthlyMax: 600,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.1,
  },
  {
    key: "car",
    name: "Auto",
    isFixed: false,
    monthlyMin: 0,
    monthlyMax: 800,
    perAdultMultiplier: 0.0,
    perChildMultiplier: 0.0,
  },
  {
    key: "leisure",
    name: "Freizeit, Sport & Hobby",
    isFixed: false,
    monthlyMin: 100,
    monthlyMax: 1200,
    perAdultMultiplier: 0.7,
    perChildMultiplier: 0.2,
  },
  {
    key: "personal_care",
    name: "Körperpflege & Wellness",
    isFixed: false,
    monthlyMin: 50,
    monthlyMax: 500,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.1,
  },
  {
    key: "communication",
    name: "Kommunikation & Medien",
    isFixed: false,
    monthlyMin: 100,
    monthlyMax: 400,
    perAdultMultiplier: 0.5,
    perChildMultiplier: 0.1,
  },
  {
    key: "clothing",
    name: "Kleider & Schuhe",
    isFixed: false,
    monthlyMin: 50,
    monthlyMax: 600,
    perAdultMultiplier: 0.8,
    perChildMultiplier: 0.3,
  },
  {
    key: "gifts",
    name: "Geschenke",
    isFixed: false,
    monthlyMin: 0,
    monthlyMax: 800,
    perAdultMultiplier: 0.3,
    perChildMultiplier: 0.2,
  },
  {
    key: "investments",
    name: "Investments / Crypto",
    isFixed: false,
    monthlyMin: 0,
    monthlyMax: 5000,
    perAdultMultiplier: 0.0,
    perChildMultiplier: 0.0,
  },
  {
    key: "other",
    name: "Sonstiges",
    isFixed: false,
    monthlyMin: 0,
    monthlyMax: 1000,
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
