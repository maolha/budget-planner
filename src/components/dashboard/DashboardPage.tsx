import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowDownUp, PiggyBank, TrendingUp, Landmark, AlertCircle, Loader2, Banknote } from "lucide-react"
import {
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
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
} from "recharts"
import { useIncome } from "@/hooks/useIncome"
import { useExpenses } from "@/hooks/useExpenses"
import { useAssets } from "@/hooks/useAssets"
import { useFamily } from "@/hooks/useFamily"
import { calculateTaxSimple } from "@/engine/tax/tax-engine"
import { calculateNetWorth } from "@/engine/net-worth/net-worth-calculator"
import { calculateTotalSocialDeductions } from "@/engine/social/swiss-social-deductions"
import { useUIStore } from "@/store"
import { formatCHF, formatPercent, formatAxisCHF } from "@/lib/formatters"

export function DashboardPage() {
  const { includeBonus, toggleIncludeBonus } = useUIStore()
  const { totalAnnualGross, totalAnnualBase, totalAnnualBonus, incomes, incomeTimeline, loading: incomeLoading, error: incomeError } = useIncome()
  const { expenses, categories, totalMonthlyExpenses, totalMonthlyBudget, loading: expenseLoading, error: expenseError } = useExpenses()
  const { assets, loading: assetLoading, error: assetError } = useAssets()
  const { family, loading: familyLoading } = useFamily()

  const isLoading = incomeLoading || expenseLoading || assetLoading || familyLoading
  const errors = [incomeError, expenseError, assetError].filter(Boolean)

  const numChildren = family?.children?.filter((c) => !c.isPlanned).length ?? 0
  const numAdults = family?.adults?.length ?? 2
  const filingStatus = numAdults >= 2 ? ("married" as const) : ("single" as const)

  // Social deductions (AHV/IV/EO, ALV, BVG, NBU)
  const socialDeductions = useMemo(() => {
    const now = new Date()
    const records = (incomes ?? [])
      .filter((i) => {
        if (i.isProjection) return false
        if (!i.endDate) return true
        return i.endDate >= now.toISOString().split("T")[0]
      })
      .map((inc) => {
        const member = family?.adults.find((a) => a.id === inc.memberId)
        let age = 35 // sensible default
        if (member?.dateOfBirth) {
          const born = new Date(member.dateOfBirth)
          age = now.getFullYear() - born.getFullYear()
          if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) age--
        }
        return { annualGross: Number(inc.annualGross || 0), age, bvgMonthlyOverride: inc.bvgMonthly }
      })
    return calculateTotalSocialDeductions(records)
  }, [incomes, family?.adults])

  // Tax is computed on gross AFTER social deductions (they reduce taxable income)
  const taxableGross = totalAnnualGross - socialDeductions.total

  const taxResult = useMemo(
    () =>
      calculateTaxSimple(Math.max(0, taxableGross), filingStatus, numChildren, {
        municipality: family?.municipality ?? "Zürich",
        churchTax: family?.churchTax ?? false,
      }),
    [taxableGross, filingStatus, numChildren, family?.municipality, family?.churchTax]
  )

  const totalAnnualDeductions = socialDeductions.total + taxResult.total
  const monthlyNetIncomeFull = Math.round((totalAnnualGross - totalAnnualDeductions) / 12)
  const netWorth = useMemo(() => calculateNetWorth(assets), [assets])
  const cashBalance = netWorth.breakdown.liquid
  const deductionRatio = totalAnnualGross > 0 ? totalAnnualDeductions / totalAnnualGross : 0
  const monthlyNetBase = Math.round((totalAnnualBase * (1 - deductionRatio)) / 12)
  const monthlyNetBonus = Math.round((totalAnnualBonus * (1 - deductionRatio)) / 12)

  // Toggle: include bonus or base-only (conservative)
  const monthlyNetIncome = includeBonus ? monthlyNetIncomeFull : monthlyNetBase

  // Use budget when no actual transactions recorded; otherwise use actual spend
  const effectiveMonthlyExpenses = totalMonthlyBudget > 0 ? totalMonthlyBudget : totalMonthlyExpenses

  const monthlySavings = monthlyNetIncome - effectiveMonthlyExpenses
  const savingsRate = monthlyNetIncome > 0 ? monthlySavings / monthlyNetIncome : 0

  // Budget by category (for pie chart)
  const now = new Date()
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const hasTransactions = expenses.some((e) => e.date.substring(0, 7) === currentYM)
  const monthlyByCategory = (() => {
    const all = categories
      .map((cat) => {
        const actual = expenses
          .filter((e) => e.categoryId === cat.id && e.date.substring(0, 7) === currentYM)
          .reduce((s, e) => s + e.amount, 0)
        const value = hasTransactions ? actual : Number(cat.monthlyBudget ?? 0)
        return { name: cat.name, value, color: cat.color }
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)

    if (all.length <= 6) return all
    const top = all.slice(0, 5)
    const rest = all.slice(5)
    const otherValue = rest.reduce((s, d) => s + d.value, 0)
    return [...top, { name: "Other", value: otherValue, color: "#94a3b8" }]
  })()

  // 24-month rolling cash flow outlook (primary view)
  const cashFlowOutlook = useMemo(() => {
    const data: Array<{
      month: string
      cashBalance: number
      netWorth: number
      netIncome: number   // base income net of tax
      bonusIncome: number // bonus net of tax
      expenses: number
      cashFlow: number    // net income + bonus - expenses
    }> = []

    let runningCash = cashBalance
    let runningNW = netWorth.netWorth

    // Estimate monthly asset growth from investments
    const investmentAssets = assets.filter((a) => a.type === "investment" || a.type === "crypto")
    const monthlyAssetGrowth = investmentAssets.reduce((sum, a) => {
      const rate = a.annualReturnRate ?? 0
      return sum + (a.currentValue * rate / 100 / 12)
    }, 0)

    for (let i = 0; i < 24; i++) {
      const tl = incomeTimeline[i]
      if (!tl) break

      const netBase = Math.round(tl.baseIncome * (1 - deductionRatio))
      const netBonus = Math.round(tl.bonusIncome * (1 - deductionRatio))
      const cashFlow = netBase + netBonus - effectiveMonthlyExpenses

      runningCash += cashFlow
      runningNW += cashFlow + Math.round(monthlyAssetGrowth)

      data.push({
        month: tl.month,
        cashBalance: Math.round(runningCash),
        netWorth: Math.round(runningNW),
        netIncome: netBase,
        bonusIncome: netBonus,
        expenses: effectiveMonthlyExpenses,
        cashFlow: Math.round(cashFlow),
      })
    }
    return data
  }, [incomeTimeline, deductionRatio, effectiveMonthlyExpenses, cashBalance, netWorth.netWorth, assets])

  // All categories sorted by amount (for the full breakdown chart)
  const allCategoriesBySize = categories
    .map((cat) => {
      const actual = expenses
        .filter((e) => e.categoryId === cat.id && e.date.substring(0, 7) === currentYM)
        .reduce((s, e) => s + e.amount, 0)
      const value = hasTransactions ? actual : Number(cat.monthlyBudget ?? 0)
      return { name: cat.name, value, color: cat.color }
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const maxCategoryValue = allCategoriesBySize.length > 0 ? allCategoriesBySize[0].value : 0

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
            ? `${family.name}'s 24-month financial outlook`
            : "Your family's 24-month financial outlook."}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Balance
            </CardTitle>
            <Banknote className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(cashBalance)}</div>
            <p className="text-xs text-muted-foreground">liquid assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Income
            </CardTitle>
            <Button
              variant={includeBonus ? "default" : "outline"}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={toggleIncludeBonus}
            >
              {includeBonus ? "With Bonus" : "Base Only"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(monthlyNetIncome)}</div>
            <p className="text-xs text-muted-foreground">
              {includeBonus
                ? `${formatCHF(monthlyNetBase)} salary + ${formatCHF(monthlyNetBonus)} bonus`
                : "salary only — conservative"}
            </p>
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

      {/* Primary: 24-month cash flow outlook */}
      {hasData && monthlyNetIncome > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>24-Month Cash Flow Outlook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashFlowOutlook}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis
                    yAxisId="flow"
                    tickFormatter={formatAxisCHF}
                  />
                  <YAxis
                    yAxisId="balance"
                    orientation="right"
                    tickFormatter={formatAxisCHF}
                  />
                  <Tooltip formatter={(v) => formatCHF(Number(v))} />
                  <Legend />
                  <ReferenceLine yAxisId="flow" y={0} stroke="#666" strokeDasharray="3 3" />
                  <Bar
                    yAxisId="flow"
                    dataKey="netIncome"
                    name="Net Income"
                    fill="#22c55e"
                    radius={[2, 2, 0, 0]}
                    stackId="inflow"
                  />
                  <Bar
                    yAxisId="flow"
                    dataKey="bonusIncome"
                    name="Bonus"
                    fill="#f59e0b"
                    radius={[2, 2, 0, 0]}
                    stackId="inflow"
                  />
                  <Line
                    yAxisId="flow"
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Area
                    yAxisId="balance"
                    type="monotone"
                    dataKey="cashBalance"
                    name="Cash Balance"
                    fill="#3b82f620"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-muted-foreground">Monthly Savings</p>
                <p className={`font-semibold ${monthlySavings >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCHF(monthlySavings)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Cash in 12m</p>
                <p className="font-semibold">{formatCHF(cashFlowOutlook[11]?.cashBalance ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cash in 24m</p>
                <p className="font-semibold">{formatCHF(cashFlowOutlook[23]?.cashBalance ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Budget / Spending breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>{hasTransactions ? "Spending by Category" : "Budget by Category"}</CardTitle>
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
                    No expenses or budgets set
                  </div>
                )}
              </div>
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
                  { label: "Pension (BVG)", value: netWorth.breakdown.pension2ndPillar, color: "#06b6d4" },
                  { label: "Pension (3a)", value: netWorth.breakdown.pension3a, color: "#059669" },
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

      {/* All expenses by category – horizontal bars */}
      {hasData && allCategoriesBySize.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {hasTransactions ? "All Spending by Category" : "All Budgets by Category"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allCategoriesBySize.map((cat) => {
                const pct = maxCategoryValue > 0 ? (cat.value / maxCategoryValue) * 100 : 0
                const share =
                  effectiveMonthlyExpenses > 0
                    ? ((cat.value / effectiveMonthlyExpenses) * 100).toFixed(1)
                    : "0"
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between text-sm mb-0.5">
                      <span className="truncate font-medium">{cat.name}</span>
                      <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">
                        {formatCHF(cat.value)}{" "}
                        <span className="text-xs">({share}%)</span>
                      </span>
                    </div>
                    <div className="h-5 w-full rounded bg-muted overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
