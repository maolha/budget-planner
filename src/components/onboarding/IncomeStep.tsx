import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { v4 as uuid } from "uuid"
import type { FamilyMember } from "@/types"

export interface IncomeEntry {
  id: string
  memberId: string
  employer: string
  jobTitle: string
  annualGross: number
  bonus: number
  startDate: string
  endDate: string
}

interface IncomeStepProps {
  adults: FamilyMember[]
  incomes: IncomeEntry[]
  onUpdate: (incomes: IncomeEntry[]) => void
}

export function IncomeStep({ adults, incomes, onUpdate }: IncomeStepProps) {
  const addIncome = () => {
    onUpdate([
      ...incomes,
      {
        id: uuid(),
        memberId: adults[0]?.id ?? "",
        employer: "",
        jobTitle: "",
        annualGross: 0,
        bonus: 0,
        startDate: "",
        endDate: "",
      },
    ])
  }

  const updateIncome = (index: number, updates: Partial<IncomeEntry>) => {
    const list = [...incomes]
    list[index] = { ...list[index], ...updates }
    onUpdate(list)
  }

  const removeIncome = (index: number) => {
    const list = [...incomes]
    list.splice(index, 1)
    onUpdate(list)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Income Sources</h2>
        <p className="text-sm text-muted-foreground">
          Add current and past employment for each adult. You can add more later.
        </p>
      </div>

      {incomes.map((income, i) => (
        <Card key={income.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">
              {income.employer || `Income Source ${i + 1}`}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => removeIncome(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Family Member</Label>
                <Select
                  value={income.memberId}
                  onValueChange={(val) => updateIncome(i, { memberId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {adults.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name || "Unnamed Adult"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employer</Label>
                <Input
                  placeholder="Company name"
                  value={income.employer}
                  onChange={(e) => updateIncome(i, { employer: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input
                  placeholder="e.g. Software Engineer"
                  value={income.jobTitle}
                  onChange={(e) => updateIncome(i, { jobTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Annual Gross Salary (CHF)</Label>
                <Input
                  type="number"
                  placeholder="120000"
                  value={income.annualGross || ""}
                  onChange={(e) =>
                    updateIncome(i, { annualGross: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Annual Bonus (CHF)</Label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={income.bonus || ""}
                  onChange={(e) => updateIncome(i, { bonus: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={income.startDate}
                  onChange={(e) => updateIncome(i, { startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={income.endDate}
                  onChange={(e) => updateIncome(i, { endDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Leave empty if current</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addIncome} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Income Source
      </Button>
    </div>
  )
}
