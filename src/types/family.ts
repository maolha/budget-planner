import type { Timestamp } from "firebase/firestore"

export interface Family {
  id: string
  ownerId: string
  members: string[] // UIDs with access
  inviteCode: string // 6-char code for family joining
  name: string
  adults: FamilyMember[]
  children: FamilyMember[]
  canton: string
  municipality: string
  churchTax: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  onboardingComplete: boolean
  baseCurrency: "CHF"
  // Tax settings (persisted)
  pension3aOverride?: number
  otherDeductions?: number
}

export interface FamilyMember {
  id: string
  name: string
  role: "adult" | "child"
  dateOfBirth?: string
  isPlanned?: boolean
  plannedArrivalDate?: string
}
