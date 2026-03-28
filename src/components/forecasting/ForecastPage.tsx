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
import { Plus, Trash2, TrendingUp, GitBranch, Loader2 } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from "recharts"
import { runForecast, compareForcasts } from "@/engine/forecast/forecast-engine"
import { LIFE_EVENT_TYPES } from "@/lib/constants"
import { formatCHF, formatAxisCHF } from "@/lib/formatters"
import { useIncome, buildIncomeTimeline } from "@/hooks/useIncome"
import { useExpenses } from "@/hooks/useExpenses"
import { useAssets } from "@/hooks/useAssets"
import { useFamily } from "@/hooks/useFamily"
import { calculateTaxSimple } from "@/engine/tax/tax-engine"
import { calculateNetWorth } from "@/engine/net-worth/net-worth-calculator"
import type { LifeEvent, LifeEventType } from "@/types"
import { v4 as uuid } from "uuid"

interface ScenarioConfig {
  id: string
  name: string
  events: LifeEvent[]
}

export function ForecastPage() {
  // Pull real data from hooks
  const { totalAnnualGross, currentIncomes, loading: incomeLoading } = useIncome()
  const { totalMonthlyBudget, totalMonthlyExpenses, loading: expenseLoading } = useExpenses()
  const { assets, loading: assetLoading } = useAssets()
  const { family, loading: familyLoading } = useFamily()

  const isLoading = incomeLoading || expenseLoading || assetLoading || familyLoading

  const netWorth = useMemo(() => calculateNetWorth(assets), [assets])

  // Tax calculation for net income
  const numChildren = family?.children?.filter((c) => !c.isPlanned).length ?? 0
  const numAdults = family?.adults?.length ?? 2
  const filingStatus = numAdults >= 2 ? ("married" as const) : ("single" as const)
  const taxResult = useMemo(
    () => calculateTaxSimple(totalAnnualGross, filingStatus, numChildren, {
      municipality: family?.municipality ?? "Zürich",
      churchTax: family?.churchTax ?? false,
    }),
    [totalAnnualGross, filingStatus, numChildren, family?.municipality, family?.churchTax]
  )

  const taxRatio = totalAnnualGross > 0 ? taxResult.total / totalAnnualGross : 0
  const monthlyNetIncome = Math.round((totalAnnualGross - taxResult.total) / 12)
  const effectiveExpenses = totalMonthlyBudget > 0 ? totalMonthlyBudget : totalMonthlyExpenses

  // Investment return estimate from asset data
  const investmentAssets = assets.filter((a) => a.type === "investment" || a.type === "crypto")
  const blendedReturn = investmentAssets.length > 0
    ? investmentAssets.reduce((s, a) => s + (a.annualReturnRate ?? 0) * a.currentValue, 0) /
      investmentAssets.reduce((s, a) => s + a.currentValue, 0)
    : 4

  // Overridable parameters (initialized from real data)
  const [forecastYears, setForecastYears] = useState(10)
  const [investmentReturn, setInvestmentReturn] = useState<number | null>(null)

  const effectiveReturn = investmentReturn ?? blendedReturn

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingScenario, setEditingScenario] = useState<string | null>(null)
  const [baseEvents, setBaseEvents] = useState<LifeEvent[]>([])
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([])

  // Event form state
  const [eventType, setEventType] = useState<LifeEventType>("salary_change")
  const [eventDate, setEventDate] = useState("")
  const [eventLabel, setEventLabel] = useState("")
  const [eventParams, setEventParams] = useState<Record<string, string>>({})

  const now = new Date()
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const endYear = now.getFullYear() + forecastYears
  const endDate = `${endYear}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const baseForecast = useMemo(
    () => runForecast({
      startDate,
      endDate,
      initialNetWorth: netWorth.netWorth,
      monthlyIncome: monthlyNetIncome,
      monthlyExpenses: effectiveExpenses,
      lifeEvents: baseEvents,
      investmentReturnRate: effectiveReturn / 100,
    }),
    [startDate, endDate, netWorth.netWorth, monthlyNetIncome, effectiveExpenses, baseEvents, effectiveReturn]
  )

  const scenarioForecasts = useMemo(
    () => scenarios.map((s) => ({
      ...s,
      forecast: runForecast({
        startDate,
        endDate,
        initialNetWorth: netWorth.netWorth,
        monthlyIncome: monthlyNetIncome,
        monthlyExpenses: effectiveExpenses,
        lifeEvents: [...baseEvents, ...s.events],
        investmentReturnRate: effectiveReturn / 100,
      }),
    })),
    [scenarios, startDate, endDate, netWorth.netWorth, monthlyNetIncome, effectiveExpenses, baseEvents, effectiveReturn]
  )

  // Build detailed chart with base income, bonus, expenses — full bonus logic for all months
  const fullTimeline = useMemo(
    () => buildIncomeTimeline(currentIncomes, forecastYears * 12),
    [currentIncomes, forecastYears]
  )

  const detailedChartData = useMemo(() => {
    const data: Array<{
      date: string
      baseIncome: number
      bonusIncome: number
      expenses: number
      cashFlow: number
      netWorth: number
    }> = []

    let nw = netWorth.netWorth
    const monthlyReturnRate = Math.pow(1 + effectiveReturn / 100, 1 / 12) - 1
    const totalMonths = forecastYears * 12

    for (let i = 0; i < totalMonths; i++) {
      const tl = fullTimeline[i]
      if (!tl) break

      const baseIncome = Math.round(tl.baseIncome * (1 - taxRatio))
      const bonusIncome = Math.round(tl.bonusIncome * (1 - taxRatio))

      const cashFlow = baseIncome + bonusIncome - effectiveExpenses
      if (nw > 0) nw += nw * monthlyReturnRate
      nw += cashFlow

      // Only include quarterly points for readability
      if (i % 3 === 0) {
        data.push({
          date: tl.month,
          baseIncome,
          bonusIncome,
          expenses: effectiveExpenses,
          cashFlow: Math.round(cashFlow),
          netWorth: Math.round(nw),
        })
      }
    }
    return data
  }, [fullTimeline, taxRatio, effectiveExpenses, effectiveReturn, netWorth.netWorth, forecastYears])

  // Net worth chart with scenarios
  const chartData = baseForecast.months
    .filter((_, i) => i % 3 === 0)
    .map((m, i) => {
      const point: Record<string, string | number> = {
        date: m.date,
        "Base": m.netWorth,
      }
      for (const s of scenarioForecasts) {
        const idx = i * 3
        point[s.name] = s.forecast.months[idx]?.netWorth ?? 0
      }
      return point
    })

  const addEvent = (targetScenarioId: string | null) => {
    const params: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(eventParams)) {
      params[k] = isNaN(Number(v)) ? v : Number(v)
    }
    const event: LifeEvent = {
      id: uuid(),
      type: eventType,
      date: eventDate,
      label: eventLabel || LIFE_EVENT_TYPES.find((t) => t.value === eventType)?.label || eventType,
      params,
    }
    if (targetScenarioId) {
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === targetScenarioId ? { ...s, events: [...s.events, event] } : s
        )
      )
    } else {
      setBaseEvents((prev) => [...prev, event])
    }
    setDialogOpen(false)
    setEventParams({})
    setEventLabel("")
  }

  const removeEvent = (eventId: string, scenarioId: string | null) => {
    if (scenarioId) {
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === scenarioId
            ? { ...s, events: s.events.filter((e) => e.id !== eventId) }
            : s
        )
      )
    } else {
      setBaseEvents((prev) => prev.filter((e) => e.id !== eventId))
    }
  }

  const addScenario = () => {
    setScenarios((prev) => [
      ...prev,
      { id: uuid(), name: `Scenario ${prev.length + 1}`, events: [] },
    ])
  }

  const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6"]

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecasting</h1>
          <p className="text-muted-foreground">
            Model life events and compare financial scenarios. Data auto-populated from your income, expenses, and assets.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addScenario}>
            <GitBranch className="mr-2 h-4 w-4" />
            Add Scenario
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Life Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Life Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {scenarios.length > 0 && (
                  <div className="space-y-2">
                    <Label>Add to</Label>
                    <Select
                      value={editingScenario ?? "base"}
                      onValueChange={(v) => setEditingScenario(v === "base" ? null : v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="base">Base Timeline</SelectItem>
                        {scenarios.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select value={eventType} onValueChange={(v) => setEventType(v as LifeEventType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LIFE_EVENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="month" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={eventLabel}
                    onChange={(e) => setEventLabel(e.target.value)}
                    placeholder="e.g. Move to bigger apartment"
                  />
                </div>

                {eventType === "salary_change" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Old Annual Salary</Label>
                      <Input type="number" value={eventParams.oldAnnualSalary ?? ""} onChange={(e) => setEventParams({ ...eventParams, oldAnnualSalary: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>New Annual Salary</Label>
                      <Input type="number" value={eventParams.newAnnualSalary ?? ""} onChange={(e) => setEventParams({ ...eventParams, newAnnualSalary: e.target.value })} />
                    </div>
                  </div>
                )}
                {eventType === "apartment_change" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Old Monthly Rent</Label>
                      <Input type="number" value={eventParams.oldRent ?? ""} onChange={(e) => setEventParams({ ...eventParams, oldRent: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>New Monthly Rent</Label>
                      <Input type="number" value={eventParams.newRent ?? ""} onChange={(e) => setEventParams({ ...eventParams, newRent: e.target.value })} />
                    </div>
                  </div>
                )}
                {eventType === "new_child" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Monthly Childcare Cost</Label>
                      <Input type="number" value={eventParams.monthlyChildcareCost ?? "2400"} onChange={(e) => setEventParams({ ...eventParams, monthlyChildcareCost: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Monthly Child Costs</Label>
                      <Input type="number" value={eventParams.monthlyOtherChildCost ?? "500"} onChange={(e) => setEventParams({ ...eventParams, monthlyOtherChildCost: e.target.value })} />
                    </div>
                  </div>
                )}
                {eventType === "large_purchase" && (
                  <div className="space-y-2">
                    <Label>Purchase Amount (CHF)</Label>
                    <Input type="number" value={eventParams.amount ?? ""} onChange={(e) => setEventParams({ ...eventParams, amount: e.target.value })} />
                  </div>
                )}
                {eventType === "custom" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Monthly Income Change</Label>
                      <Input type="number" value={eventParams.monthlyIncomeChange ?? ""} onChange={(e) => setEventParams({ ...eventParams, monthlyIncomeChange: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Expense Change</Label>
                      <Input type="number" value={eventParams.monthlyExpenseChange ?? ""} onChange={(e) => setEventParams({ ...eventParams, monthlyExpenseChange: e.target.value })} />
                    </div>
                  </div>
                )}

                <Button onClick={() => addEvent(editingScenario)} className="w-full">
                  Add Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Current data summary — shows what's feeding the forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Inputs (from your data)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-5">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Monthly Net Income</p>
              <p className="text-lg font-semibold">{formatCHF(monthlyNetIncome)}</p>
              <p className="text-xs text-muted-foreground">base + bonus avg, net of tax</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Monthly Expenses</p>
              <p className="text-lg font-semibold">{formatCHF(effectiveExpenses)}</p>
              <p className="text-xs text-muted-foreground">{totalMonthlyBudget > 0 ? "from budget" : "from transactions"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Current Net Worth</p>
              <p className="text-lg font-semibold">{formatCHF(netWorth.netWorth)}</p>
              <p className="text-xs text-muted-foreground">{assets.length} assets</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Investment Return</p>
              <Input
                type="number"
                step="0.5"
                value={investmentReturn ?? Math.round(blendedReturn * 10) / 10}
                onChange={(e) => setInvestmentReturn(Number(e.target.value))}
                className="h-8 w-20"
              />
              <p className="text-xs text-muted-foreground">% annual{investmentReturn === null && " (from assets)"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Forecast Period</p>
              <Input
                type="number"
                min={1}
                max={30}
                value={forecastYears}
                onChange={(e) => setForecastYears(Number(e.target.value))}
                className="h-8 w-20"
              />
              <p className="text-xs text-muted-foreground">years</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth in {forecastYears}y</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(baseForecast.finalNetWorth)}</div>
            <p className="text-xs text-muted-foreground">
              +{formatCHF(baseForecast.finalNetWorth - netWorth.netWorth)} growth
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(baseForecast.totalIncome)}</div>
            <p className="text-xs text-muted-foreground">over {forecastYears} years</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(baseForecast.totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCHF(baseForecast.totalIncome - baseForecast.totalExpenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash flow chart with base/bonus split */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Projection (Base + Bonus)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={detailedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tickFormatter={formatAxisCHF} />
                <Tooltip formatter={(v) => formatCHF(Number(v))} />
                <Legend />
                <Bar dataKey="baseIncome" name="Base Income" fill="#22c55e" stackId="income" />
                <Bar dataKey="bonusIncome" name="Bonus" fill="#f59e0b" stackId="income" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Net worth scenarios chart */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAxisCHF} />
                <Tooltip formatter={(v) => formatCHF(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="Base" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                {scenarioForecasts.map((s, i) => (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.name}
                    stroke={COLORS[(i + 1) % COLORS.length]}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Life events timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Life Events (Base Timeline)</CardTitle>
        </CardHeader>
        <CardContent>
          {baseEvents.length === 0 ? (
            <p className="text-muted-foreground">
              No life events added yet. Add events like salary changes, new children, or
              apartment moves to see their impact on your forecast.
            </p>
          ) : (
            <div className="space-y-2">
              {baseEvents
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{event.date}</Badge>
                      <span className="font-medium">{event.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {LIFE_EVENT_TYPES.find((t) => t.value === event.type)?.label}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEvent(event.id, null)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alternative scenarios */}
      {scenarios.map((scenario, si) => {
        const comparison = compareForcasts(
          baseForecast,
          scenarioForecasts[si]?.forecast ?? baseForecast
        )
        return (
          <Card key={scenario.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[(si + 1) % COLORS.length] }}
                />
                <Input
                  value={scenario.name}
                  onChange={(e) =>
                    setScenarios((prev) =>
                      prev.map((s) =>
                        s.id === scenario.id ? { ...s, name: e.target.value } : s
                      )
                    )
                  }
                  className="h-7 w-48 border-none p-0 text-base font-semibold shadow-none focus-visible:ring-0"
                />
                <Badge
                  variant={comparison.netWorthDiff >= 0 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {comparison.netWorthDiff >= 0 ? "+" : ""}
                  {formatCHF(comparison.netWorthDiff)} net worth
                </Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setScenarios((prev) => prev.filter((s) => s.id !== scenario.id))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              {scenario.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No events in this scenario. Add events specific to this &quot;what if&quot; path.
                </p>
              ) : (
                <div className="space-y-2">
                  {scenario.events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between rounded border p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{event.date}</Badge>
                        <span className="text-sm">{event.label}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeEvent(event.id, scenario.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
