import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, ArrowDownUp, Target, TrendingUp, TrendingDown } from "lucide-react"
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
} from "recharts"
import { useExpenses } from "@/hooks/useExpenses"
import { useIncome } from "@/hooks/useIncome"
import { useFamily } from "@/hooks/useFamily"
import { calculateTaxSimple } from "@/engine/tax/tax-engine"
import { useUIStore } from "@/store"
import { formatCHF, formatAxisCHF } from "@/lib/formatters"
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/constants"

const GROUPS = [
  { label: "Fixed Costs", keys: ["housing", "health_insurance", "childcare", "taxes"] },
  { label: "Daily Living", keys: ["groceries", "household", "personal_expenses", "communication", "transport", "car"] },
  { label: "Lifestyle", keys: ["restaurants", "holidays", "leisure", "personal_care", "clothing", "gifts"] },
  { label: "Savings & Investments", keys: ["pension_3a", "bvg", "investments", "other"] },
]

export function ExpensesPage() {
  const { expenses, categories, loading, addExpense, deleteExpense, updateCategoryBudget } =
    useExpenses()
  const { totalAnnualGross, totalAnnualBase } = useIncome()
  const { includeBonus, toggleIncludeBonus } = useUIStore()
  const { family } = useFamily()

  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly")
  const mult = viewMode === "yearly" ? 12 : 1
  const period = viewMode === "yearly" ? "year" : "month"

  const [dialogOpen, setDialogOpen] = useState(false)
  const [expCategoryId, setExpCategoryId] = useState("")
  const [expAmount, setExpAmount] = useState(0)
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0])
  const [expDescription, setExpDescription] = useState("")

  const numChildren = family?.children?.filter((c) => !c.isPlanned).length ?? 0
  const numAdults = family?.adults?.length ?? 2
  const filingStatus = numAdults >= 2 ? "married" as const : "single" as const

  const grossForCalc = includeBonus ? totalAnnualGross : totalAnnualBase
  const taxForCalc = useMemo(
    () => calculateTaxSimple(grossForCalc, filingStatus, numChildren, {
      municipality: family?.municipality ?? "Zürich",
      churchTax: family?.churchTax ?? false,
    }),
    [grossForCalc, filingStatus, numChildren, family?.municipality, family?.churchTax]
  )
  const monthlyNetIncome = Math.round((grossForCalc - taxForCalc.total) / 12)

  // Monthly tax for display (informational, not counted in expenses)
  const monthlyTax = taxForCalc.monthlyTax

  // Current month totals
  const now = new Date()
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const monthlyTotals: Record<string, number> = {}
  for (const exp of expenses) {
    if (exp.date.substring(0, 7) === currentYM) {
      monthlyTotals[exp.categoryId] = (monthlyTotals[exp.categoryId] ?? 0) + exp.amount
    }
  }

  // Budget total from category budgets
  // Exclude tax category from budget total (tax already deducted from net income)
  const isTaxCategory = (c: { name: string }) => c.name.toLowerCase().includes("tax")
  const totalBudget = categories
    .filter((c) => !isTaxCategory(c))
    .reduce((s, c) => s + (c.monthlyBudget ?? 0), 0)

  // Helper: find category by key
  const findCatByKey = (key: string) =>
    categories.find((c) => {
      const match = DEFAULT_EXPENSE_CATEGORIES.find((d) => d.name === c.name)
      return match?.key === key
    })

  // Pie data
  const pieData = categories
    .map((cat) => ({
      name: cat.name.length > 18 ? cat.name.substring(0, 17) + "…" : cat.name,
      value: cat.monthlyBudget ?? 0,
      color: cat.color,
    }))
    .filter((d) => d.value > 0)

  // Budget vs Actual calibration data (last 6 months)
  const budgetVsActual = useMemo(() => {
    const today = new Date()
    // Build list of last 6 complete months (excluding current month)
    const months: string[] = []
    for (let i = 1; i <= 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    }
    const monthCount = months.length

    // Aggregate actual spend per category across those months
    const actualTotals: Record<string, number> = {}
    for (const exp of expenses) {
      const ym = exp.date.substring(0, 7)
      if (months.includes(ym)) {
        actualTotals[exp.categoryId] = (actualTotals[exp.categoryId] ?? 0) + exp.amount
      }
    }

    // Build per-category rows, excluding tax
    const rows = categories
      .filter((c) => !isTaxCategory(c))
      .map((cat) => {
        const budget = cat.monthlyBudget ?? 0
        const totalActual = actualTotals[cat.id] ?? 0
        const avgActual = monthCount > 0 ? Math.round(totalActual / monthCount) : 0
        const diff = avgActual - budget
        const pct = budget > 0 ? Math.round((diff / budget) * 100) : 0
        const status: "under" | "over" | "nodata" =
          totalActual === 0 ? "nodata" : diff > 0 ? "over" : "under"
        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          budget,
          avgActual,
          diff,
          pct,
          status,
        }
      })

    const totalBudgetCalib = rows.reduce((s, r) => s + r.budget, 0)
    const totalActualCalib = rows.reduce((s, r) => s + r.avgActual, 0)
    const variance = totalActualCalib - totalBudgetCalib
    const variancePct = totalBudgetCalib > 0 ? Math.round((variance / totalBudgetCalib) * 100) : 0

    const withData = rows.filter((r) => r.status !== "nodata")
    const mostOver = [...withData].sort((a, b) => b.diff - a.diff).slice(0, 3).filter((r) => r.diff > 0)
    const mostUnder = [...withData].sort((a, b) => a.diff - b.diff).slice(0, 3).filter((r) => r.diff < 0)

    return { rows, totalBudget: totalBudgetCalib, totalActual: totalActualCalib, variance, variancePct, mostOver, mostUnder, monthCount }
  }, [expenses, categories])

  const handleAddExpense = async () => {
    if (!expCategoryId || !expAmount) return
    try {
      await addExpense({
        categoryId: expCategoryId,
        amount: expAmount,
        date: expDate,
        description: expDescription,
        isRecurring: false,
        source: "manual",
      })
      setDialogOpen(false)
      setExpAmount(0)
      setExpDescription("")
    } catch (err) {
      console.error("Failed to add expense:", err)
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Set your budget per category.</p>
          </div>
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "monthly" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs rounded-r-none"
              onClick={() => setViewMode("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={viewMode === "yearly" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs rounded-l-none"
              onClick={() => setViewMode("yearly")}
            >
              Yearly
            </Button>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={expCategoryId} onValueChange={setExpCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Amount (CHF)</Label>
                  <Input
                    type="number"
                    value={expAmount || ""}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <Button onClick={handleAddExpense} className="w-full">Add Expense</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Income / {period}</CardTitle>
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
            <div className="text-2xl font-bold">{formatCHF(monthlyNetIncome * mult)}</div>
            <p className="text-xs text-muted-foreground">
              {includeBonus ? "incl. bonus (avg)" : "salary only — conservative"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget / {period}</CardTitle>
            <ArrowDownUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(totalBudget * mult)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyNetIncome > 0 && totalBudget > 0
                ? `${Math.round((totalBudget / monthlyNetIncome) * 100)}% of income`
                : "Set budgets below"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Surplus / {period}</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyNetIncome - totalBudget >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCHF((monthlyNetIncome - totalBudget) * mult)}
            </div>
            <p className="text-xs text-muted-foreground">after all budgeted expenses</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="budget">
        <TabsList>
          <TabsTrigger value="budget">Monthly Budget</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calibration">Budget vs Actual</TabsTrigger>
        </TabsList>

        {/* Budget tab — clean table-like layout */}
        <TabsContent value="budget" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {GROUPS.map((group) => {
              const groupCats = group.keys
                .map((key) => findCatByKey(key))
                .filter(Boolean) as typeof categories

              const groupBudget = groupCats
                .filter((c) => !isTaxCategory(c))
                .reduce((s, c) => s + (c.monthlyBudget ?? 0), 0)

              return (
                <Card key={group.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span>{group.label}</span>
                      <span className="text-muted-foreground font-normal">
                        {formatCHF(groupBudget * mult)}/{viewMode === "yearly" ? "yr" : "mo"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {groupCats.map((cat) => {
                        const defaultDef = DEFAULT_EXPENSE_CATEGORIES.find((d) => d.name === cat.name)
                        const isTaxCat = isTaxCategory(cat)
                        if (isTaxCat) {
                          return (
                            <div key={cat.id} className="flex items-center gap-3 py-1.5 border-b last:border-0 opacity-60">
                              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-sm flex-1 min-w-0 truncate">
                                {cat.name}
                                <span className="text-xs text-muted-foreground ml-1">(from Tax page, not in budget total)</span>
                              </span>
                              <span className="text-sm text-muted-foreground">{formatCHF(Math.round(monthlyTax * mult))}</span>
                            </div>
                          )
                        }
                        const budgetValue = cat.monthlyBudget ?? 0
                        return (
                          <div
                            key={cat.id}
                            className="flex items-center gap-3 py-1.5 border-b last:border-0"
                          >
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm flex-1 min-w-0 truncate">{cat.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-muted-foreground">CHF</span>
                              {viewMode === "monthly" ? (
                                <Input
                                  type="number"
                                  value={budgetValue || ""}
                                  onChange={(e) => updateCategoryBudget(cat.id, Number(e.target.value))}
                                  placeholder={defaultDef?.typicalMonthly?.toString() ?? "—"}
                                  className="h-7 w-24 text-sm text-right"
                                />
                              ) : (
                                <Input
                                  type="number"
                                  value={budgetValue * 12 || ""}
                                  onChange={(e) => updateCategoryBudget(cat.id, Math.round(Number(e.target.value) / 12))}
                                  placeholder={defaultDef?.typicalMonthly ? String(defaultDef.typicalMonthly * 12) : "—"}
                                  className="h-7 w-24 text-sm text-right"
                                />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Transactions tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-muted-foreground">
                  No expenses recorded yet. Add expenses manually or upload a bank statement.
                </p>
              ) : (
                <div className="space-y-1">
                  {expenses.slice(0, 50).map((exp) => {
                    const cat = categories.find((c) => c.id === exp.categoryId)
                    return (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat?.color ?? "#94a3b8" }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {exp.description || cat?.name || "Expense"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {exp.date} · {cat?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium text-sm">-{formatCHF(exp.amount)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteExpense(exp.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
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
                      Set budgets to see allocation
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget by Group</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={GROUPS.map((g) => ({
                        name: g.label,
                        budget: g.keys
                          .map((k) => findCatByKey(k))
                          .filter(Boolean)
                          .reduce((s, c) => s + ((c as typeof categories[0]).monthlyBudget ?? 0), 0),
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => formatCHF(Number(v))} />
                      <Bar dataKey="budget" name="Monthly Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Budget vs Actual calibration tab */}
        <TabsContent value="calibration" className="space-y-4">
          {budgetVsActual.rows.every((r) => r.status === "nodata") ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No transaction data found for the last 6 months. Add expenses manually or import bank statements to see how your spending compares to your budget.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget / {period}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCHF(budgetVsActual.totalBudget * mult)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Actual / {period}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCHF(budgetVsActual.totalActual * mult)}</div>
                    <p className="text-xs text-muted-foreground">last {budgetVsActual.monthCount} months avg</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Variance / {period}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${budgetVsActual.variance > 0 ? "text-red-600" : "text-green-600"}`}>
                      {budgetVsActual.variance > 0 ? "+" : ""}{formatCHF(budgetVsActual.variance * mult)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {budgetVsActual.variancePct > 0 ? "+" : ""}{budgetVsActual.variancePct}% vs budget
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Biggest Gaps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {budgetVsActual.mostOver.length > 0 ? (
                      budgetVsActual.mostOver.map((r) => (
                        <div key={r.id} className="flex items-center gap-1.5 text-xs">
                          <TrendingUp className="h-3 w-3 text-red-500 shrink-0" />
                          <span className="truncate">{r.name}</span>
                          <span className="ml-auto text-red-600 shrink-0">+{formatCHF(r.diff * mult)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">All within budget</p>
                    )}
                    {budgetVsActual.mostUnder.slice(0, 2).map((r) => (
                      <div key={r.id} className="flex items-center gap-1.5 text-xs">
                        <TrendingDown className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="truncate">{r.name}</span>
                        <span className="ml-auto text-green-600 shrink-0">{formatCHF(r.diff * mult)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Horizontal bar chart: Budget vs Actual per category */}
              <Card>
                <CardHeader>
                  <CardTitle>Budget vs Actual by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: Math.max(300, budgetVsActual.rows.filter((r) => r.budget > 0 || r.avgActual > 0).length * 40) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={budgetVsActual.rows
                          .filter((r) => r.budget > 0 || r.avgActual > 0)
                          .map((r) => ({
                            name: r.name.length > 20 ? r.name.substring(0, 19) + "..." : r.name,
                            Budget: r.budget * mult,
                            Actual: r.avgActual * mult,
                          }))}
                        layout="vertical"
                        margin={{ left: 10, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={formatAxisCHF} />
                        <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => formatCHF(Number(v))} />
                        <Legend />
                        <Bar dataKey="Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="Actual" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed table */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium">Category</th>
                          <th className="pb-2 font-medium text-right">Budget / {period}</th>
                          <th className="pb-2 font-medium text-right">Avg Actual / {period}</th>
                          <th className="pb-2 font-medium text-right">Difference</th>
                          <th className="pb-2 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetVsActual.rows.map((row) => (
                          <tr key={row.id} className="border-b last:border-0">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                                <span className="truncate">{row.name}</span>
                              </div>
                            </td>
                            <td className="py-2 text-right">{formatCHF(row.budget * mult)}</td>
                            <td className="py-2 text-right">
                              {row.status === "nodata" ? (
                                <span className="text-muted-foreground">--</span>
                              ) : (
                                formatCHF(row.avgActual * mult)
                              )}
                            </td>
                            <td className="py-2 text-right">
                              {row.status === "nodata" ? (
                                <span className="text-muted-foreground">--</span>
                              ) : (
                                <span className={row.diff > 0 ? "text-red-600" : "text-green-600"}>
                                  {row.diff > 0 ? "+" : ""}{formatCHF(row.diff * mult)}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({row.pct > 0 ? "+" : ""}{row.pct}%)
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-right">
                              {row.status === "nodata" ? (
                                <Badge variant="secondary" className="text-xs">No data</Badge>
                              ) : row.status === "over" ? (
                                <Badge variant="destructive" className="text-xs">Over</Badge>
                              ) : (
                                <Badge className="bg-green-600 text-white text-xs hover:bg-green-700">Under</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t font-medium">
                          <td className="pt-3">Total</td>
                          <td className="pt-3 text-right">{formatCHF(budgetVsActual.totalBudget * mult)}</td>
                          <td className="pt-3 text-right">{formatCHF(budgetVsActual.totalActual * mult)}</td>
                          <td className="pt-3 text-right">
                            <span className={budgetVsActual.variance > 0 ? "text-red-600" : "text-green-600"}>
                              {budgetVsActual.variance > 0 ? "+" : ""}{formatCHF(budgetVsActual.variance * mult)}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({budgetVsActual.variancePct > 0 ? "+" : ""}{budgetVsActual.variancePct}%)
                              </span>
                            </span>
                          </td>
                          <td className="pt-3 text-right">
                            {budgetVsActual.variance > 0 ? (
                              <Badge variant="destructive" className="text-xs">Over</Badge>
                            ) : (
                              <Badge className="bg-green-600 text-white text-xs hover:bg-green-700">Under</Badge>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
