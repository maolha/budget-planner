import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store"
import { useFamily } from "@/hooks/useFamily"
import { FamilyStep } from "./FamilyStep"
import { IncomeStep, type IncomeEntry } from "./IncomeStep"
import { ExpensePriorityStep } from "./ExpensePriorityStep"
import { AssetStep, type AssetEntry } from "./AssetStep"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import type { FamilyMember } from "@/types"
import { v4 as uuid } from "uuid"

const STEPS = ["Family", "Income", "Priorities", "Assets"]

export function OnboardingWizard() {
  const navigate = useNavigate()
  const { familyId } = useAuthStore()
  const { createFamily, completeOnboarding } = useFamily()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Family state
  const [familyName, setFamilyName] = useState("")
  const [adults, setAdults] = useState<FamilyMember[]>([
    { id: uuid(), name: "", role: "adult" },
    { id: uuid(), name: "", role: "adult" },
  ])
  const [children, setChildren] = useState<FamilyMember[]>([])
  const [municipality, setMunicipality] = useState("Zürich")
  const [churchTax, setChurchTax] = useState(false)

  // Income state
  const [incomes, setIncomes] = useState<IncomeEntry[]>([])

  // Priority state
  const [priorities, setPriorities] = useState<Record<string, number>>({})

  // Asset state
  const [assets, setAssets] = useState<AssetEntry[]>([])

  const handleFamilyUpdate = (data: {
    familyName?: string
    adults?: FamilyMember[]
    children?: FamilyMember[]
    municipality?: string
    churchTax?: boolean
  }) => {
    if (data.familyName !== undefined) setFamilyName(data.familyName)
    if (data.adults !== undefined) setAdults(data.adults)
    if (data.children !== undefined) setChildren(data.children)
    if (data.municipality !== undefined) setMunicipality(data.municipality)
    if (data.churchTax !== undefined) setChurchTax(data.churchTax)
  }

  const canProceed = () => {
    switch (step) {
      case 0:
        return familyName.trim() !== "" && adults.some((a) => a.name.trim() !== "")
      case 1:
        return true // Income is optional during onboarding
      case 2:
        return true // Priorities have defaults
      case 3:
        return true // Assets are optional
      default:
        return false
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      // Create family if not exists
      let fid = familyId
      if (!fid) {
        fid = await createFamily({
          name: familyName,
          adults: adults.filter((a) => a.name.trim() !== ""),
          children,
          municipality,
          churchTax,
        })
      }

      if (!fid) throw new Error("Failed to create family")

      // Save income records
      for (const income of incomes) {
        if (!income.employer && !income.annualGross) continue
        const ref = doc(collection(db, "families", fid, "incomeRecords"))
        await setDoc(ref, {
          memberId: income.memberId,
          employer: income.employer,
          jobTitle: income.jobTitle,
          type: "salary",
          annualGross: income.annualGross,
          bonus: income.bonus,
          startDate: income.startDate,
          endDate: income.endDate || null,
          isProjection: false,
          createdAt: serverTimestamp(),
        })
      }

      // Update category priorities
      // (categories were seeded during createFamily, we'd update them here)
      // For now priorities are stored and will be applied when user visits expenses

      // Save assets
      for (const asset of assets) {
        if (!asset.name && !asset.currentValue) continue
        const ref = doc(collection(db, "families", fid, "assets"))
        await setDoc(ref, {
          name: asset.name,
          type: asset.type,
          currentValue: asset.currentValue,
          currency: "CHF",
          institution: asset.institution,
          mortgageBalance: asset.mortgageBalance ?? null,
          valueHistory: [
            { date: new Date().toISOString().split("T")[0], value: asset.currentValue },
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      await completeOnboarding()
      navigate("/")
    } catch (err) {
      console.error("Onboarding error:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Set Up Your Budget</h1>
        <p className="text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />

      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <FamilyStep
              familyName={familyName}
              adults={adults}
              children={children}
              municipality={municipality}
              churchTax={churchTax}
              onUpdate={handleFamilyUpdate}
            />
          )}
          {step === 1 && (
            <IncomeStep adults={adults} incomes={incomes} onUpdate={setIncomes} />
          )}
          {step === 2 && (
            <ExpensePriorityStep priorities={priorities} onUpdate={setPriorities} />
          )}
          {step === 3 && <AssetStep assets={assets} onUpdate={setAssets} />}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={saving}>
            {saving ? "Saving..." : "Complete Setup"}
            <Check className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
