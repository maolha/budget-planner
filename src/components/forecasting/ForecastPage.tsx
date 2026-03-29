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
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  ReferenceLine,
} from "recharts"
import { runForecast, compareForcasts } from "@/engine/forecast/forecast-engine"
import { LIFE_EVENT_TYPES } from "@/lib/constants"
import { formatCHF, formatAxisCHF } from "@/lib/formatters"
import { useIncome, buildIncomeTimeline } from "@/hooks/useIncome"
import { useExpenses } from "@/hooks/useExpenses"
import { useAssets } from "@/hooks/useAssets"
import { useFamily } from "@/hooks/useFamily"
import { useScenarios } from "@/hooks/useScenarios"
import { calculateTaxSimple } from "@/engine/tax/tax-engine"
import { calculateNetWorth } from "@/engine/net-worth/net-worth-calculator"
import { calculateTotalSocialDeductions } from "@/engine/social/swiss-social-deductions"
import type { LifeEvent, LifeEventType } from "@/types"
import { v4 as uuid } from "uuid"

export function ForecastPage() {
  // Pull real data from hooks
  const { totalAnnualGross, currentIncomes, loading: incomeLoading } = useIncome()
  const { totalMonthlyBudget, totalMonthlyExpenses, loading: expenseLoading } = useExpenses()
  const { assets, loading: assetLoading } = useAssets()
  const { family, loading: familyLoading } = useFamily()

  const {
    baseEvents,
    alternativeScenarios: savedScenarios,
    loading: scenarioLoading,
    saveBaseEvents,
    addScenario: addScenarioToDb,
    updateScenario,
    deleteScenario,
  } = useScenarios()

  const isLoading = incomeLoading || expenseLoading || assetLoading || familyLoading || scenarioLoading

  const netWorth = useMemo(() => calculateNetWorth(assets), [assets])

  // Social deductions + tax calculation for net income
  const numChildren = family?.children?.filter((c) => !c.isPlanned).length ?? 0
  const numAdults = family?.adults?.length ?? 2
  const filingStatus = numAdults >= 2 ? ("married" as const) : ("single" as const)

  const socialDeductions = useMemo(() => {
    const now = new Date()
    const records = currentIncomes.map((inc) => {
      const member = family?.adults.find((a) => a.id === inc.memberId)
      let age = 35
      if (member?.dateOfBirth) {
        const born = new Date(member.dateOfBirth)
        age = now.getFullYear() - born.getFullYear()
        if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) age--
      }
      return { annualGross: Number(inc.annualGross || 0), age, bvgEmployeeSplit: inc.bvgEmployeeSplit ?? undefined, bvgMonthlyOverride: inc.bvgMonthly }
    })
    return calculateTotalSocialDeductions(records)
  }, [currentIncomes, family?.adults])

  const taxableGross = Math.max(0, totalAnnualGross - socialDeductions.total)
  const taxResult = useMemo(
    () => calculateTaxSimple(taxableGross, filingStatus, numChildren, {
      municipality: family?.municipality ?? "Zürich",
      churchTax: family?.churchTax ?? false,
    }),
    [taxableGross, filingStatus, numChildren, family?.municipality, family?.churchTax]
  )

  const totalDeductions = socialDeductions.total + taxResult.total
  const taxRatio = totalAnnualGross > 0 ? totalDeductions / totalAnnualGross : 0
  const monthlyNetIncome = Math.round((totalAnnualGross - totalDeductions) / 12)
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

  // Map saved scenarios to the format the forecast engine expects
  const scenarios = savedScenarios.map((s) => ({
    id: s.id,
    name: s.name,
    events: s.lifeEvents ?? [],
  }))

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

  // Build combined chart data using baseForecast (applies life events) + bonus timeline
  const fullTimeline = useMemo(
    () => buildIncomeTimeline(currentIncomes, forecastYears * 12),
    [currentIncomes, forecastYears]
  )

  // Primary chart: income/expenses/savings with life events applied
  const combinedChartData = useMemo(() => {
    const data: Array<{
      date: string
      income: number
      bonusIncome: number
      expenses: number
      savings: number
      netWorth: number
      event?: string
    }> = []

    const months = baseForecast.months
    for (let i = 0; i < months.length; i++) {
      if (i % 3 !== 0) continue // quarterly for readability
      const m = months[i]
      // Overlay bonus from timeline onto the forecast income
      const tl = fullTimeline[i]
      const bonusGross = tl?.bonusIncome ?? 0
      const bonusNet = Math.round(bonusGross * (1 - taxRatio))
      const eventLabel = m.events.length > 0 ? m.events.join(", ") : undefined

      data.push({
        date: m.date,
        income: m.income,
        bonusIncome: bonusNet,
        expenses: m.expenses,
        savings: m.savings,
        netWorth: m.netWorth,
        event: eventLabel,
      })
    }
    return data
  }, [baseForecast.months, fullTimeline, taxRatio])

  // Scenario comparison data: net worth + savings
  const scenarioNWData = useMemo(() => {
    return baseForecast.months
      .filter((_, i) => i % 3 === 0)
      .map((m, i) => {
        const point: Record<string, string | number> = { date: m.date, "Base": m.netWorth }
        for (const s of scenarioForecasts) {
          const idx = i * 3
          point[s.name] = s.forecast.months[idx]?.netWorth ?? 0
        }
        return point
      })
  }, [baseForecast.months, scenarioForecasts])

  const scenarioSavingsData = useMemo(() => {
    return baseForecast.months
      .filter((_, i) => i % 3 === 0)
      .map((m, i) => {
        const point: Record<string, string | number> = { date: m.date, "Base": m.savings }
        for (const s of scenarioForecasts) {
          const idx = i * 3
          point[s.name] = s.forecast.months[idx]?.savings ?? 0
        }
        return point
      })
  }, [baseForecast.months, scenarioForecasts])

  const addEvent = async (targetScenarioId: string | null) => {
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
      const scenario = savedScenarios.find((s) => s.id === targetScenarioId)
      if (scenario) {
        await updateScenario(targetScenarioId, {
          lifeEvents: [...(scenario.lifeEvents ?? []), event],
        })
      }
    } else {
      await saveBaseEvents([...baseEvents, event])
    }
    setDialogOpen(false)
    setEventParams({})
    setEventLabel("")
  }

  const removeEvent = async (eventId: string, scenarioId: string | null) => {
    if (scenarioId) {
      const scenario = savedScenarios.find((s) => s.id === scenarioId)
      if (scenario) {
        await updateScenario(scenarioId, {
          lifeEvents: (scenario.lifeEvents ?? []).filter((e) => e.id !== eventId),
        })
      }
    } else {
      await saveBaseEvents(baseEvents.filter((e) => e.id !== eventId))
    }
  }

  const moveEvent = async (eventId: string, fromScenarioId: string | null, toScenarioId: string | null) => {
    // Find the event
    let event: LifeEvent | undefined
    if (fromScenarioId) {
      const from = savedScenarios.find((s) => s.id === fromScenarioId)
      event = from?.lifeEvents?.find((e) => e.id === eventId)
    } else {
      event = baseEvents.find((e) => e.id === eventId)
    }
    if (!event) return

    // Remove from source
    await removeEvent(eventId, fromScenarioId)

    // Add to target
    if (toScenarioId) {
      const to = savedScenarios.find((s) => s.id === toScenarioId)
      if (to) {
        await updateScenario(toScenarioId, {
          lifeEvents: [...(to.lifeEvents ?? []), event],
        })
      }
    } else {
      await saveBaseEvents([...baseEvents, event])
    }
  }

  const addScenario = async () => {
    await addScenarioToDb(`Scenario ${scenarios.length + 1}`)
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

      {/* Combined cash flow + projection chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income, Expenses & Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
                <YAxis yAxisId="flow" tickFormatter={formatAxisCHF} />
                <YAxis yAxisId="nw" orientation="right" tickFormatter={formatAxisCHF} />
                <Tooltip
                  formatter={(v, name) => [formatCHF(Number(v)), name]}
                  labelFormatter={(label) => {
                    const d = combinedChartData.find((p) => p.date === label)
                    return d?.event ? `${label} — ${d.event}` : label
                  }}
                />
                <Legend />
                <Bar yAxisId="flow" dataKey="income" name="Income (net)" fill="#22c55e" stackId="in" />
                <Bar yAxisId="flow" dataKey="bonusIncome" name="Bonus" fill="#f59e0b" stackId="in" radius={[2, 2, 0, 0]} />
                <Line yAxisId="flow" type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line yAxisId="nw" type="monotone" dataKey="netWorth" name="Net Worth" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                {/* Mark life events */}
                {combinedChartData.filter((d) => d.event).map((d) => (
                  <ReferenceLine key={d.date} x={d.date} yAxisId="flow" stroke="#8b5cf6" strokeDasharray="3 3" label={{ value: d.event?.substring(0, 15), position: "top", fontSize: 9, fill: "#8b5cf6" }} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Left axis: monthly income/expenses. Right axis: cumulative net worth. Purple dashed lines mark life events.
          </p>
        </CardContent>
      </Card>

      {/* Scenario comparison charts */}
      {scenarios.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Savings Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={scenarioSavingsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
                    <YAxis tickFormatter={formatAxisCHF} />
                    <Tooltip formatter={(v) => formatCHF(Number(v))} />
                    <Legend />
                    <Line type="monotone" dataKey="Base" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                    {scenarioForecasts.map((s, i) => (
                      <Line key={s.id} type="monotone" dataKey={s.name} stroke={COLORS[(i + 1) % COLORS.length]} strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Net Worth Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={scenarioNWData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
                    <YAxis tickFormatter={formatAxisCHF} />
                    <Tooltip formatter={(v) => formatCHF(Number(v))} />
                    <Legend />
                    <Line type="monotone" dataKey="Base" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                    {scenarioForecasts.map((s, i) => (
                      <Line key={s.id} type="monotone" dataKey={s.name} stroke={COLORS[(i + 1) % COLORS.length]} strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                    <div className="flex items-center gap-1">
                      {scenarios.length > 0 && (
                        <Select onValueChange={(v) => moveEvent(event.id, null, v)}>
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue placeholder="Move to" />
                          </SelectTrigger>
                          <SelectContent>
                            {scenarios.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEvent(event.id, null)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
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
                  onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
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
                onClick={() => deleteScenario(scenario.id)}
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
                      <div className="flex items-center gap-1">
                        <Select onValueChange={(v) => moveEvent(event.id, scenario.id, v === "base" ? null : v)}>
                          <SelectTrigger className="h-6 w-24 text-xs">
                            <SelectValue placeholder="Move to" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="base">Base Timeline</SelectItem>
                            {scenarios.filter((s) => s.id !== scenario.id).map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeEvent(event.id, scenario.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
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
