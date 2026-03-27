// Zurich Cantonal Tax Configuration
// The cantonal tax is calculated as a percentage of the "Einfache Staatssteuer" (simple state tax)
// which is then multiplied by the Steuerfuss (tax multiplier) of the canton and municipality.

// Zurich Canton Steuerfuss 2025/2026: 99% (0.99)
export const ZURICH_CANTONAL_STEUERFUSS = 0.99

// City of Zurich Municipal Steuerfuss 2025/2026: 119% (1.19)
export const ZURICH_CITY_MUNICIPAL_MULTIPLIER = 1.19

// Church tax rates in Zurich (as % of simple state tax)
export const CHURCH_TAX_RATES = {
  reformiert: 0.10,
  roemisch_katholisch: 0.10,
  christkatholisch: 0.10,
  default: 0.10,
} as const

// Municipal multipliers for common Zurich municipalities
export const ZURICH_MUNICIPAL_MULTIPLIERS: Record<string, number> = {
  "Zürich": 1.19,
  "Winterthur": 1.22,
  "Uster": 1.10,
  "Dübendorf": 1.06,
  "Dietikon": 1.18,
  "Wetzikon": 1.15,
  "Horgen": 0.96,
  "Bülach": 1.07,
  "Adliswil": 1.14,
  "Kloten": 1.02,
  "Opfikon": 0.87,
  "Illnau-Effretikon": 1.14,
  "Volketswil": 0.93,
  "Küsnacht": 0.82,
  "Zollikon": 0.82,
  "Meilen": 0.80,
  "Herrliberg": 0.78,
  "Thalwil": 0.95,
  "Wädenswil": 1.15,
  "Rüti": 1.15,
}

/**
 * Get the municipal multiplier for a given municipality.
 * Falls back to Zurich city rate if not found.
 */
export function getMunicipalMultiplier(municipality: string): number {
  return ZURICH_MUNICIPAL_MULTIPLIERS[municipality] ?? ZURICH_CITY_MUNICIPAL_MULTIPLIER
}
