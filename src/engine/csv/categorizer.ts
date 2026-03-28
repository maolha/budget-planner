import type { ParsedTransaction } from "./types"
import { normalizeDescription } from "@/hooks/useCategoryRules"

// ── Expense categories (DE + EN keywords) ────────────────────────────────────

const EXPENSE_KEYWORDS: Record<string, string[]> = {
  groceries: [
    // Swiss merchants
    "migros", "coop", "denner", "aldi", "lidl", "spar", "volg",
    "manor food", "globus delicatessa",
    // DE
    "lebensmittel", "nahrung", "supermarkt", "einkauf",
    // EN
    "grocery", "supermarket",
  ],
  restaurants: [
    "restaurant", "café", "cafe", "bar ", "bistro", "pizzeria",
    "mcdonald", "burger king", "starbucks", "subway", "kebab",
    "takeaway", "delivery", "uber eats", "just eat", "eat.ch",
    "club", "lounge",
    // DE
    "gaststätte", "imbiss", "wirtshaus", "beiz",
    // EN
    "diner", "food delivery",
  ],
  transport: [
    "sbb", "zvv", "vbz", "zürcher verkehrsverbund",
    "mobility", "uber", "bolt", "taxi", "lime", "tier",
    // DE
    "verkehr", "öv", "halbtax", "ga ", "fahrausweis", "bahnhof",
    // EN
    "transit", "train", "bus ticket", "public transport",
  ],
  car: [
    "parkhaus", "parking", "benzin", "tankstelle", "shell", "bp ",
    "avia", "garage", "tcs", "strassenverkehrsamt",
    "versicherung auto", "motorfahrzeug",
    // EN
    "fuel", "petrol", "gas station", "car wash", "car insurance",
  ],
  health_insurance: [
    // Swiss insurers
    "krankenkasse", "css", "helsana", "swica", "sanitas",
    "concordia", "visana", "atupri", "kvg", "assura",
    // DE
    "gesundheit", "arzt", "zahnarzt", "apotheke", "drogerie",
    "optiker", "spital", "praxis", "krankenhaus",
    // EN
    "pharmacy", "doctor", "dentist", "hospital", "health insurance",
    "optician", "medical",
  ],
  holidays: [
    "hotel", "airbnb", "booking.com", "expedia", "swiss.com",
    "easyjet", "ryanair", "flug", "flight",
    // DE
    "ferien", "reise", "reisebüro", "urlaub",
    // EN
    "vacation", "travel", "holiday", "airline",
  ],
  clothing: [
    "h&m", "zara", "uniqlo", "c&a", "pkz", "globus",
    "manor", "jelmoli", "zalando",
    // DE
    "kleider", "schuhe", "bekleidung", "mode",
    // EN
    "clothing", "shoes", "fashion", "apparel",
  ],
  leisure: [
    "kino", "cinema", "spotify", "netflix", "disney",
    "apple music", "ticketcorner", "theater", "museum",
    "zoo", "konzert", "fitness", "sport", "hobby",
    // DE
    "freizeit", "verein", "mitgliedschaft",
    // EN
    "concert", "gym", "entertainment", "subscription", "membership",
  ],
  communication: [
    "swisscom", "sunrise", "salt", "wingo", "yallo",
    "internet", "nzz", "tages-anzeiger", "blick",
    // DE
    "kommunikation", "medien", "telefon", "handy", "mobilfunk",
    // EN
    "phone", "mobile", "telecom", "newspaper",
  ],
  personal_care: [
    // DE
    "coiffeur", "friseur", "kosmetik", "körperpflege", "hygiene",
    // EN
    "haircut", "hairdresser", "beauty", "cosmetics",
    "wellness", "spa", "massage",
  ],
  gifts: [
    // DE
    "geschenk", "blumen", "fleurop", "spende", "donation",
    // EN
    "gift", "flowers", "present",
  ],
  housing: [
    // DE
    "miete", "immobilien", "wohnung", "verwaltung", "nebenkosten",
    "ewz", "energie", "elektrizität", "heizung", "serafe", "strom",
    "wohnen", "hausverwaltung",
    // EN
    "rent", "electricity", "utilities", "heating", "property management",
  ],
  household: [
    "ikea", "möbel", "pfister", "micasa",
    // DE
    "haushalt", "reinigung", "putzfrau", "hauswart", "einrichtung",
    // EN
    "furniture", "cleaning", "household", "home supplies",
  ],
  childcare: [
    // DE
    "kita", "kinderbetreuung", "krippe", "hort", "tagesschule",
    "babysit", "kindertagesstätte", "spielgruppe",
    // EN
    "daycare", "nursery", "childcare", "babysitter", "playgroup",
  ],
  personal_expenses: [
    // DE
    "persönlich", "ausgaben", "cashbezug", "bargeldbezug", "bancomat",
    // EN
    "cash withdrawal", "atm",
  ],
  investments: [
    "swissquote", "degiro", "interactive brokers", "crypto",
    "bitcoin", "ethereum", "nexo", "coinbase", "binance",
    // DE
    "invest", "anlage", "wertschrift", "depot",
    // EN
    "investment", "securities", "brokerage", "trading",
  ],
  taxes: [
    // DE
    "steueramt", "steuern", "steuer", "quellensteuer",
    "bundessteuer", "kantonssteuer", "gemeindesteuern",
    // EN
    "tax office", "income tax", "withholding tax",
  ],
  pension_3a: [
    "3a", "säule 3", "pillar 3", "viac", "frankly",
    // DE
    "vorsorge", "pensionskasse", "bvg",
    // EN
    "pension", "retirement fund",
  ],
}

