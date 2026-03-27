import type { ParsedTransaction } from "./types"

// Keyword → category mapping for common Zurich merchants/patterns
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  groceries: [
    "migros", "coop", "denner", "aldi", "lidl", "spar", "volg",
    "manor food", "globus delicatessa",
  ],
  restaurants: [
    "restaurant", "café", "cafe", "bar", "bistro", "pizzeria",
    "mcdonald", "burger king", "starbucks", "subway", "kebab",
    "takeaway", "delivery", "uber eats", "just eat", "eat.ch",
  ],
  transport: [
    "sbb", "zvv", "vbz", "zürcher verkehrsverbund", "parkhaus",
    "parking", "benzin", "tankstelle", "shell", "bp ", "avia",
    "mobility", "uber", "bolt", "taxi", "lime", "tier",
  ],
  health_insurance: [
    "krankenkasse", "css", "helsana", "swica", "sanitas",
    "concordia", "visana", "atupri", "kvg", "assura",
  ],
  holidays: [
    "hotel", "airbnb", "booking.com", "expedia", "swiss.com",
    "easyjet", "ryanair", "flug", "flight",
  ],
  clothing: [
    "h&m", "zara", "uniqlo", "c&a", "pkz", "globus",
    "manor", "jelmoli", "zalando",
  ],
  entertainment: [
    "kino", "cinema", "spotify", "netflix", "disney",
    "apple music", "ticketcorner", "theater", "museum",
    "zoo", "konzert",
  ],
  subscriptions: [
    "swisscom", "sunrise", "salt", "wingo", "yallo",
    "adobe", "microsoft", "google storage", "icloud",
    "nzz", "tages-anzeiger", "blick",
  ],
  education: [
    "schule", "kurs", "udemy", "coursera", "bücher",
    "books", "orell füssli", "stauffacher",
  ],
  personal_care: [
    "apotheke", "pharmacy", "drogerie", "arzt", "zahnarzt",
    "dentist", "coiffeur", "friseur", "haircut", "optiker",
  ],
  gifts: [
    "geschenk", "gift", "blumen", "flowers", "fleurop",
  ],
  utilities: [
    "ewz", "energie", "elektrizität", "heizung", "serafe",
    "billag", "internet", "strom",
  ],
  rent: [
    "miete", "rent", "immobilien", "wohnung",
    "verwaltung", "nebenkosten",
  ],
}

/**
 * Auto-categorize a transaction based on description keywords.
 * Returns the category key and confidence score.
 */
export function categorizeTransaction(
  description: string
): { category: string; confidence: number } {
  const lower = description.toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return { category, confidence: 0.8 }
      }
    }
  }

  return { category: "other", confidence: 0.2 }
}

/**
 * Batch categorize all transactions.
 */
export function categorizeTransactions(
  transactions: ParsedTransaction[]
): ParsedTransaction[] {
  return transactions.map((t) => {
    const { category, confidence } = categorizeTransaction(t.description)
    return {
      ...t,
      suggestedCategory: category,
      categoryConfidence: confidence,
    }
  })
}
