import type { ParsedTransaction, DuplicateCandidate } from "./types"

// Known credit card provider keywords in bank statement descriptions
const CC_PROVIDER_KEYWORDS = [
  "visa", "mastercard", "master card", "swisscard", "amex",
  "american express", "cornèr", "corner bank", "cembra",
  "credit card", "kreditkarte", "kartenzahlung",
]

/**
 * Detect potential credit card lump-sum payments in bank statements
 * that might double-count individual CC transactions.
 *
 * Algorithm:
 * 1. Scan bank transactions for CC provider keywords
 * 2. For each match, look at CC transactions within a +/- 5 day window
 * 3. If the sum of CC transactions is close to the bank amount, flag it
 */
export function detectDuplicates(
  bankTransactions: ParsedTransaction[],
  ccTransactions: ParsedTransaction[],
  ccStatementId: string,
  toleranceCHF = 1.0,
  dayWindow = 5
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = []

  for (const bankTxn of bankTransactions) {
    const descLower = bankTxn.description.toLowerCase()

    // Check if this bank transaction looks like a CC payment
    const isCcPayment = CC_PROVIDER_KEYWORDS.some((kw) => descLower.includes(kw))
    if (!isCcPayment) continue

    // Amount should be negative (money going out) — use absolute value
    const bankAmount = Math.abs(bankTxn.amount)
    if (bankAmount < 10) continue // Skip tiny amounts

    // Find CC transactions within the date window
    const bankDate = new Date(bankTxn.date)
    const windowStart = new Date(bankDate)
    windowStart.setDate(windowStart.getDate() - dayWindow)
    const windowEnd = new Date(bankDate)
    windowEnd.setDate(windowEnd.getDate() + dayWindow)

    const matchingCcTxns = ccTransactions.filter((cc) => {
      const ccDate = new Date(cc.date)
      return ccDate >= windowStart && ccDate <= windowEnd
    })

    if (matchingCcTxns.length === 0) continue

    // Sum CC transactions and compare
    const ccTotal = matchingCcTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    if (Math.abs(bankAmount - ccTotal) <= toleranceCHF) {
      candidates.push({
        bankDate: bankTxn.date,
        bankAmount,
        bankDescription: bankTxn.description,
        ccTotal,
        ccCount: matchingCcTxns.length,
        ccStatementId,
        confidence: 1 - Math.abs(bankAmount - ccTotal) / bankAmount,
      })
    }
  }

  return candidates
}
