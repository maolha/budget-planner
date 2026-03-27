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
import { calculateTaxSimple } from "@/engine/tax/tax-engine"
import { formatCHF } from "@/lib/formatters"
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/constants"

const GROUPS = [
  { label: "Fixed Costs", keys: ["housing", "health_insurance", "childcare", "taxes", "pension_3a", "bvg"] },
  { label: "Daily Living", keys: ["groceries", "household", "personal_expenses", "communication"] },
  { label: "Lifestyle", keys: ["restaurants", "holidays", "leisure", "personal_care", "clothing", "gifts"] },
  { label: "Mobility & Other", keys: ["transport", "car", "investments", "other"] },
]

export function ExpensesPage() {
  const { expenses, categories, loading, addExpense, deleteExpense, updateCategoryBudget } =
    useExpenses()
  const { totalAnnualGross } = useIncome()
  const { family } = useFamily()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [expCategoryId, setExpCategoryId] = useState("")
  const [expAmount, setExpAmount] = useState(0)
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0])
  const [expDescription, setExpDescription] = useState("")

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
  const totalBudget = categories.reduce((s, c) => s + (c.monthlyBudget ?? 0), 0)

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Set your monthly budget per category.</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Net Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(monthlyNetIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Monthly Budget</CardTitle>
            <ArrowDownUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyNetIncome > 0 && totalBudget > 0
                ? `${Math.round((totalBudget / monthlyNetIncome) * 100)}% of income`
                : "Set budgets below"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Surplus</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyNetIncome - totalBudget >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCHF(monthlyNetIncome - totalBudget)}
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
        </TabsList>

        {/* Budget tab — clean table-like layout */}
        <TabsContent value="budget" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {GROUPS.map((group) => {
              const groupCats = group.keys
                .map((key) => findCatByKey(key))
                .filter(Boolean) as typeof categories

              const groupBudget = groupCats.reduce((s, c) => s + (c.monthlyBudget ?? 0), 0)

              return (
                <Card key={group.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span>{group.label}</span>
                      <span className="text-muted-foreground font-normal">
                        {formatCHF(groupBudget)}/mo
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {groupCats.map((cat) => {
                        const defaultDef = DEFAULT_EXPENSE_CATEGORIES.find((d) => d.name === cat.name)
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
                              <Input
                                type="number"
                                value={cat.monthlyBudget ?? ""}
                                onChange={(e) => updateCategoryBudget(cat.id, Number(e.target.value))}
                                placeholder={defaultDef?.typicalMonthly?.toString() ?? "—"}
                                className="h-7 w-24 text-sm text-right"
                              />
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
      </Tabs>
    </div>
  )
}
