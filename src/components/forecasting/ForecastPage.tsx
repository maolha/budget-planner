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
import { Plus, Trash2, TrendingUp, GitBranch } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { runForecast, compareForcasts } from "@/engine/forecast/forecast-engine"
import { LIFE_EVENT_TYPES } from "@/lib/constants"
import { formatCHF } from "@/lib/formatters"
import type { LifeEvent, LifeEventType } from "@/types"
import { v4 as uuid } from "uuid"

interface ScenarioConfig {
  id: string
  name: string
  events: LifeEvent[]
}

export function ForecastPage() {
  const [monthlyIncome, setMonthlyIncome] = useState(12000)
  const [monthlyExpenses, setMonthlyExpenses] = useState(8000)
  const [initialNetWorth, setInitialNetWorth] = useState(100000)
  const [investmentReturn, setInvestmentReturn] = useState(4)
  const [forecastYears, setForecastYears] = useState(10)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingScenario, setEditingScenario] = useState<string | null>(null)

  // Life events for base scenario
  const [baseEvents, setBaseEvents] = useState<LifeEvent[]>([])

  // Alternative scenarios
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
    () =>
      runForecast({
        startDate,
        endDate,
        initialNetWorth,
        monthlyIncome,
        monthlyExpenses,
        lifeEvents: baseEvents,
        investmentReturnRate: investmentReturn / 100,
      }),
    [startDate, endDate, initialNetWorth, monthlyIncome, monthlyExpenses, baseEvents, investmentReturn]
  )

  const scenarioForecasts = useMemo(
    () =>
      scenarios.map((s) => ({
        ...s,
        forecast: runForecast({
          startDate,
          endDate,
          initialNetWorth,
          monthlyIncome,
          monthlyExpenses,
          lifeEvents: [...baseEvents, ...s.events],
          investmentReturnRate: investmentReturn / 100,
        }),
      })),
    [scenarios, startDate, endDate, initialNetWorth, monthlyIncome, monthlyExpenses, baseEvents, investmentReturn]
  )

  // Chart data: net worth over time with all scenarios
  const chartData = baseForecast.months
    .filter((_, i) => i % 3 === 0) // Quarterly for readability
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

  // Income vs Expenses chart
  const incExpData = baseForecast.months
    .filter((_, i) => i % 6 === 0) // Semi-annual
    .map((m) => ({
      date: m.date,
      income: m.income,
      expenses: m.expenses,
      savings: m.savings,
    }))

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecasting</h1>
          <p className="text-muted-foreground">
            Model life events and compare financial scenarios side by side.
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                    <Select
                      value={eventType}
                      onValueChange={(v) => setEventType(v as LifeEventType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIFE_EVENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="month"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
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

                {/* Dynamic params based on event type */}
                {eventType === "salary_change" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Old Annual Salary</Label>
                      <Input
                        type="number"
                        value={eventParams.oldAnnualSalary ?? ""}
                        onChange={(e) =>
                          setEventParams({ ...eventParams, oldAnnualSalary: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New Annual Salary</Label>
                      <Input
                        type="number"
                        value={eventParams.newAnnualSalary ?? ""}
                        onChange={(e) =>
                          setEventParams({ ...eventParams, newAnnualSalary: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
                {eventType === "apartment_change" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Old Monthly Rent</Label>
                      <Input
                        type="number"
                        value={eventParams.oldRent ?? ""}
                        onChange={(e) =>
                          setEventParams({ ...eventParams, oldRent: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New Monthly Rent</Label>
                      <Input
                        type="number"
                        value={eventParams.newRent ?? ""}
                        onChange={(e) =>
                          setEventParams({ ...eventParams, newRent: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
                {eventType === "new_child" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Monthly Childcare Cost</Label>
                      <Input
                        type="number"
                        value={eventParams.monthlyChildcareCost ?? "2400"}
                        onChange={(e) =>
                          setEventParams({ ...eventParams, monthlyChildcareCost: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Monthly Child Costs</Label>
                      <Input
                        type="number"
                        value={eventParams.monthlyOtherChildCost ?? "500"}
                        onChange={(e) =>
                          setEventParams({ ...eventParams, monthlyOtherChildCost: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
                {eventType === "large_purchase" && (
                  <div className="space-y-2">
                    <Label>Purchase Amount (CHF)</Label>
                    <Input
                      type="number"
                      value={eventParams.amount ?? ""}
                      onChange={(e) =>
                        setEventParams({ ...eventParams, amount: e.target.value })
                      }
                    />
                  </div>
                )}
                {eventType === "custom" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Monthly Income Change</Label>
                      <Input
                        type="number"
                        value={eventParams.monthlyIncomeChange ?? ""}
                        onChange={(e) =>
                          setEventParams({ ...eventParams, monthlyIncomeChange: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Expense Change</Label>
                      <Input
                        type="number"
                        value={eventParams.monthlyExpenseChange ?? ""}
                        onChange={(e) =>
                          setEventParams({ ...eventParams, monthlyExpenseChange: e.target.value })
                        }
                      />
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

      {/* Forecast parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-5">
            <div className="space-y-2">
              <Label>Monthly Income (CHF)</Label>
              <Input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Expenses (CHF)</Label>
              <Input
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Initial Net Worth (CHF)</Label>
              <Input
                type="number"
                value={initialNetWorth}
                onChange={(e) => setInitialNetWorth(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Investment Return (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={investmentReturn}
                onChange={(e) => setInvestmentReturn(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Forecast Years</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={forecastYears}
                onChange={(e) => setForecastYears(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Final Net Worth (Base)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(baseForecast.finalNetWorth)}</div>
            <p className="text-xs text-muted-foreground">in {forecastYears} years</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income (Base)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(baseForecast.totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses (Base)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(baseForecast.totalExpenses)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Net worth forecast chart */}
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
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCHF(Number(v))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Base"
                  stroke={COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                />
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

      {/* Income vs Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses (Base)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incExpData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCHF(Number(v))} />
                <Legend />
                <Area type="monotone" dataKey="income" name="Income" fill="#22c55e30" stroke="#22c55e" />
                <Area type="monotone" dataKey="expenses" name="Expenses" fill="#ef444430" stroke="#ef4444" />
              </AreaChart>
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
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{event.date}</Badge>
                      <span className="font-medium">{event.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {LIFE_EVENT_TYPES.find((t) => t.value === event.type)?.label}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeEvent(event.id, null)}
                    >
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
                onClick={() =>
                  setScenarios((prev) => prev.filter((s) => s.id !== scenario.id))
                }
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              {scenario.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No events in this scenario. Add events specific to this &quot;what if&quot;
                  path.
                </p>
              ) : (
                <div className="space-y-2">
                  {scenario.events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{event.date}</Badge>
                        <span className="text-sm">{event.label}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeEvent(event.id, scenario.id)}
                      >
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
