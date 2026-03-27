import { useEffect, useState, useCallback } from "react"
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store"
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/constants"
import type { Family, FamilyMember } from "@/types"

export function useFamily() {
  const { user, familyId, setFamilyId } = useAuthStore()
  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familyId) {
      setFamily(null)
      setLoading(false)
      return
    }

    const unsubscribe = onSnapshot(doc(db, "families", familyId), (snap) => {
      if (snap.exists()) {
        setFamily({ id: snap.id, ...snap.data() } as Family)
      } else {
        setFamily(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [familyId])

  const createFamily = useCallback(
    async (data: {
      name: string
      adults: FamilyMember[]
      children: FamilyMember[]
      municipality: string
      churchTax: boolean
    }) => {
      if (!user) throw new Error("Not authenticated")

      const familyRef = doc(collection(db, "families"))
      const batch = writeBatch(db)

      const familyData: Omit<Family, "id"> = {
        ownerId: user.uid,
        members: [user.uid],
        name: data.name,
        adults: data.adults,
        children: data.children,
        canton: "ZH",
        municipality: data.municipality,
        churchTax: data.churchTax,
        baseCurrency: "CHF",
        onboardingComplete: false,
        createdAt: serverTimestamp() as Family["createdAt"],
        updatedAt: serverTimestamp() as Family["updatedAt"],
      }

      batch.set(familyRef, familyData)

      // Seed default expense categories
      for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
        const catRef = doc(collection(db, "families", familyRef.id, "expenseCategories"))
        batch.set(catRef, {
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          priority: 3, // Default medium priority
          isDefault: true,
          sortOrder: cat.sortOrder,
          isFixed: cat.isFixed,
        })
      }

      await batch.commit()
      setFamilyId(familyRef.id)
      return familyRef.id
    },
    [user, setFamilyId]
  )

  const updateFamily = useCallback(
    async (updates: Partial<Family>) => {
      if (!familyId) throw new Error("No family")
      await setDoc(
        doc(db, "families", familyId),
        { ...updates, updatedAt: serverTimestamp() },
        { merge: true }
      )
    },
    [familyId]
  )

  const completeOnboarding = useCallback(async () => {
    if (!familyId) return
    await setDoc(
      doc(db, "families", familyId),
      { onboardingComplete: true, updatedAt: serverTimestamp() },
      { merge: true }
    )
  }, [familyId])

  return {
    family,
    loading,
    createFamily,
    updateFamily,
    completeOnboarding,
  }
}
