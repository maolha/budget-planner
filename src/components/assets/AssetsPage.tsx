import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, TrendingUp, TrendingDown, Landmark, Banknote, History } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { useAssets } from "@/hooks/useAssets"
import { calculateNetWorth } from "@/engine/net-worth/net-worth-calculator"
import { ASSET_TYPES, LIABILITY_TYPE_OPTIONS } from "@/lib/constants"
import { LIABILITY_TYPES } from "@/types/asset"
import { formatCHF, formatDate } from "@/lib/formatters"
import type { AssetType, Asset } from "@/types"

const LIABILITY_TYPE_SET = new Set<string>(LIABILITY_TYPES)

const TYPE_COLORS: Record<string, string> = {
  bank_account: "#3b82f6",
  savings_account: "#22c55e",
  investment: "#8b5cf6",
  real_estate: "#f59e0b",
  pension_2nd_pillar: "#06b6d4",
  pension_3a: "#059669",
  crypto: "#f97316",
  other_liquid: "#64748b",
  other_illiquid: "#94a3b8",
  personal_loan: "#ef4444",
  auto_loan: "#dc2626",
  student_loan: "#b91c1c",
  credit_card: "#f87171",
  other_liability: "#fca5a5",
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries([
  ...ASSET_TYPES.map((t) => [t.value, t.label]),
  ...LIABILITY_TYPE_OPTIONS.map((t) => [t.value, t.label]),
])

export function AssetsPage() {
  const { assets, loading, addAsset, updateAsset, updateAssetValue, deleteAsset } = useAssets()
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)

  // Inline add row state (assets)
  const [addingRow, setAddingRow] = useState(false)
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<AssetType>("bank_account")
  const [newValue, setNewValue] = useState(0)
  const [newInstitution, setNewInstitution] = useState("")

  // Inline add row state (liabilities)
  const [addingLiability, setAddingLiability] = useState(false)
  const [newLiabName, setNewLiabName] = useState("")
  const [newLiabType, setNewLiabType] = useState<AssetType>("personal_loan")
  const [newLiabValue, setNewLiabValue] = useState(0)
  const [newLiabInstitution, setNewLiabInstitution] = useState("")

  const netWorth = useMemo(() => calculateNetWort(assets), [assets])

  const assetItems = assets.filter((a) => !LIABILITY_TYPE_SET.has(a.type))
  const liabilityItems = assets.filter((a) => LIABILITY_TYPE_SET.has(a.type))

  const handleAddRow = async () => {
    if (!newName || !newValue) return
    await addAsset({
      name: newName,
      type: newType,
      currentValue: newValue,
      currency: "CHF",
      institution: newInstitution,
    })
    setNewName("")
    setNewType("bank_account")
    setNewValue(0)
    setNewInstitution("")
    setAddingRow(false)
  }

  const handleAddLiability = async () => {
    if (!newLiabName || !newLiabValue) return
    await addAsset({
      name: newLiabName,
      type: newLiabType,
      currentValue: newLiabValue,
      currency: "CHF",
      institution: newLiabInstitution,
    })
    setNewLiabName("")
    setNewLiabType("personal_loan")
    setNewLiabValue(0)
    setNewLiabInstitution("")
    setAddingLiability(false)
  }

  // Pie chart data
  const pieData = [
    { name: "Liquid", value: netWorth.breakdown.liquid, color: "#3b82f6" },
    { name: "Investments", value: netWorth.breakdown.investments, color: "#8b5cf6" },
    { name: "Property", value: netWorth.breakdown.property, color: "#f59e0b" },
    { name: "Pension", value: netWorth.breakdown.pension, color: "#06b6d4" },
    { name: "Crypto", value: netWorth.breakdown.crypto, color: "#f97316" },
    { name: "Other", value: netWorth.breakdown.other, color: "#94a3b8" },
  ].filter((d) => d.value > 0)

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assets & Net Worth</h1>
        <p className="text-muted-foreground">
          Edit values directly in the table. Update values over time to track performance.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
            <Landmark className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netWorth.netWorth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCHF(netWorth.netWorth)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(netWorth.totalAssets)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Liabilities</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCHF(netWorth.totalLiabilities)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash Balance</CardTitle>
            <Banknote className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(netWorth.breakdown.liquid)}</div>
            <p className="text-xs text-muted-foreground">liquid assets</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCHF(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Add assets to see allocation
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Asset table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Assets</CardTitle>
            {!addingRow && (
              <Button size="sm" onClick={() => setAddingRow(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Institution</th>
                    <th className="pb-2 font-medium text-right">Value (CHF)</th>
                    <th className="pb-2 font-medium text-right">Change</th>
                    <th className="pb-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {assetItems.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      onUpdateValue={(v) => updateAssetValue(asset.id, v)}
                      onUpdate={(data) => updateAsset(asset.id, data)}
                      onDelete={() => deleteAsset(asset.id)}
                      expanded={expandedHistory === asset.id}
                      onToggleHistory={() =>
                        setExpandedHistory(expandedHistory === asset.id ? null : asset.id)
                      }
                    />
                  ))}
                  {addingRow && (
                    <tr className="border-b bg-muted/30">
                      <td className="py-2 pr-2">
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Asset name"
                          className="h-8 text-sm"
                          autoFocus
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select value={newType} onValueChange={(v) => setNewType(v as AssetType)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSET_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          value={newInstitution}
                          onChange={(e) => setNewInstitution(e.target.value)}
                          placeholder="Institution"
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          value={newValue || ""}
                          onChange={(e) => setNewValue(Number(e.target.value))}
                          className="h-8 text-sm text-right"
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddRow() }}
                        />
                      </td>
                      <td></td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAddRow}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setAddingRow(false)}>
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {assetItems.length === 0 && !addingRow && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No assets yet. Click "Add" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
                {assetItems.length > 0 && (
                  <tfoot>
                    <tr className="border-t font-medium">
                      <td className="pt-2" colSpan={3}>Total</td>
                      <td className="pt-2 text-right">{formatCHF(netWorth.totalAssets)}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liabilities table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Liabilities
          </CardTitle>
          {!addingLiability && (
            <Button size="sm" variant="outline" onClick={() => setAddingLiability(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Liability
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Institution</th>
                  <th className="pb-2 font-medium text-right">Balance (CHF)</th>
                  <th className="pb-2 font-medium text-right">Change</th>
                  <th className="pb-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {liabilityItems.map((asset) => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    onUpdateValue={(v) => updateAssetValue(asset.id, v)}
                    onUpdate={(data) => updateAsset(asset.id, data)}
                    onDelete={() => deleteAsset(asset.id)}
                    expanded={expandedHistory === asset.id}
                    onToggleHistory={() =>
                      setExpandedHistory(expandedHistory === asset.id ? null : asset.id)
                    }
                  />
                ))}
                {addingLiability && (
                  <tr className="border-b bg-muted/30">
                    <td className="py-2 pr-2">
                      <Input
                        value={newLiabName}
                        onChange={(e) => setNewLiabName(e.target.value)}
                        placeholder="e.g. Car Loan"
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Select value={newLiabType} onValueChange={(v) => setNewLiabType(v as AssetType)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LIABILITY_TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={newLiabInstitution}
                        onChange={(e) => setNewLiabInstitution(e.target.value)}
                        placeholder="Lender"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        value={newLiabValue || ""}
                        onChange={(e) => setNewLiabValue(Number(e.target.value))}
                        className="h-8 text-sm text-right"
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddLiability() }}
                      />
                    </td>
                    <td></td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAddLiability}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setAddingLiability(false)}>
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
                {liabilityItems.length === 0 && !addingLiability && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No liabilities. Click "Add Liability" to track loans, credit cards, etc.
                    </td>
                  </tr>
                )}
              </tbody>
              {liabilityItems.length > 0 && (
                <tfoot>
                  <tr className="border-t font-medium text-red-600">
                    <td className="pt-2" colSpan={3}>Total Liabilities</td>
                    <td className="pt-2 text-right">{formatCHF(netWorth.totalLiabilities)}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AssetRow({
  asset,
  onUpdateValue,
  onUpdate,
  onDelete,
  expanded,
  onToggleHistory,
}: {
  asset: Asset
  onUpdateValue: (v: number) => void
  onUpdate: (data: Partial<Asset>) => void
  onDelete: () => void
  expanded: boolean
  onToggleHistory: () => void
}) {
  const [editingValue, setEditingValue] = useState(false)
  const [draftValue, setDraftValue] = useState(asset.currentValue)

  const history = asset.valueHistory ?? []
  const prevEntry = history.length >= 2 ? history[history.length - 2] : null
  const change = prevEntry ? asset.currentValue - prevEntry.value : null
  const changePercent = prevEntry && prevEntry.value > 0
    ? ((asset.currentValue - prevEntry.value) / prevEntry.value) * 100
    : null

  return (
    <>
      <tr className="border-b hover:bg-muted/30">
        <td className="py-2 pr-2">
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: TYPE_COLORS[asset.type] ?? "#94a3b8" }}
            />
            <span className="font-medium">{asset.name}</span>
          </div>
        </td>
        <td className="py-2 pr-2 text-muted-foreground">
          {TYPE_LABELS[asset.type] ?? asset.type}
        </td>
        <td className="py-2 pr-2 text-muted-foreground">
          {asset.institution ?? "—"}
        </td>
        <td className="py-2 pr-2 text-right">
          {editingValue ? (
            <Input
              type="number"
              value={draftValue || ""}
              onChange={(e) => setDraftValue(Number(e.target.value))}
              className="h-7 w-28 text-sm text-right ml-auto"
              autoFocus
              onBlur={() => {
                if (draftValue !== asset.currentValue) onUpdateValue(draftValue)
                setEditingValue(false)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (draftValue !== asset.currentValue) onUpdateValue(draftValue)
                  setEditingValue(false)
                }
                if (e.key === "Escape") setEditingValue(false)
              }}
            />
          ) : (
            <button
              className="font-medium hover:underline cursor-pointer"
              onClick={() => { setDraftValue(asset.currentValue); setEditingValue(true) }}
              title="Click to update value"
            >
              {formatCHF(asset.currentValue)}
            </button>
          )}
        </td>
        <td className="py-2 pr-2 text-right">
          {change !== null ? (
            <span className={`text-xs ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
              {change >= 0 ? "+" : ""}{formatCHF(change)}
              {changePercent !== null && ` (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%)`}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2">
          <div className="flex gap-1 justify-end">
            {history.length > 1 && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleHistory} title="Value history">
                <History className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && history.length > 1 && (
        <tr>
          <td colSpan={6} className="pb-3 pl-6">
            <div className="rounded border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Value History</p>
              <div className="space-y-1">
                {[...history].reverse().map((entry, i) => {
                  const prev = i < history.length - 1 ? [...history].reverse()[i + 1] : null
                  const diff = prev ? entry.value - prev.value : null
                  return (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{formatDate(entry.date, "dd MMM yyyy")}</span>
                      <div className="flex gap-3">
                        <span>{formatCHF(entry.value)}</span>
                        {diff !== null && (
                          <span className={diff >= 0 ? "text-green-600" : "text-red-600"}>
                            {diff >= 0 ? "+" : ""}{formatCHF(diff)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function calculateNetWort(assets: Asset[]) {
  return calculateNetWorth(assets)
}
