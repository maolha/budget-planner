import type { Timestamp } from "firebase/firestore"

export interface Family {
  id: string
  ownerId: string
  members: string[] // UIDs with access
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
}

export interface FamilyMember {
  id: string
  name: string
  role: "adult" | "child"
  dateOfBirth?: string
  isPlanned?: boolean
  plannedArrivalDate?: string
}
