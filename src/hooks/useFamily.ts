import { useEffect, useState, useCallback } from "react"
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  writeBatch,
  query,
  where,
  getDocs,
  arrayUnion,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store"
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/constants"
import type { Family, FamilyMember } from "@/types"

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // No I/O/0/1 to avoid confusion
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

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
        inviteCode: generateInviteCode(),
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
          priority: 3,
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

  const joinFamily = useCallback(
    async (inviteCode: string): Promise<boolean> => {
      if (!user) throw new Error("Not authenticated")

      // Find family by invite code
      const q = query(
        collection(db, "families"),
        where("inviteCode", "==", inviteCode.toUpperCase().trim())
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) return false

      const familyDoc = snapshot.docs[0]

      // Add this user to the members array
      await setDoc(
        doc(db, "families", familyDoc.id),
        {
          members: arrayUnion(user.uid),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )

      setFamilyId(familyDoc.id)
      return true
    },
    [user, setFamilyId]
  )

  const regenerateInviteCode = useCallback(async () => {
    if (!familyId) throw new Error("No family")
    const newCode = generateInviteCode()
    await setDoc(
      doc(db, "families", familyId),
      { inviteCode: newCode, updatedAt: serverTimestamp() },
      { merge: true }
    )
    return newCode
  }, [familyId])

  const resetCategories = useCallback(async () => {
    if (!familyId) throw new Error("No family")

    // Delete all existing categories
    const catSnap = await getDocs(collection(db, "families", familyId, "expenseCategories"))
    const batch = writeBatch(db)
    catSnap.docs.forEach((d) => batch.delete(d.ref))

    // Re-seed with current defaults
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      const catRef = doc(collection(db, "families", familyId, "expenseCategories"))
      batch.set(catRef, {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        priority: 3,
        isDefault: true,
        sortOrder: cat.sortOrder,
        isFixed: cat.isFixed,
      })
    }

    await batch.commit()
  }, [familyId])

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
    joinFamily,
    regenerateInviteCode,
    resetCategories,
    updateFamily,
    completeOnboarding,
  }
}
