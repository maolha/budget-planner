export interface ParsedTransaction {
  date: string
  amount: number
  description: string
  balance?: number
  rawRow: Record<string, string>
  suggestedCategory?: string
  categoryConfidence: number // 0-1
}

export interface ColumnMapping {
  date: string
  amount: string
  description: string
  balance?: string
}

export interface DuplicateCandidate {
  bankDate: string
  bankAmount: number
  bankDescription: string
  ccTotal: number
  ccCount: number
  ccStatementId: string
  confidence: number // 0-1
}
