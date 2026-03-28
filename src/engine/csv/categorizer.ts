import type { ParsedTransaction } from "./types"

// Keyword → category mapping for Zurich merchants and German-language bank statements
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  groceries: [
    "migros", "coop", "denner", "aldi", "lidl", "spar", "volg",
    "manor food", "globus delicatessa", "lebensmittel", "nahrung",
  ],
  restaurants: [
    "restaurant", "café", "cafe", "bar", "bistro", "pizzeria",
    "mcdonald", "burger king", "starbucks", "subway", "kebab",
    "takeaway", "delivery", "uber eats", "just eat", "eat.ch",
    "club", "lounge",
  ],
  transport: [
    "sbb", "zvv", "vbz", "zürcher verkehrsverbund",
    "mobility", "uber", "bolt", "taxi", "lime", "tier",
    "verkehr", "öv", "halbtax", "ga ",
  ],
  car: [
    "parkhaus", "parking", "benzin", "tankstelle", "shell", "bp ",
    "avia", "auto", "garage", "tcs", "strassenverkehrsamt",
    "versicherung auto", "motorfahrzeug",
  ],
  health_insurance: [
    "krankenkasse", "css", "helsana", "swica", "sanitas",
    "concordia", "visana", "atupri", "kvg", "assura",
    "gesundheit", "arzt", "zahnarzt", "apotheke", "pharmacy",
    "drogerie", "optiker", "spital", "praxis",
  ],
  holidays: [
    "hotel", "airbnb", "booking.com", "expedia", "swiss.com",
    "easyjet", "ryanair", "flug", "flight", "ferien", "reise",
  ],
  clothing: [
    "h&m", "zara", "uniqlo", "c&a", "pkz", "globus",
    "manor", "jelmoli", "zalando", "kleider", "schuhe",
  ],
  leisure: [
    "kino", "cinema", "spotify", "netflix", "disney",
    "apple music", "ticketcorner", "theater", "museum",
    "zoo", "konzert", "fitness", "sport", "hobby",
    "freizeit",
  ],
  communication: [
    "swisscom", "sunrise", "salt", "wingo", "yallo",
    "internet", "nzz", "tages-anzeiger", "blick",
    "kommunikation", "medien",
  ],
  personal_care: [
    "coiffeur", "friseur", "haircut", "kosmetik",
    "wellness", "spa", "massage", "körperpflege", "hygiene",
  ],
  gifts: [
    "geschenk", "gift", "blumen", "flowers", "fleurop",
  ],
  housing: [
    "miete", "rent", "immobilien", "wohnung",
    "verwaltung", "nebenkosten", "ewz", "energie",
    "elektrizität", "heizung", "serafe", "strom", "wohnen",
  ],
  household: [
    "haushalt", "ikea", "möbel", "pfister", "micasa",
    "reinigung", "putzfrau", "hauswart",
  ],
  childcare: [
    "kita", "kinderbetreuung", "krippe", "hort",
    "tagesschule", "babysit",
  ],
  personal_expenses: [
    "persönlich", "ausgaben", "cashbezug", "bargeldbezug",
  ],
  investments: [
    "swissquote", "degiro", "interactive brokers", "crypto",
    "bitcoin", "ethereum", "nexo", "coinbase", "binance",
    "invest", "anlage",
  ],
  taxes: [
    "steueramt", "steuern", "steuer", "quellensteuer",
    "bundessteuer", "kantonssteuer",
  ],
  pension_3a: [
    "3a", "säule 3", "pillar 3", "viac", "frankly",
    "vorsorge",
  ],
}

/**
 * Auto-categorize a transaction based on description keywords.
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
    // Keep CSV-provided category if it was already set with high confidence
    if (t.suggestedCategory && t.categoryConfidence >= 0.8) {
      return t
    }
    const { category, confidence } = categorizeTransaction(t.description)
    return {
      ...t,
      suggestedCategory: category,
      categoryConfidence: confidence,
    }
  })
}
