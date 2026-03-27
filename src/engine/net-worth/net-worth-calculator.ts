import type { Asset } from "@/types"
import { LIABILITY_TYPES } from "@/types/asset"
import type { NetWorthSnapshot } from "./types"

const LIQUID_TYPES = new Set(["bank_account", "savings_account", "other_liquid"])
const INVESTMENT_TYPES = new Set(["investment"])
const PROPERTY_TYPES = new Set(["real_estate"])
const PENSION_TYPES = new Set(["pension_2nd_pillar", "pension_3a"])
const CRYPTO_TYPES = new Set(["crypto"])
const LIABILITY_TYPE_SET = new Set(LIABILITY_TYPES)

/**
 * Calculate current net worth from all assets and liabilities.
 */
export function calculateNetWorth(assets: Asset[]): NetWorthSnapshot {
  const breakdown = {
    liquid: 0,
    investments: 0,
    property: 0,
    pension: 0,
    crypto: 0,
    other: 0,
    mortgages: 0,
    otherLiabilities: 0,
  }

  for (const asset of assets) {
    const value = asset.currentValue

    if (LIABILITY_TYPE_SET.has(asset.type)) {
      breakdown.otherLiabilities += value
    } else if (LIQUID_TYPES.has(asset.type)) {
      breakdown.liquid += value
    } else if (INVESTMENT_TYPES.has(asset.type)) {
      breakdown.investments += value
    } else if (PROPERTY_TYPES.has(asset.type)) {
      breakdown.property += value
      if (asset.mortgageBalance) {
        breakdown.mortgages += asset.mortgageBalance
      }
    } else if (PENSION_TYPES.has(asset.type)) {
      breakdown.pension += value
    } else if (CRYPTO_TYPES.has(asset.type)) {
      breakdown.crypto += value
    } else {
      breakdown.other += value
    }
  }

  const totalAssets =
    breakdown.liquid +
    breakdown.investments +
    breakdown.property +
    breakdown.pension +
    breakdown.crypto +
    breakdown.other

  const totalLiabilities = breakdown.mortgages + breakdown.otherLiabilities

  return {
    date: new Date().toISOString().split("T")[0],
    totalAssets: Math.round(totalAssets),
    totalLiabilities: Math.round(totalLiabilities),
    netWorth: Math.round(totalAssets - totalLiabilities),
    breakdown: {
      liquid: Math.round(breakdown.liquid),
      investments: Math.round(breakdown.investments),
      property: Math.round(breakdown.property),
      pension: Math.round(breakdown.pension),
      crypto: Math.round(breakdown.crypto),
      other: Math.round(breakdown.other),
      mortgages: Math.round(breakdown.mortgages),
      otherLiabilities: Math.round(breakdown.otherLiabilities),
    },
  }
}
