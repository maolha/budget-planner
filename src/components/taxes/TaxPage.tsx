import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Landmark, TrendingDown, Percent, Wallet } from "lucide-react"
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
import { MAX_3A_EMPLOYED } from "@/engine/tax/deductions"
import { formatCHF, formatPercent } from "@/lib/formatters"
import { useIncome } from "@/hooks/useIncome"
import { useFamily } from "@/hooks/useFamily"

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"]

export function TaxPage() {
  const { family } = useFamily()
  const { incomes, totalAnnualGross } = useIncome()

  const numAdults = family?.adults.length ?? 2
  const numChildren = family?.children.filter((c) => !c.isPlanned).length ?? 0
  const derivedFilingStatus = numAdults >= 2 ? "married" as const : "single" as const
  const derivedMunicipality = family?.municipality ?? "Zürich"
  const derivedChurchTax = family?.churchTax ?? false

  // Per-member income
  const incomeByMember: Record<string, number> = {}
  for (const inc of incomes) {
    if (!inc.endDate && !inc.isProjection) {
      incomeByMember[inc.memberId] = (incomeByMember[inc.memberId] ?? 0) + inc.annualGross + (inc.bonus ?? 0)
    }
  }
  const memberIncomes = Object.values(incomeByMember).sort((a, b) => b - a)
  const isDualIncome = memberIncomes.length >= 2 && memberIncomes[1] > 0
  const lowerIncomeDefault = memberIncomes[1] ?? 0

  // Editable fields
  const [grossOverride, setGrossOverride] = useState<number | null>(null)
  const [pension3a, setPension3a] = useState(MAX_3A_EMPLOYED * numAdults)
  const [lowerIncomeOverride, setLowerIncomeOverride] = useState<number | null>(null)
  const [childAllowance, setChildAllowance] = useState(numChildren * 200 * 12) // CHF 200/child/month
  const [otherDeductions, setOtherDeductions] = useState(0)

  const grossIncome = grossOverride ?? totalAnnualGross
  const lowerIncome = lowerIncomeOverride ?? lowerIncomeDefault

  const result = useMemo(
    () =>
      calculateTaxSimple(grossIncome, derivedFilingStatus, numChildren, {
        municipality: derivedMunicipality,
        churchTax: derivedChurchTax,
        pension3a,
        isDualIncome,
        lowerIncome,
      }),
    [grossIncome, derivedFilingStatus, numChildren, derivedMunicipality, derivedChurchTax, pension3a, isDualIncome, lowerIncome]
  )

  const pieData = [
    { name: "Federal", value: result.federal },
    { name: "Cantonal", value: result.cantonal },
    { name: "Municipal", value: result.municipal },
    ...(result.church > 0 ? [{ name: "Church", value: result.church }] : []),
  ]

  const baseIncome = grossIncome || 150000
  const projectionData = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((mult) => {
    const income = Math.round(baseIncome * mult)
    const r = calculateTaxSimple(income, derivedFilingStatus, numChildren, {
      municipality: derivedMunicipality,
      churchTax: derivedChurchTax,
      pension3a,
      isDualIncome,
      lowerIncome: Math.round(lowerIncome * mult),
    })
    return {
      income: `${(income / 1000).toFixed(0)}k`,
      total: Math.round(r.total),
    }
  })

  const memberBreakdown = family?.adults.map((adult) => ({
    name: adult.name,
    annualGross: incomeByMember[adult.id] ?? 0,
  })) ?? []

  // Net income after tax and child allowance
  const netAfterTax = grossIncome - result.total + childAllowance

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tax Calculator</h1>
        <p className="text-muted-foreground">
          Based on your income records.
          {family && ` ${derivedFilingStatus === "married" ? "Married" : "Single"} filing in ${derivedMunicipality}.`}
        </p>
      </div>

      {/* Income + tax summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {memberBreakdown.map((m) => (
          <Card key={m.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.name}</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCHF(m.annualGross)}</div>
              <p className="text-xs text-muted-foreground">{formatCHF(Math.round(m.annualGross / 12))}/mo</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tax</CardTitle>
            <Landmark className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCHF(result.total)}</div>
            <p className="text-xs text-muted-foreground">{formatCHF(result.monthlyTax)}/mo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rate</CardTitle>
            <Percent className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatPercent(result.effectiveRate)}</div>
            <p className="text-xs text-muted-foreground">effective</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Income</CardTitle>
            <TrendingDown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCHF(netAfterTax)}</div>
            <p className="text-xs text-muted-foreground">{formatCHF(Math.round(netAfterTax / 12))}/mo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Adjustments */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Income & Deductions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Gross Income</Label>
                {grossOverride !== null && (
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => setGrossOverride(null)}
                  >
                    Reset
                  </button>
                )}
              </div>
              <Input
                type="number"
                value={grossOverride ?? totalAnnualGross}
                onChange={(e) => setGrossOverride(Number(e.target.value))}
                className="h-8"
              />
              {grossOverride === null && (
                <p className="text-xs text-muted-foreground">From your income records</p>
              )}
            </div>

            {isDualIncome && derivedFilingStatus === "married" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Lower Income (for deduction)</Label>
                  {lowerIncomeOverride !== null && (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setLowerIncomeOverride(null)}
                    >
                      Reset
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  value={lowerIncomeOverride ?? lowerIncomeDefault}
                  onChange={(e) => setLowerIncomeOverride(Number(e.target.value))}
                  className="h-8"
                />
              </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deductions</p>

              <div className="space-y-1">
                <Label className="text-sm">Pillar 3a (CHF/year)</Label>
                <Input
                  type="number"
                  value={pension3a}
                  onChange={(e) => setPension3a(Number(e.target.value))}
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  Max {formatCHF(MAX_3A_EMPLOYED)}/person × {numAdults}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Kinderzulage (child allowance)</Label>
                <Input
                  type="number"
                  value={childAllowance}
                  onChange={(e) => setChildAllowance(Number(e.target.value))}
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  ~CHF 200–300/child/month (not taxed, added to net)
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Other deductions</Label>
                <Input
                  type="number"
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(Number(e.target.value))}
                  placeholder="0"
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  Charitable donations, further education, etc.
                </p>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxable income</span>
                <span className="font-medium">{formatCHF(result.taxableIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total deductions</span>
                <span>{formatCHF(result.totalDeductions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Church tax</span>
                <span>{derivedChurchTax ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{numChildren} children</span>
                <span>{derivedFilingStatus}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="space-y-6 lg:col-span-2">
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
                      <Tooltip formatter={(value) => formatCHF(Number(value), true)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Federal", value: result.federal, color: "bg-blue-500" },
                    { label: "Cantonal", value: result.cantonal, color: "bg-green-500" },
                    { label: `Municipal (${derivedMunicipality})`, value: result.municipal, color: "bg-amber-500" },
                    ...(result.church > 0 ? [{ label: "Church", value: result.church, color: "bg-red-500" }] : []),
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${item.color}`} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="font-medium">{formatCHF(item.value)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCHF(result.total)}</span>
                  </div>
                  <Badge variant="secondary">
                    Net: {formatCHF(netAfterTax)}/year · {formatCHF(Math.round(netAfterTax / 12))}/month
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax at Different Income Levels</CardTitle>
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
