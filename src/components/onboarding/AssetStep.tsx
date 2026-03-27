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
import { ASSET_TYPES } from "@/lib/constants"
import type { AssetType } from "@/types"

export interface AssetEntry {
  id: string
  name: string
  type: AssetType
  currentValue: number
  institution: string
  mortgageBalance?: number
}

interface AssetStepProps {
  assets: AssetEntry[]
  onUpdate: (assets: AssetEntry[]) => void
}

export function AssetStep({ assets, onUpdate }: AssetStepProps) {
  const addAsset = () => {
    onUpdate([
      ...assets,
      {
        id: uuid(),
        name: "",
        type: "bank_account",
        currentValue: 0,
        institution: "",
      },
    ])
  }

  const updateAsset = (index: number, updates: Partial<AssetEntry>) => {
    const list = [...assets]
    list[index] = { ...list[index], ...updates }
    onUpdate(list)
  }

  const removeAsset = (index: number) => {
    const list = [...assets]
    list.splice(index, 1)
    onUpdate(list)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Assets & Net Worth</h2>
        <p className="text-sm text-muted-foreground">
          Add your current assets to track your net worth. Include bank accounts,
          investments, property, pension, and crypto. You can add more detail later.
        </p>
      </div>

      {assets.map((asset, i) => (
        <Card key={asset.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">
              {asset.name || `Asset ${i + 1}`}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => removeAsset(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Asset Name</Label>
                <Input
                  placeholder="e.g. UBS Savings Account"
                  value={asset.name}
                  onChange={(e) => updateAsset(i, { name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={asset.type}
                  onValueChange={(val) => updateAsset(i, { type: val as AssetType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Current Value (CHF)</Label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={asset.currentValue || ""}
                  onChange={(e) =>
                    updateAsset(i, { currentValue: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Institution</Label>
                <Input
                  placeholder="e.g. UBS, ZKB, Swissquote"
                  value={asset.institution}
                  onChange={(e) => updateAsset(i, { institution: e.target.value })}
                />
              </div>
            </div>
            {asset.type === "real_estate" && (
              <div className="space-y-2">
                <Label>Mortgage Balance (CHF)</Label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={asset.mortgageBalance || ""}
                  onChange={(e) =>
                    updateAsset(i, { mortgageBalance: Number(e.target.value) })
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addAsset} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Asset
      </Button>

      {assets.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          You can skip this step and add assets later.
        </p>
      )}
    </div>
  )
}
