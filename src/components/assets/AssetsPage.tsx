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
import { Plus, Trash2, TrendingUp, TrendingDown, Landmark, Banknote, History, ArrowUpDown } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { useAssets } from "@/hooks/useAssets"
import { useFamily } from "@/hooks/useFamily"
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
  const { assets, loading, addAsset, updateAsset, updateAssetValue, addHistoricValue, deleteHistoricValue, deleteAsset } = useAssets()
  const { family } = useFamily()
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<"name" | "type" | "owner" | "institution" | "value">("name")
  const [sortAsc, setSortAsc] = useState(true)

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  // Build owner options from family members
  const ownerOptions = useMemo(() => {
    const opts: Array<{ id: string; label: string }> = [{ id: "family", label: "Family (joint)" }]
    for (const adult of family?.adults ?? []) {
      opts.push({ id: adult.id, label: adult.name || "Unnamed" })
    }
    for (const child of family?.children ?? []) {
      if (!child.isPlanned) {
        opts.push({ id: child.id, label: child.name || "Unnamed" })
      }
    }
    return opts
  }, [family?.adults, family?.children])

  // Inline add row state (assets)
  const [addingRow, setAddingRow] = useState(false)
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<AssetType>("bank_account")
  const [newValue, setNewValue] = useState(0)
  const [newInstitution, setNewInstitution] = useState("")
  const [newOwner, setNewOwner] = useState("family")

  // Inline add row state (liabilities)
  const [addingLiability, setAddingLiability] = useState(false)
  const [newLiabName, setNewLiabName] = useState("")
  const [newLiabType, setNewLiabType] = useState<AssetType>("personal_loan")
  const [newLiabValue, setNewLiabValue] = useState(0)
  const [newLiabInstitution, setNewLiabInstitution] = useState("")
  const [newLiabOwner, setNewLiabOwner] = useState("family")

  const netWorth = useMemo(() => calculateNetWorth(assets), [assets])

  const getOwnerLabel = (a: Asset) => {
    const opt = ownerOptions.find((o) => o.id === (a.ownerId ?? "family"))
    return opt?.label ?? "Family"
  }

  const sortItems = (items: Asset[]) => {
    const sorted = [...items].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break
        case "type": cmp = (TYPE_LABELS[a.type] ?? "").localeCompare(TYPE_LABELS[b.type] ?? ""); break
        case "owner": cmp = getOwnerLabel(a).localeCompare(getOwnerLabel(b)); break
        case "institution": cmp = (a.institution ?? "").localeCompare(b.institution ?? ""); break
        case "value": cmp = a.currentValue - b.currentValue; break
      }
      return sortAsc ? cmp : -cmp
    })
    return sorted
  }

  const assetItems = sortItems(assets.filter((a) => !LIABILITY_TYPE_SET.has(a.type)))
  const liabilityItems = sortItems(assets.filter((a) => LIABILITY_TYPE_SET.has(a.type)))

  const handleAddRow = async () => {
    if (!newName || !newValue) return
    await addAsset({
      name: newName,
      type: newType,
      currentValue: newValue,
      currency: "CHF",
      institution: newInstitution,
      ownerId: newOwner,
    })
    setNewName("")
    setNewType("bank_account")
    setNewValue(0)
    setNewInstitution("")
    setNewOwner("family")
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
      ownerId: newLiabOwner,
    })
    setNewLiabName("")
    setNewLiabType("personal_loan")
    setNewLiabValue(0)
    setNewLiabInstitution("")
    setNewLiabOwner("family")
    setAddingLiability(false)
  }

  // Pie chart data
  const pieData = [
    { name: "Liquid", value: netWorth.breakdown.liquid, color: "#3b82f6" },
    { name: "Investments", value: netWorth.breakdown.investments, color: "#8b5cf6" },
    { name: "Property", value: netWorth.breakdown.property, color: "#f59e0b" },
    { name: "Pension (BVG)", value: netWorth.breakdown.pension2ndPillar, color: "#06b6d4" },
    { name: "Pension (3a)", value: netWorth.breakdown.pension3a, color: "#059669" },
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
                    {([["name", "Name"], ["type", "Type"], ["owner", "Owner"], ["institution", "Institution"]] as const).map(([key, label]) => (
                      <th key={key} className="pb-2 font-medium cursor-pointer select-none hover:text-foreground" onClick={() => handleSort(key)}>
                        <span className="inline-flex items-center gap-1">{label}{sortKey === key && <ArrowUpDown className="h-3 w-3" />}</span>
                      </th>
                    ))}
                    <th className="pb-2 font-medium text-right cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("value")}>
                      <span className="inline-flex items-center gap-1 justify-end">Value (CHF){sortKey === "value" && <ArrowUpDown className="h-3 w-3" />}</span>
                    </th>
                    <th className="pb-2 font-medium text-right">Change</th>
                    <th className="pb-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {assetItems.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      ownerOptions={ownerOptions}
                      onUpdateValue={(v) => updateAssetValue(asset.id, v)}
                      onUpdateOwner={(ownerId) => updateAsset(asset.id, { ownerId })}
                      onAddHistoric={(date, value) => addHistoricValue(asset.id, date, value)}
                      onDeleteHistoric={(idx) => deleteHistoricValue(asset.id, idx)}
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
                        <Select value={newOwner} onValueChange={setNewOwner}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ownerOptions.map((o) => (
                              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
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
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No assets yet. Click "Add" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
                {assetItems.length > 0 && (
                  <tfoot>
                    <tr className="border-t font-medium">
                      <td className="pt-2" colSpan={4}>Total</td>
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
                  <th className="pb-2 font-medium">Owner</th>
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
                    ownerOptions={ownerOptions}
                    onUpdateValue={(v) => updateAssetValue(asset.id, v)}
                    onUpdateOwner={(ownerId) => updateAsset(asset.id, { ownerId })}
                    onAddHistoric={(date, value) => addHistoricValue(asset.id, date, value)}
                    onDeleteHistoric={(idx) => deleteHistoricValue(asset.id, idx)}
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
                      <Select value={newLiabOwner} onValueChange={setNewLiabOwner}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ownerOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
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
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      No liabilities. Click "Add Liability" to track loans, credit cards, etc.
                    </td>
                  </tr>
                )}
              </tbody>
              {liabilityItems.length > 0 && (
                <tfoot>
                  <tr className="border-t font-medium text-red-600">
                    <td className="pt-2" colSpan={4}>Total Liabilities</td>
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
  ownerOptions,
  onUpdateValue,
  onUpdateOwner,
  onAddHistoric,
  onDeleteHistoric,
  onDelete,
  expanded,
  onToggleHistory,
}: {
  asset: Asset
  ownerOptions: Array<{ id: string; label: string }>
  onUpdateValue: (v: number) => void
  onUpdateOwner: (ownerId: string) => void
  onAddHistoric: (date: string, value: number) => void
  onDeleteHistoric: (index: number) => void
  onDelete: () => void
  expanded: boolean
  onToggleHistory: () => void
}) {
  const [editingValue, setEditingValue] = useState(false)
  const [draftValue, setDraftValue] = useState(asset.currentValue)
  const [addingHistoric, setAddingHistoric] = useState(false)
  const [historicDate, setHistoricDate] = useState("")
  const [historicValue, setHistoricValue] = useState(0)

  const history = asset.valueHistory ?? []
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const prevEntry = sorted.length >= 2 ? sorted[sorted.length - 2] : null
  const change = prevEntry ? asset.currentValue - prevEntry.value : null
  const changePercent = prevEntry && prevEntry.value > 0
    ? ((asset.currentValue - prevEntry.value) / prevEntry.value) * 100
    : null

  const handleAddHistoric = () => {
    if (!historicDate || !historicValue) return
    onAddHistoric(historicDate, historicValue)
    setHistoricDate("")
    setHistoricValue(0)
    setAddingHistoric(false)
  }

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
        <td className="py-2 pr-2">
          <Select value={asset.ownerId ?? "family"} onValueChange={onUpdateOwner}>
            <SelectTrigger className="h-7 text-xs border-none shadow-none px-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ownerOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                if (e.key === "Escape") { setDraftValue(asset.currentValue); setEditingValue(false) }
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleHistory} title="Value history">
              <History className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="pb-3 pl-6">
            <div className="rounded border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Value History ({sorted.length} entries)</p>
                {!addingHistoric && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAddingHistoric(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Historic Value
                  </Button>
                )}
              </div>
              {addingHistoric && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                  <Input
                    type="date"
                    value={historicDate}
                    onChange={(e) => setHistoricDate(e.target.value)}
                    className="h-7 w-36 text-xs"
                    autoFocus
                  />
                  <Input
                    type="number"
                    value={historicValue || ""}
                    onChange={(e) => setHistoricValue(Number(e.target.value))}
                    placeholder="Value"
                    className="h-7 w-28 text-xs text-right"
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddHistoric() }}
                  />
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleAddHistoric}>Save</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setAddingHistoric(false)}>Cancel</Button>
                </div>
              )}
              <div className="space-y-1">
                {[...sorted].reverse().map((entry, i) => {
                  const origIndex = sorted.length - 1 - i
                  const prevIdx = i < sorted.length - 1 ? [...sorted].reverse()[i + 1] : null
                  const diff = prevIdx ? entry.value - prevIdx.value : null
                  return (
                    <div key={i} className="flex items-center justify-between text-xs group">
                      <span className="text-muted-foreground">{formatDate(entry.date, "dd MMM yyyy")}</span>
                      <div className="flex items-center gap-3">
                        <span>{formatCHF(entry.value)}</span>
                        {diff !== null && (
                          <span className={`w-20 text-right ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {diff >= 0 ? "+" : ""}{formatCHF(diff)}
                          </span>
                        )}
                        {sorted.length > 1 && (
                          <button
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80"
                            onClick={() => onDeleteHistoric(origIndex)}
                            title="Remove this entry"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
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
