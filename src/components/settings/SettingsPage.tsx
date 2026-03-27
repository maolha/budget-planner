import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Save, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useFamily } from "@/hooks/useFamily"
import { toast } from "sonner"
import type { FamilyMember } from "@/types"
import { v4 as uuid } from "uuid"
import { useNavigate } from "react-router-dom"

export function SettingsPage() {
  const { user } = useAuth()
  const { family, updateFamily } = useFamily()
  const navigate = useNavigate()

  const [familyName, setFamilyName] = useState(family?.name ?? "")
  const [municipality, setMunicipality] = useState(family?.municipality ?? "Zürich")
  const [churchTax, setChurchTax] = useState(family?.churchTax ?? false)
  const [adults, setAdults] = useState<FamilyMember[]>(family?.adults ?? [])
  const [children, setChildren] = useState<FamilyMember[]>(family?.children ?? [])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateFamily({
        name: familyName,
        municipality,
        churchTax,
        adults: adults.filter((a) => a.name.trim()),
        children,
      })
      toast.success("Settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const addAdult = () => {
    setAdults([...adults, { id: uuid(), name: "", role: "adult" }])
  }

  const addChild = (planned = false) => {
    setChildren([
      ...children,
      {
        id: uuid(),
        name: "",
        role: "child",
        isPlanned: planned,
        ...(planned ? { plannedArrivalDate: "" } : { dateOfBirth: "" }),
      },
    ])
  }

  if (!family) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No family profile found. Complete the onboarding to get started.
            </p>
            <Button className="mt-4" onClick={() => navigate("/onboarding")}>
              Start Onboarding
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your family profile and preferences.</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Display Name</span>
            <span className="text-sm">{user?.displayName ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Family ID</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {family.id}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Family Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Family Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Family Name</Label>
            <Input
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
          </div>

          <Separator />

          {/* Adults */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Adults</Label>
              <Button variant="outline" size="sm" onClick={addAdult}>
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
            {adults.map((adult, i) => (
              <div key={adult.id} className="flex items-center gap-2">
                <Input
                  value={adult.name}
                  onChange={(e) => {
                    const list = [...adults]
                    list[i] = { ...list[i], name: e.target.value }
                    setAdults(list)
                  }}
                  placeholder={`Adult ${i + 1}`}
                />
                <Input
                  type="date"
                  value={adult.dateOfBirth ?? ""}
                  onChange={(e) => {
                    const list = [...adults]
                    list[i] = { ...list[i], dateOfBirth: e.target.value }
                    setAdults(list)
                  }}
                  className="w-40"
                />
                {adults.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdults(adults.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Children */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Children</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addChild(false)}>
                  <Plus className="mr-1 h-3 w-3" />
                  Child
                </Button>
                <Button variant="outline" size="sm" onClick={() => addChild(true)}>
                  <Plus className="mr-1 h-3 w-3" />
                  Planned
                </Button>
              </div>
            </div>
            {children.map((child, i) => (
              <div key={child.id} className="flex items-center gap-2">
                <Input
                  value={child.name}
                  onChange={(e) => {
                    const list = [...children]
                    list[i] = { ...list[i], name: e.target.value }
                    setChildren(list)
                  }}
                  placeholder={child.isPlanned ? "Planned child" : `Child ${i + 1}`}
                />
                <Input
                  type="date"
                  value={child.isPlanned ? child.plannedArrivalDate ?? "" : child.dateOfBirth ?? ""}
                  onChange={(e) => {
                    const list = [...children]
                    const key = child.isPlanned ? "plannedArrivalDate" : "dateOfBirth"
                    list[i] = { ...list[i], [key]: e.target.value }
                    setChildren(list)
                  }}
                  className="w-40"
                />
                {child.isPlanned && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Planned
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChildren(children.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Tax settings */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Municipality</Label>
              <Input
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={churchTax}
                onCheckedChange={setChurchTax}
              />
              <Label>Church tax</Label>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
