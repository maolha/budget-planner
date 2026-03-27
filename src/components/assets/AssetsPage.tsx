import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, TrendingUp, TrendingDown, Landmark, PiggyBank, Check, X } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { useAssets } from "@/hooks/useAssets"
import { calculateNetWorth } from "@/engine/net-worth/net-worth-calculator"
import { ASSET_TYPES } from "@/lib/constants"
import { formatCHF } from "@/lib/formatters"
import type { AssetType } from "@/types"

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
}

function EditableValue({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <button
        className="font-medium hover:underline cursor-pointer"
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        {formatCHF(value)}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={draft || ""}
        onChange={(e) => setDraft(Number(e.target.value))}
        className="h-7 w-28 text-sm text-right"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false) }
          if (e.key === "Escape") setEditing(false)
        }}
      />
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { onSave(draft); setEditing(false) }}>
        <Check className="h-3 w-3 text-green-600" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(false)}>
        <X className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  )
}

export function AssetsPage() {
  const { assets, loading, addAsset, updateAssetValue, deleteAsset } = useAssets()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [type, setType] = useState<AssetType>("bank_account")
  const [currentValue, setCurrentValue] = useState(0)
  const [institution, setInstitution] = useState("")
  const [mortgageBalance, setMortgageBalance] = useState(0)
  const [mortgageRate, setMortgageRate] = useState(0)
  const [annualReturnRate, setAnnualReturnRate] = useState(0)

  const netWorth = useMemo(() => calculateNetWorth(assets), [assets])

  const resetForm = () => {
    setName("")
    setType("bank_account")
    setCurrentValue(0)
    setInstitution("")
    setMortgageBalance(0)
    setMortgageRate(0)
    setAnnualReturnRate(0)
  }

  const handleAdd = async () => {
    await addAsset({
      name,
      type,
      currentValue,
      currency: "CHF",
      institution,
      ...(type === "real_estate" && { mortgageBalance, mortgageRate }),
      ...(type === "investment" && { annualReturnRate }),
    })
    setDialogOpen(false)
    resetForm()
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

  // Balance sheet data for bar chart
  const balanceData = [
    { name: "Assets", value: netWorth.totalAssets },
    { name: "Liabilities", value: -netWorth.totalLiabilities },
    { name: "Net Worth", value: netWorth.netWorth },
  ]

  // Group assets by type
  const grouped = ASSET_TYPES.reduce(
    (acc, t) => {
      const items = assets.filter((a) => a.type === t.value)
      if (items.length > 0) acc.push({ label: t.label, type: t.value, items })
      return acc
    },
    [] as Array<{ label: string; type: string; items: typeof assets }>
  )

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets & Net Worth</h1>
          <p className="text-muted-foreground">
            Track your complete financial picture. Click any value to update it.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. UBS Savings"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as AssetType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                    value={currentValue || ""}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Input
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. UBS, ZKB"
                  />
                </div>
              </div>
              {type === "real_estate" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mortgage Balance (CHF)</Label>
                    <Input
                      type="number"
                      value={mortgageBalance || ""}
                      onChange={(e) => setMortgageBalance(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mortgage Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={mortgageRate || ""}
                      onChange={(e) => setMortgageRate(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
              {type === "investment" && (
                <div className="space-y-2">
                  <Label>Expected Annual Return (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={annualReturnRate || ""}
                    onChange={(e) => setAnnualReturnRate(Number(e.target.value))}
                  />
                </div>
              )}
              <Button onClick={handleAdd} className="w-full">
                Add Asset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Worth
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assets
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(netWorth.totalAssets)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Liabilities
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCHF(netWorth.totalLiabilities)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Balance
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(netWorth.breakdown.liquid)}</div>
            <p className="text-xs text-muted-foreground">liquid assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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

        <Card>
          <CardHeader>
            <CardTitle>Balance Sheet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={balanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v) => formatCHF(Math.abs(Number(v)))} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {balanceData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.value >= 0 ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset list grouped by type — inline editable values */}
      {grouped.map((group) => (
        <Card key={group.type}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[group.type] }}
              />
              {group.label}
              <Badge variant="secondary" className="ml-auto">
                {formatCHF(group.items.reduce((s, a) => s + a.currentValue, 0))}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {group.items.map((asset) => {
                const history = asset.valueHistory ?? []
                const prevEntry = history.length >= 2 ? history[history.length - 2] : null
                const change = prevEntry ? asset.currentValue - prevEntry.value : null
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.institution}
                        {asset.mortgageBalance
                          ? ` · Mortgage: ${formatCHF(asset.mortgageBalance)}`
                          : ""}
                        {asset.annualReturnRate
                          ? ` · Return: ${asset.annualReturnRate}%`
                          : ""}
                        {history.length > 1 && ` · ${history.length} updates`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <EditableValue
                          value={asset.currentValue}
                          onSave={(v) => updateAssetValue(asset.id, v)}
                        />
                        {change !== null && (
                          <p className={`text-xs ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {change >= 0 ? "+" : ""}{formatCHF(change)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteAsset(asset.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {assets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No assets yet. Add your bank accounts, investments, and property to track your
            net worth.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
