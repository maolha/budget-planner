import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
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
import { Plus, Trash2, ArrowDownUp, Target, TrendingUp } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useExpenses } from "@/hooks/useExpenses"
import { useIncome } from "@/hooks/useIncome"
import { useFamily } from "@/hooks/useFamily"
import { calculateBudgetRecommendation } from "@/engine/budget/recommendation-engine"
import { calculateTaxSimple } from "@/engine/tax/tax-engine"
import { formatCHF } from "@/lib/formatters"
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/constants"

const PRIORITY_COLORS = [
  "bg-gray-200 text-gray-700",
  "bg-green-100 text-green-700",
  "bg-blue-100 text-blue-700",
  "bg-yellow-100 text-yellow-700",
  "bg-orange-100 text-orange-700",
  "bg-red-100 text-red-700",
]

export function ExpensesPage() {
  const { expenses, categories, loading, addExpense, deleteExpense, updateCategoryPriority, updateCategoryBudget } =
    useExpenses()
  const { totalAnnualGross } = useIncome()
  const { family } = useFamily()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [expCategoryId, setExpCategoryId] = useState("")
  const [expAmount, setExpAmount] = useState(0)
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0])
  const [expDescription, setExpDescription] = useState("")

  // Calculate tax to get net income
  const numChildren = family?.children.filter((c) => !c.isPlanned).length ?? 0
  const numAdults = family?.adults.length ?? 2
  const filingStatus = numAdults >= 2 ? "married" as const : "single" as const

  const taxResult = useMemo(
    () =>
      calculateTaxSimple(totalAnnualGross, filingStatus, numChildren, {
        municipality: family?.municipality ?? "Zürich",
        churchTax: family?.churchTax ?? false,
      }),
    [totalAnnualGross, filingStatus, numChildren, family?.municipality, family?.churchTax]
  )

  const monthlyNetIncome = Math.round((totalAnnualGross - taxResult.total) / 12)

  // Build priorities from categories
  const priorities: Record<string, number> = {}
  for (const cat of categories) {
    // Use the category name to derive the key (lowercase, underscore)
    const key = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")
    priorities[key] = cat.priority
  }

  const recommendation = useMemo(
    () =>
      calculateBudgetRecommendation({
        monthlyNetIncome,
        numAdults,
        numChildren,
        priorities,
        monthlyTax: taxResult.monthlyTax,
      }),
    [monthlyNetIncome, numAdults, numChildren, priorities, taxResult.monthlyTax]
  )

  // Current month totals
  const now = new Date()
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const monthlyTotals: Record<string, number> = {}
  for (const exp of expenses) {
    if (exp.date.substring(0, 7) === currentYM) {
      monthlyTotals[exp.categoryId] = (monthlyTotals[exp.categoryId] ?? 0) + exp.amount
    }
  }

  // Chart: budget vs actual per category
  const budgetVsActual = categories
    .filter((c) => !c.isFixed)
    .map((cat) => {
      const rec = recommendation.categories.find(
        (r) => r.categoryName === cat.name
      )
      return {
        name: cat.name.length > 15 ? cat.name.substring(0, 14) + "…" : cat.name,
        budget: rec?.recommendedMonthly ?? 0,
        actual: monthlyTotals[cat.id] ?? 0,
      }
    })
    .filter((d) => d.budget > 0 || d.actual > 0)

  // Pie chart: spending by category
  const pieData = categories
    .map((cat) => ({
      name: cat.name,
      value: monthlyTotals[cat.id] ?? 0,
      color: cat.color,
    }))
    .filter((d) => d.value > 0)

  const handleAddExpense = async () => {
    if (!expCategoryId || !expAmount) return
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
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Manage categories, set priorities, and track spending.
          </p>
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
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
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
                  placeholder="e.g. Weekly Migros shop"
                />
              </div>
              <Button onClick={handleAddExpense} className="w-full">
                Add Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Net Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(monthlyNetIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month&apos;s Spending
            </CardTitle>
            <ArrowDownUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCHF(Object.values(monthlyTotals).reduce((s, v) => s + v, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget Confidence
            </CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{recommendation.confidence}</div>
            <p className="text-xs text-muted-foreground">
              Savings rate: {(recommendation.savingsRate * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="budget">
        <TabsList>
          <TabsTrigger value="budget">Budget & Priorities</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        {/* Budget & Priorities tab */}
        <TabsContent value="budget" className="space-y-4">
          {(() => {
            // Group categories
            const GROUPS = [
              { label: "Fixed Costs", icon: "🏠", keys: ["housing", "health_insurance", "childcare", "taxes", "pension_3a", "bvg"] },
              { label: "Daily Living", icon: "🛒", keys: ["groceries", "household", "personal_expenses", "communication"] },
              { label: "Lifestyle", icon: "✨", keys: ["restaurants", "holidays", "leisure", "personal_care", "clothing", "gifts"] },
              { label: "Mobility & Other", icon: "🚗", keys: ["transport", "car", "investments", "other"] },
            ]

            const findCatByKey = (key: string) =>
              categories.find((c) => {
                const catKey = c.name.toLowerCase().replace(/[^a-z0-9äöü]+/g, "_")
                // Match by key lookup from defaults
                const match = DEFAULT_EXPENSE_CATEGORIES.find((d) => d.name === c.name)
                return match?.key === key || catKey.includes(key)
              })

            const leftGroups = GROUPS.slice(0, 2)
            const rightGroups = GROUPS.slice(2)

            const renderGroup = (group: typeof GROUPS[0]) => {
              const groupCats = group.keys
                .map((key) => {
                  const cat = findCatByKey(key)
                  if (!cat) return null
                  const rec = recommendation.categories.find((r) => r.categoryName === cat.name)
                  const actual = monthlyTotals[cat.id] ?? 0
                  const recommended = rec?.recommendedMonthly ?? 0
                  const budget = cat.monthlyBudget ?? 0
                  const effectiveBudget = budget || recommended
                  const isOverBudget = actual > effectiveBudget && effectiveBudget > 0
                  return { cat, rec, actual, recommended, budget, effectiveBudget, isOverBudget }
                })
                .filter(Boolean) as Array<{
                  cat: typeof categories[0]
                  actual: number
                  recommended: number
                  budget: number
                  effectiveBudget: number
                  isOverBudget: boolean
                }>

              const groupTotal = groupCats.reduce((s, g) => s + (g.budget || g.recommended), 0)
              const groupSpent = groupCats.reduce((s, g) => s + g.actual, 0)

              return (
                <Card key={group.label}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{group.icon} {group.label}</span>
                      <div className="flex gap-3 text-xs font-normal text-muted-foreground">
                        <span>Budget: {formatCHF(groupTotal)}</span>
                        <span className={groupSpent > groupTotal && groupTotal > 0 ? "text-red-600 font-medium" : ""}>
                          Spent: {formatCHF(groupSpent)}
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {groupCats.map(({ cat, actual, recommended, budget, effectiveBudget, isOverBudget }) => (
                      <div key={cat.id} className="space-y-1.5 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm font-medium">{cat.name}</span>
                          </div>
                          <span className={`text-xs ${isOverBudget ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                            {formatCHF(actual)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={budget || ""}
                            onChange={(e) => updateCategoryBudget(cat.id, Number(e.target.value))}
                            placeholder={recommended ? `${recommended}` : "—"}
                            className="h-7 text-xs flex-1"
                          />
                          {recommended > 0 && !budget && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-primary"
                              onClick={() => updateCategoryBudget(cat.id, recommended)}
                            >
                              {formatCHF(recommended)}
                            </Button>
                          )}
                          {!cat.isFixed && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Slider
                                value={[cat.priority]}
                                min={0}
                                max={5}
                                step={1}
                                onValueChange={([v]) => updateCategoryPriority(cat.id, v)}
                                className="w-16"
                              />
                              <span className={`text-[10px] w-4 text-center font-medium ${PRIORITY_COLORS[cat.priority].split(" ")[1]}`}>
                                {cat.priority}
                              </span>
                            </div>
                          )}
                        </div>

                        {effectiveBudget > 0 && (
                          <div className="h-1.5 rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverBudget ? "bg-red-500" : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min((actual / effectiveBudget) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            }

            return (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  {leftGroups.map(renderGroup)}
                </div>
                <div className="space-y-4">
                  {rightGroups.map(renderGroup)}
                </div>
              </div>
            )
          })()}
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
                <div className="space-y-2">
                  {expenses.slice(0, 50).map((exp) => {
                    const cat = categories.find((c) => c.id === exp.categoryId)
                    return (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat?.color ?? "#94a3b8" }}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {exp.description || cat?.name || "Expense"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {exp.date} · {cat?.name}
                              {exp.source === "csv_import" && " · CSV Import"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-red-600">
                            -{formatCHF(exp.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
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

        {/* Charts tab */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Budget vs Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetVsActual} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => formatCHF(Number(v))} />
                      <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="actual" name="Actual" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
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
                      Add expenses to see spending breakdown
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
