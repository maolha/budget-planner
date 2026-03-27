import type { Timestamp } from "firebase/firestore"

export type LifeEventType =
  | "new_child"
  | "salary_change"
  | "job_change"
  | "apartment_change"
  | "retirement"
  | "mortgage_change"
  | "large_purchase"
  | "education_start"
  | "custom"

export interface LifeEvent {
  id: string
  type: LifeEventType
  date: string
  label: string
  params: Record<string, unknown>
}

export interface Scenario {
  id: string
  name: string
  description?: string
  forkedFrom?: string
  lifeEvents: LifeEvent[]
  isBase: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