// ── Income categories ────────────────────────────────────────────────────────

const INCOME_KEYWORDS: Record<string, string[]> = {
  salary: [
    // DE
    "lohn", "gehalt", "salär", "lohnzahlung", "monatslohn",
    "nettolohn", "bruttolohn", "arbeitgeber",
    // EN
    "salary", "payroll", "wage", "pay slip", "employer",
  ],
  bonus: [
    // DE
    "bonus", "prämie", "gratifikation", "sonderzahlung",
    "13. monatslohn", "13. monatsgehalt",
    // EN
    "bonus", "incentive", "13th salary",
  ],
  dividend: [
    // DE
    "dividende", "ausschüttung", "gewinnbeteiligung",
    // EN
    "dividend", "distribution", "payout",
  ],
  investment_return: [
    // DE
    "kapitalertrag", "zinsertrag", "kursgewinn", "rendite",
    "wertschriftenertrag",
    // EN
    "interest income", "capital gain", "investment return", "yield",
    "return on investment",
  ],
  rental_income: [
    // DE
    "mieteinnahme", "mietzins eingang", "mietertrag",
    // EN
    "rental income", "rent received", "tenant payment",
  ],
  refund: [
    // DE
    "rückerstattung", "rückvergütung", "gutschrift", "erstattung",
    "prämienverbilligung", "vergütung",
    // EN
    "refund", "reimbursement", "cashback", "credit note",
  ],
  child_allowance: [
    // DE
    "kinderzulage", "familienzulage", "kindergeld",
    // EN
    "child allowance", "family allowance", "child benefit",
  ],
}

// ── Internal transfers (auto-hide candidates) ────────────────────────────────

const INTERNAL_TRANSFER_KEYWORDS: string[] = [
  // DE — credit card payments
  "lsv zahlung", "lsv-zahlung", "kartenzahlung", "kreditkarten",
  "visa abrechnung", "mastercard abrechnung", "amex abrechnung",
  "swisscard", "cembra", "cumulus mastercard",
  // DE — account transfers
  "kontoübertrag", "übertrag", "umbuchung", "kontotransfer",
  "eigener auftrag", "dauerauftrag an eigenes",
  "interne überweisung", "überweisung eigenes konto",
  // EN — credit card payments
  "credit card payment", "card payment settlement",
  "visa payment", "mastercard payment",
  // EN — account transfers
  "account transfer", "internal transfer", "own account",
  "standing order own", "self transfer",
]

// ── Combined keyword map for general lookup ──────────────────────────────────

export const ALL_KEYWORDS: Record<string, string[]> = {
  ...EXPENSE_KEYWORDS,
  ...INCOME_KEYWORDS,
}

/**
 * Check if a transaction description matches an internal transfer pattern.
 */
export function isInternalTransfer(description: string): boolean {
  const lower = description.toLowerCase()
  return INTERNAL_TRANSFER_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Auto-categorize a transaction based on description keywords.
 * If userRules map is provided, learned rules take highest priority.
 * For positive amounts (inflows), income keywords are checked first.
 */
export function categorizeTransaction(
  description: string,
  userRules?: Map<string, string>,
  amount?: number
): { category: string; confidence: number } {
  // 1. Check user-learned rules first (highest priority)
  if (userRules) {
    const normalized = normalizeDescription(description)
    const match = userRules.get(normalized)
    if (match) {
      return { category: match, confidence: 1.0 }
    }
  }

  const lower = description.toLowerCase()

  // 2. For inflows (positive amounts), check income keywords first
  if (amount !== undefined && amount > 0) {
    for (const [category, keywords] of Object.entries(INCOME_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return { category, confidence: 0.8 }
        }
      }
    }
  }

  // 3. Keyword-based matching (expense categories)
  for (const [category, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return { category, confidence: 0.8 }
      }
    }
  }

  // 4. For inflows that didn't match anything, default to generic income
  if (amount !== undefined && amount > 0) {
    return { category: "other_income", confidence: 0.2 }
  }

  return { category: "other", confidence: 0.2 }
}

/**
 * Batch categorize all transactions.
 * Pass userRules to apply learned category rules before keyword matching.
 */
export function categorizeTransactions(
  transactions: ParsedTransaction[],
  userRules?: Map<string, string>
): ParsedTransaction[] {
  return transactions.map((t) => {
    // Keep CSV-provided category if it was already set with high confidence
    if (t.suggestedCategory && t.categoryConfidence >= 0.8) {
      return t
    }
    const { category, confidence } = categorizeTransaction(
      t.description,
      userRules,
      t.amount
    )
    return {
      ...t,
      suggestedCategory: category,
      categoryConfidence: confidence,
    }
  })
}

/** Get all known category keys (expense + income) for display. */
export const EXPENSE_CATEGORY_KEYS = Object.keys(EXPENSE_KEYWORDS)
export const INCOME_CATEGORY_KEYS = Object.keys(INCOME_KEYWORDS)
