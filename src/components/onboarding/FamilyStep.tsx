import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { v4 as uuid } from "uuid"
import type { FamilyMember } from "@/types"

interface FamilyStepProps {
  familyName: string
  adults: FamilyMember[]
  children: FamilyMember[]
  municipality: string
  churchTax: boolean
  onUpdate: (data: {
    familyName?: string
    adults?: FamilyMember[]
    children?: FamilyMember[]
    municipality?: string
    churchTax?: boolean
  }) => void
}

export function FamilyStep({
  familyName,
  adults,
  children,
  municipality,
  churchTax,
  onUpdate,
}: FamilyStepProps) {
  const addAdult = () => {
    onUpdate({
      adults: [
        ...adults,
        { id: uuid(), name: "", role: "adult" as const },
      ],
    })
  }

  const addChild = (planned = false) => {
    onUpdate({
      children: [
        ...children,
        {
          id: uuid(),
          name: "",
          role: "child" as const,
          isPlanned: planned,
          ...(planned ? { plannedArrivalDate: "" } : { dateOfBirth: "" }),
        },
      ],
    })
  }

  const updateMember = (
    type: "adults" | "children",
    index: number,
    updates: Partial<FamilyMember>
  ) => {
    const list = type === "adults" ? [...adults] : [...children]
    list[index] = { ...list[index], ...updates }
    onUpdate({ [type]: list })
  }

  const removeMember = (type: "adults" | "children", index: number) => {
    const list = type === "adults" ? [...adults] : [...children]
    list.splice(index, 1)
    onUpdate({ [type]: list })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Family Profile</h2>
        <p className="text-sm text-muted-foreground">
          Tell us about your family to personalize your budget plan.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="familyName">Family Name</Label>
        <Input
          id="familyName"
          placeholder='e.g. "The Müller Family"'
          value={familyName}
          onChange={(e) => onUpdate({ familyName: e.target.value })}
        />
      </div>

      {/* Adults */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Adults</Label>
          <Button variant="outline" size="sm" onClick={addAdult}>
            <Plus className="mr-1 h-3 w-3" />
            Add Adult
          </Button>
        </div>
        {adults.map((adult, i) => (
          <Card key={adult.id}>
            <CardContent className="flex items-center gap-3 pt-4">
              <Input
                placeholder={`Adult ${i + 1} name`}
                value={adult.name}
                onChange={(e) => updateMember("adults", i, { name: e.target.value })}
                className="flex-1"
              />
              <Input
                type="date"
                value={adult.dateOfBirth ?? ""}
                onChange={(e) => updateMember("adults", i, { dateOfBirth: e.target.value })}
                className="w-40"
              />
              {adults.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMember("adults", i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Children */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Children</Label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addChild(false)}>
              <Plus className="mr-1 h-3 w-3" />
              Existing Child
            </Button>
            <Button variant="outline" size="sm" onClick={() => addChild(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Planned Child
            </Button>
          </div>
        </div>
        {children.length === 0 && (
          <p className="text-sm text-muted-foreground">No children added yet.</p>
        )}
        {children.map((child, i) => (
          <Card key={child.id}>
            <CardContent className="flex items-center gap-3 pt-4">
              <Input
                placeholder={child.isPlanned ? "Planned child name" : `Child ${i + 1} name`}
                value={child.name}
                onChange={(e) => updateMember("children", i, { name: e.target.value })}
                className="flex-1"
              />
              {child.isPlanned ? (
                <Input
                  type="date"
                  value={child.plannedArrivalDate ?? ""}
                  onChange={(e) =>
                    updateMember("children", i, { plannedArrivalDate: e.target.value })
                  }
                  className="w-40"
                  title="Expected arrival date"
                />
              ) : (
                <Input
                  type="date"
                  value={child.dateOfBirth ?? ""}
                  onChange={(e) =>
                    updateMember("children", i, { dateOfBirth: e.target.value })
                  }
                  className="w-40"
                />
              )}
              {child.isPlanned && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  Planned
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMember("children", i)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Location & Tax */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="municipality">Municipality</Label>
          <Input
            id="municipality"
            placeholder="Zürich"
            value={municipality}
            onChange={(e) => onUpdate({ municipality: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Used for accurate tax calculation (Steuerfuss)
          </p>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch
            id="churchTax"
            checked={churchTax}
            onCheckedChange={(checked) => onUpdate({ churchTax: checked })}
          />
          <Label htmlFor="churchTax">Church tax applies</Label>
        </div>
      </div>
    </div>
  )
}
