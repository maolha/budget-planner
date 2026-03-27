import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, ArrowDownUp, PiggyBank, TrendingUp, Landmark, AlertCircle, Loader2 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { useIncome } from "@/hooks/useIncome"
import { useExpenses } from "@/hooks/useExpenses"
import { useAssets } from "@/hooks/useAssets"
import { useFamily } from "@/hooks/useFamily"
import { calculateTaxSimple } from "@/engine/tax/tax-engine"
import { calculateNetWorth } from "@/engine/net-worth/net-worth-calculator"
import { formatCHF, formatPercent } from "@/lib/formatters"

export function DashboardPage() {
  const { totalAnnualGross, incomes, loading: incomeLoading, error: incomeError } = useIncome()
  const { expenses, categories, totalMonthlyExpenses, loading: expenseLoading, error: expenseError } = useExpenses()
  const { assets, loading: assetLoading, error: assetError } = useAssets()
  const { family, loading: familyLoading } = useFamily()

  const isLoading = incomeLoading || expenseLoading || assetLoading || familyLoading
  const errors = [incomeError, expenseError, assetError].filter(Boolean)

  const numChildren = family?.children?.filter((c) => !c.isPlanned).length ?? 0
  const numAdults = family?.adults?.length ?? 2
  const filingStatus = numAdults >= 2 ? ("married" as const) : ("single" as const)

  const taxResult = useMemo(
    () =>
      calculateTaxSimple(totalAnnualGross, filingStatus, numChildren, {
        municipality: family?.municipality ?? "Zürich",
        churchTax: family?.churchTax ?? false,
      }),
    [totalAnnualGross, filingStatus, numChildren, family?.municipality, family?.churchTax]
  )

  const monthlyNetIncome = Math.round((totalAnnualGross - taxResult.total) / 12)
  const netWorth = useMemo(() => calculateNetWorth(assets), [assets])

  // Budget-based monthly expenses (sum of all category budgets); fall back to actual spend
  const totalMonthlyBudget = categories.reduce((s, c) => s + Number(c.monthlyBudget ?? 0), 0)
  const effectiveMonthlyExpenses = totalMonthlyBudget > 0 ? totalMonthlyBudget : totalMonthlyExpenses

  const monthlySavings = monthlyNetIncome - effectiveMonthlyExpenses
  const savingsRate = monthlyNetIncome > 0 ? monthlySavings / monthlyNetIncome : 0

  // Spending by category (this month)
  const now = new Date()
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const monthlyByCategory = categories
    .map((cat) => {
      const total = expenses
        .filter((e) => e.categoryId === cat.id && e.date.substring(0, 7) === currentYM)
        .reduce((s, e) => s + e.amount, 0)
      return { name: cat.name, value: total, color: cat.color }
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // Monthly spending trend (last 6 months)
  const spendingTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const total = expenses
      .filter((e) => e.date.substring(0, 7) === ym)
      .reduce((s, e) => s + e.amount, 0)
    return { month: ym, expenses: total, income: monthlyNetIncome }
  })

  // Top 5 expenses this month
  const topExpenses = monthlyByCategory.slice(0, 5)

  // 24-month outlook
  const outlook24m = useMemo(() => {
    const data: Array<{ month: string; netWorth: number; income: number; expenses: number; savings: number }> = []
    let nw = netWorth.netWorth
    for (let i = 0; i < 24; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() + i)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const savings = monthlyNetIncome - effectiveMonthlyExpenses
      nw += savings
      data.push({
        month: ym,
        netWorth: Math.round(nw),
        income: monthlyNetIncome,
        expenses: effectiveMonthlyExpenses,
        savings: Math.round(savings),
      })
    }
    return data
  }, [monthlyNetIncome, effectiveMonthlyExpenses, netWorth.netWorth])

  const hasData = incomes.length > 0 || expenses.length > 0 || assets.length > 0

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {family?.name
            ? `${family.name}'s financial overview`
            : "Your family's financial overview at a glance."}
        </p>
      </div>

      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Failed to load data</p>
              <p className="text-sm text-muted-foreground">{errors.join("; ")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Income
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(monthlyNetIncome)}</div>
            <p className="text-xs text-muted-foreground">net after tax</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Expenses
            </CardTitle>
            <ArrowDownUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(effectiveMonthlyExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {totalMonthlyBudget > 0 && totalMonthlyExpenses === 0 ? "monthly budget" : "this month"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Savings
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlySavings >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCHF(monthlySavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercent(savingsRate)} savings rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Worth
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(netWorth.netWorth)}</div>
            <p className="text-xs text-muted-foreground">{assets.length} assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Tax
            </CardTitle>
            <Landmark className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(taxResult.monthlyTax)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercent(taxResult.effectiveRate)} effective
            </p>
          </CardContent>
        </Card>
      </div>

      {!hasData && (
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-lg font-semibold">Welcome to Budget Planner</h2>
            <p className="mt-2 text-muted-foreground">
              Start by adding your income sources, expenses, and assets. Use the sidebar to
              navigate to each section, or complete the onboarding wizard from Settings.
            </p>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Income vs Expenses trend */}
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendingTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCHF(Number(v))} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Spending by category */}
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {monthlyByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={monthlyByCategory}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${(name ?? "").substring(0, 10)} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {monthlyByCategory.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCHF(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No expenses this month
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Top Expenses This Month</CardTitle>
            </CardHeader>
            <CardContent>
              {topExpenses.length > 0 ? (
                <div className="space-y-3">
                  {topExpenses.map((exp) => (
                    <div key={exp.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: exp.color }}
                        />
                        <span className="text-sm">{exp.name}</span>
                      </div>
                      <span className="font-medium">{formatCHF(exp.value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No expenses recorded this month.</p>
              )}
            </CardContent>
          </Card>

          {/* Net worth breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Net Worth Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Liquid Assets", value: netWorth.breakdown.liquid, color: "#3b82f6" },
                  { label: "Investments", value: netWorth.breakdown.investments, color: "#8b5cf6" },
                  { label: "Property", value: netWorth.breakdown.property, color: "#f59e0b" },
                  { label: "Pension", value: netWorth.breakdown.pension, color: "#06b6d4" },
                  { label: "Crypto", value: netWorth.breakdown.crypto, color: "#f97316" },
                ].filter((d) => d.value > 0).map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <span className="font-medium">{formatCHF(item.value)}</span>
                  </div>
                ))}
                {netWorth.totalLiabilities > 0 && (
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-sm text-red-600">Liabilities</span>
                    <span className="font-medium text-red-600">
                      -{formatCHF(netWorth.totalLiabilities)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-2 font-semibold">
                  <span>Net Worth</span>
                  <span>{formatCHF(netWorth.netWorth)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 24-month outlook */}
      {monthlyNetIncome > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>24-Month Outlook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={outlook24m}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCHF(Number(v))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    name="Net Worth"
                    fill="#3b82f630"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Monthly Income"
                    fill="#22c55e20"
                    stroke="#22c55e"
                    strokeWidth={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Monthly Expenses"
                    fill="#ef444420"
                    stroke="#ef4444"
                    strokeWidth={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-muted-foreground">Monthly Savings</p>
                <p className={`font-semibold ${monthlySavings >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCHF(monthlyNetIncome - effectiveMonthlyExpenses)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Worth in 12m</p>
                <p className="font-semibold">{formatCHF(outlook24m[11]?.netWorth ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Worth in 24m</p>
                <p className="font-semibold">{formatCHF(outlook24m[23]?.netWorth ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
