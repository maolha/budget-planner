import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Landmark, TrendingDown, Receipt, Percent } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { calculateTaxSimple } from "@/engine/tax/tax-engine"
import { ZURICH_MUNICIPAL_MULTIPLIERS } from "@/engine/tax/zurich-cantonal"
import { MAX_3A_EMPLOYED } from "@/engine/tax/deductions"
import { formatCHF, formatPercent } from "@/lib/formatters"

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"]
const municipalities = Object.keys(ZURICH_MUNICIPAL_MULTIPLIERS).sort()

export function TaxPage() {
  const [grossIncome, setGrossIncome] = useState(150000)
  const [filingStatus, setFilingStatus] = useState<"single" | "married">("married")
  const [numChildren, setNumChildren] = useState(1)
  const [municipality, setMunicipality] = useState("Zürich")
  const [churchTax, setChurchTax] = useState(false)
  const [pension3a, setPension3a] = useState(7056)
  const [isDualIncome, setIsDualIncome] = useState(true)
  const [lowerIncome, setLowerIncome] = useState(80000)

  const result = useMemo(
    () =>
      calculateTaxSimple(grossIncome, filingStatus, numChildren, {
        municipality,
        churchTax,
        pension3a,
        isDualIncome,
        lowerIncome,
      }),
    [grossIncome, filingStatus, numChildren, municipality, churchTax, pension3a, isDualIncome, lowerIncome]
  )

  const pieData = [
    { name: "Federal", value: result.federal },
    { name: "Cantonal", value: result.cantonal },
    { name: "Municipal", value: result.municipal },
    ...(result.church > 0 ? [{ name: "Church", value: result.church }] : []),
  ]

  // Projection: show tax at different income levels
  const projectionData = [80000, 100000, 120000, 150000, 180000, 200000, 250000].map(
    (income) => {
      const r = calculateTaxSimple(income, filingStatus, numChildren, {
        municipality,
        churchTax,
        pension3a,
        isDualIncome,
        lowerIncome: Math.min(lowerIncome, income),
      })
      return {
        income: `${income / 1000}k`,
        total: Math.round(r.total),
        rate: Math.round(r.effectiveRate * 1000) / 10,
      }
    }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Zurich Tax Calculator</h1>
        <p className="text-muted-foreground">
          Calculate your federal, cantonal, and municipal taxes based on your income and
          family status.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tax
            </CardTitle>
            <Landmark className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(result.total)}</div>
            <p className="text-xs text-muted-foreground">per year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Tax
            </CardTitle>
            <Receipt className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(result.monthlyTax)}</div>
            <p className="text-xs text-muted-foreground">per month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Effective Rate
            </CardTitle>
            <Percent className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(result.effectiveRate)}
            </div>
            <p className="text-xs text-muted-foreground">of gross income</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deductions
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(result.totalDeductions)}</div>
            <p className="text-xs text-muted-foreground">
              taxable: {formatCHF(result.taxableIncome)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tax Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Gross Annual Income (CHF)</Label>
              <Input
                type="number"
                value={grossIncome}
                onChange={(e) => setGrossIncome(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Filing Status</Label>
              <Select
                value={filingStatus}
                onValueChange={(v) => setFilingStatus(v as "single" | "married")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married / Registered Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Children</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={numChildren}
                onChange={(e) => setNumChildren(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Municipality</Label>
              <Select value={municipality} onValueChange={setMunicipality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {municipalities.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m} ({(ZURICH_MUNICIPAL_MULTIPLIERS[m] * 100).toFixed(0)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pillar 3a Contribution (CHF)</Label>
              <Input
                type="number"
                min={0}
                max={MAX_3A_EMPLOYED}
                value={pension3a}
                onChange={(e) => setPension3a(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Max: {formatCHF(MAX_3A_EMPLOYED)} for employed
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isDualIncome} onCheckedChange={setIsDualIncome} />
              <Label>Dual income household</Label>
            </div>
            {isDualIncome && filingStatus === "married" && (
              <div className="space-y-2">
                <Label>Lower Annual Income (CHF)</Label>
                <Input
                  type="number"
                  value={lowerIncome}
                  onChange={(e) => setLowerIncome(Number(e.target.value))}
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={churchTax} onCheckedChange={setChurchTax} />
              <Label>Church tax</Label>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tax breakdown pie */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCHF(Number(value), true)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <span className="text-sm">Federal</span>
                    </div>
                    <span className="font-medium">{formatCHF(result.federal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm">Cantonal</span>
                    </div>
                    <span className="font-medium">{formatCHF(result.cantonal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <span className="text-sm">Municipal ({municipality})</span>
                    </div>
                    <span className="font-medium">{formatCHF(result.municipal)}</span>
                  </div>
                  {result.church > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-sm">Church</span>
                      </div>
                      <span className="font-medium">{formatCHF(result.church)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatCHF(result.total)}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    Net after tax: {formatCHF(grossIncome - result.total)} / year
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax at different income levels */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Projection by Income Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="income" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCHF(Number(value))} />
                    <Legend />
                    <Bar dataKey="total" name="Annual Tax (CHF)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
